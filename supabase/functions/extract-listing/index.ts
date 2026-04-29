// extract-listing — server-side scrape of Bayut / Property Finder /
// Dubizzle listing URLs. Returns a normalised property record the
// Deal Analyzer can run an analysis against.
//
// Strategy (most reliable first):
//   1. <script id="__NEXT_DATA__">  — full Next.js page state, gold standard.
//                                     Bayut, PF, Dubizzle all use Next.js.
//   2. <script type="application/ld+json"> — schema.org structured data.
//   3. og:title / og:description regex — last-resort title parsing.
//
// Fetch strategy (28 Apr 2026 update):
//   Bayut, Property Finder and Dubizzle all sit behind Cloudflare and
//   actively block edge-function IPs (Bayut 302s to /captchaChallenge,
//   PF returns HTTP 202 + empty body, Dubizzle returns "Pardon Our
//   Interruption"). Direct curl from this function effectively never
//   reaches the listing.
//
//   So we use a two-step pipeline:
//     1. Try direct fetch with desktop + mobile UAs (works for non-CF
//        sites and as a free fallback if it does sneak through).
//     2. If the response looks blocked (HTTP 202, < 5 KB, captcha/
//        challenge/interruption keywords), retry through ScraperAPI's
//        residential-proxy endpoint with `render=true`.
//   ScraperAPI's free tier gives 5,000 requests/month at no cost; if
//   `SCRAPER_API_KEY` isn't set, step 2 is skipped and the function
//   returns the direct-fetch result (which the client surfaces as
//   "couldn't read this listing — fill the form manually").

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SCRAPER_API_KEY       = Deno.env.get('SCRAPER_API_KEY') ?? '';
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// 24h cache: ScraperAPI render mode takes ~45s on the trial tier, so
// repeat pastes of the same URL are punishingly slow. The cache turns
// hits into ~50ms responses and saves a credit each time. Keyed by
// SHA-256(url) so we do not store the raw URL as a primary key with
// query-string variations.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash  = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function svc() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readFromCache(urlHash: string): Promise<unknown | null> {
  try {
    const { data } = await svc()
      .from('extracted_listings')
      .select('result, expires_at')
      .eq('url_hash', urlHash)
      .maybeSingle();
    if (!data) return null;
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
    // Bump hit_count fire-and-forget — never blocks.
    svc()
      .from('extracted_listings')
      .update({ hit_count: (data as any).hit_count != null ? (data as any).hit_count + 1 : 1 })
      .eq('url_hash', urlHash)
      .then(() => {}, () => {});
    return data.result;
  } catch { return null; }
}

async function writeToCache(urlHash: string, url: string, platform: string, result: unknown) {
  try {
    await svc()
      .from('extracted_listings')
      .upsert({
        url_hash:    urlHash,
        url,
        platform,
        result,
        expires_at:  new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      });
  } catch (e) {
    console.warn('[extract-listing] cache write failed (non-fatal):', e);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Platform = 'bayut' | 'propertyfinder' | 'dubizzle';

interface ExtractResult {
  platform?: Platform;
  propertyName?: string;
  area?: string;
  propertyType?: string;
  bedrooms?: number;        // 0 = studio
  size?: number;            // sqft
  price?: number;           // AED
  rent?: number;            // AED/year
  photoUrl?: string;        // primary cover photo (first of `photos`)
  /** Full set of listing photos for the PDF gallery page (cap ~8). */
  photos?: string[];
  /** Listing agent / broker contact, when the platform exposes it.
   *  Surfaced as a per-property card so the adviser can call/WhatsApp
   *  the listing's broker. NEVER aggregated or bulk-exported — that
   *  crosses into PDPL territory we explicitly avoid. */
  agent?: {
    name?: string;
    mobile?: string;
    whatsapp?: string;
    email?: string;
    photo?: string;
    agencyName?: string;
    agencyLogo?: string;
    brn?: string;          // RERA Broker Registration Number
    bio?: string;          // truncated client-side, but server caps at 240
    sourceUrl?: string;    // original listing URL — useful for "view source"
  };
  /** 0–100 — proportion of fields we managed to fill. */
  confidence: number;
  /** Which parser stage the data came from — useful for debugging. */
  source?: 'next_data' | 'json_ld' | 'og_title' | 'mixed';
}

// Helper: collect up to N photos from a list of candidates with type-coercion.
function collectPhotos(arr: unknown, max = 8): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const item of arr) {
    if (out.length >= max) break;
    let url: string | undefined;
    if (typeof item === 'string') url = item;
    else if (item && typeof item === 'object') {
      const o = item as Record<string, any>;
      url = o.full ?? o.original ?? o.large ?? o.url ?? o.medium ?? o.src ?? o.image_url;
    }
    if (typeof url === 'string' && /^https?:\/\//i.test(url) && !out.includes(url)) {
      out.push(url);
    }
  }
  return out;
}

// ── Allowlist + platform detection ────────────────────────────────────────
const HOST_PLATFORM: Record<string, Platform> = {
  'bayut.com':            'bayut',
  'www.bayut.com':        'bayut',
  'propertyfinder.ae':    'propertyfinder',
  'www.propertyfinder.ae': 'propertyfinder',
  'dubai.dubizzle.com':   'dubizzle',
  'dubizzle.com':         'dubizzle',
  'www.dubizzle.com':     'dubizzle',
  'uae.dubizzle.com':     'dubizzle',
};

const UA_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const UA_MOBILE  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

// ── Lightweight HTML helpers ──────────────────────────────────────────────
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function meta(html: string, prop: string): string | undefined {
  const patterns = [
    new RegExp(`<meta\\s+property=["']${prop}["']\\s+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+property=["']${prop}["']`, 'i'),
    new RegExp(`<meta\\s+name=["']${prop}["']\\s+content=["']([^"']+)["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeHtml(m[1]);
  }
  return undefined;
}

function readJsonScript(html: string, idOrType: { id?: string; type?: string }): unknown | null {
  // Build a regex that targets a single script tag matching the criteria.
  let attrs = '';
  if (idOrType.id)   attrs += `[^>]*\\bid=["']${idOrType.id}["']`;
  if (idOrType.type) attrs += `[^>]*\\btype=["']${idOrType.type}["']`;
  const re = new RegExp(`<script${attrs}[^>]*>([\\s\\S]*?)<\\/script>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()); } catch { return null; }
}

function readAllJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch { /* skip */ }
  }
  return out;
}

// ── Per-platform __NEXT_DATA__ extractors ─────────────────────────────────
// Each platform stores property data slightly differently inside the
// Next.js `props.pageProps` object. These are best-effort — if the
// shape changes, the JSON-LD/OG fallbacks pick up the slack.

function extractFromNextDataBayut(nd: any): Partial<ExtractResult> | null {
  // Bayut typical path: props.pageProps.propertyResult / pageProps.property / pageProps.adData
  const candidates = [
    nd?.props?.pageProps?.propertyResult,
    nd?.props?.pageProps?.property,
    nd?.props?.pageProps?.adData,
    nd?.props?.pageProps?.initialState?.propertyDetail?.data,
  ];
  for (const p of candidates) {
    if (!p || typeof p !== 'object') continue;
    const out: Partial<ExtractResult> = {};
    if (p.title || p.name) out.propertyName = String(p.title || p.name);
    if (p.location?.[0]?.name)              out.area = String(p.location[0].name);
    else if (p.location?.name)               out.area = String(p.location.name);
    else if (p.geography?.lvl1?.name)        out.area = String(p.geography.lvl1.name);
    else if (Array.isArray(p.location_tree)) {
      const last = p.location_tree[p.location_tree.length - 1];
      if (last?.name) out.area = String(last.name);
    }
    if (p.category?.name)   out.propertyType = String(p.category.name).toLowerCase();
    else if (p.type)        out.propertyType = String(p.type).toLowerCase();
    const beds = Number(p.rooms ?? p.bedrooms);
    if (Number.isFinite(beds)) out.bedrooms = beds;
    const size = Number(p.area ?? p.size ?? p.sqft);
    if (Number.isFinite(size) && size > 0) out.size = size;
    const price = Number(p.price ?? p.priceValue);
    if (Number.isFinite(price) && price > 0) out.price = price;
    const photos = collectPhotos(p.photos ?? p.images);
    if (photos.length) {
      out.photos = photos;
      out.photoUrl = photos[0];
    } else {
      const photo = p.coverPhoto?.url ?? p.cover_photo_url;
      if (typeof photo === 'string') out.photoUrl = photo;
    }
    if (Object.keys(out).length > 1) return out;
  }
  return null;
}

function extractFromNextDataPropertyFinder(nd: any): Partial<ExtractResult> | null {
  // PF typical path: props.pageProps.propertyData or pageProps.detail
  const candidates = [
    nd?.props?.pageProps?.propertyData,
    nd?.props?.pageProps?.detail,
    nd?.props?.pageProps?.property,
    nd?.props?.pageProps?.searchPropertyDetailsResponse?.propertyData,
  ];
  for (const p of candidates) {
    if (!p || typeof p !== 'object') continue;
    const out: Partial<ExtractResult> = {};
    if (p.title)                            out.propertyName = String(p.title);
    if (p.location?.full_name || p.location?.name)
      out.area = String(p.location.full_name || p.location.name);
    else if (Array.isArray(p.locations)) {
      const last = p.locations[p.locations.length - 1];
      if (last?.name) out.area = String(last.name);
    }
    if (p.property_type)  out.propertyType = String(p.property_type).toLowerCase();
    else if (p.type)      out.propertyType = String(p.type).toLowerCase();
    const beds = Number(p.bedrooms ?? p.bedroom_value);
    if (Number.isFinite(beds)) out.bedrooms = beds;
    const size = Number(p.size?.value ?? p.size ?? p.area_value);
    if (Number.isFinite(size) && size > 0) out.size = size;
    const price = Number(p.price?.value ?? p.price);
    if (Number.isFinite(price) && price > 0) out.price = price;
    const photos = collectPhotos(p.images ?? p.photos);
    if (photos.length) {
      out.photos = photos;
      out.photoUrl = photos[0];
    } else if (typeof p.cover_photo === 'string') {
      out.photoUrl = p.cover_photo;
    }
    if (Object.keys(out).length > 1) return out;
  }
  return null;
}

function extractFromNextDataDubizzle(nd: any, url?: string): Partial<ExtractResult> | null {
  // Dubizzle's current Next.js setup ships SSR redux actions in
  // `props.pageProps.reduxWrapperActionsGIPP` — an array of dispatched
  // actions including `listings/detailPropertyRequest/fulfilled`,
  // whose payload is the full property record.
  //
  // Verified against:
  //   https://dubai.dubizzle.com/property-for-sale/residential/apartment/2026/4/27/a-world-of-luxury-crafted-for-the-excep-2-464016/
  //
  // Payload fields we use:
  //   price, size, bedrooms, bathrooms — number
  //   name.en / name.ar              — title
  //   categories[0].slug | .name.en  — apartment / villa / townhouse / land
  //   breadcrumbs                    — area name lives in the
  //                                    second-to-last `{name: url}` entry
  //                                    (last entry is the building name)
  //   photos[0].full / .url          — cover photo
  const gipp = nd?.props?.pageProps?.reduxWrapperActionsGIPP;
  if (Array.isArray(gipp)) {
    const fulfilled = gipp.find(
      (a: any) => a?.type === 'listings/detailPropertyRequest/fulfilled' && a?.payload && typeof a.payload === 'object',
    );
    if (fulfilled) {
      const p = fulfilled.payload;
      const out: Partial<ExtractResult> = {};

      const name = p.name?.en || p.name?.ar || (typeof p.name === 'string' ? p.name : undefined);
      if (name) out.propertyName = String(name);

      const price = Number(p.price);
      if (Number.isFinite(price) && price > 0) out.price = price;

      const size = Number(p.size);
      if (Number.isFinite(size) && size > 0) out.size = size;

      const beds = Number(p.bedrooms);
      if (Number.isFinite(beds)) out.bedrooms = beds;

      // Property type — first category is the most specific (Apartment / Villa / etc.)
      if (Array.isArray(p.categories) && p.categories.length > 0) {
        const cat = p.categories[0];
        const slug = cat?.slug;
        const cname = cat?.name?.en;
        if (typeof slug === 'string') out.propertyType = slug.toLowerCase();
        else if (typeof cname === 'string') out.propertyType = cname.toLowerCase();
      }

      // Area — Dubizzle breadcrumbs follow a consistent pattern:
      //   [0] root ("")
      //   [1] listing category ("Apartments for sale in Dubai")
      //   [2] AREA (e.g. "Meydan")          ← what we want
      //   [3+] project / building / specific unit
      //
      // We want the area name (matches our dld_areas table). The
      // building/project crumbs are too granular for the DLD match.
      // Confirmed via index [2] match against the URL pattern
      // `/in/<area-slug>/` — Dubizzle always uses that for area pages.
      if (Array.isArray(p.breadcrumbs) && p.breadcrumbs.length >= 3) {
        const crumb = p.breadcrumbs[2];
        if (crumb && typeof crumb === 'object') {
          const name = Object.keys(crumb)[0];
          if (name && name.length < 60) out.area = name;
        }
      }
      // Fallback: scan all breadcrumbs for a URL containing /in/<slug>/
      if (!out.area && Array.isArray(p.breadcrumbs)) {
        for (const crumb of p.breadcrumbs) {
          if (crumb && typeof crumb === 'object') {
            const [name, url] = Object.entries(crumb)[0] as [string, unknown];
            if (typeof url === 'string' && /\/in\//.test(url) && name && name.length < 60) {
              out.area = name;
              break;
            }
          }
        }
      }

      // Photos — collect the full set for the PDF gallery, then take
      // the first as the cover (existing photoUrl contract).
      const photos = collectPhotos(p.photos);
      if (photos.length) {
        out.photos = photos;
        out.photoUrl = photos[0];
      } else if (typeof p.primary_photo === 'string') {
        out.photoUrl = p.primary_photo;
      }

      // Agent / broker contact — Dubizzle exposes this on every
      // listing page (the broker who posted it, not the property's
      // owner). Names, mobile, agency, RERA BRN, photo all live in
      // `payload.agent_profile`. Falls back to the top-level
      // `agent_name` string when the rich profile isn't present.
      const ap = p.agent_profile;
      if (ap && typeof ap === 'object') {
        const agentName =
          (typeof ap.name === 'object' && (ap.name.en || ap.name.ar))
            ? String(ap.name.en || ap.name.ar)
            : (typeof p.agent_name === 'string' ? p.agent_name : undefined);
        const brn =
          (typeof ap.brn === 'string' || typeof ap.brn === 'number') ? String(ap.brn)
          : (Array.isArray(ap.license_numbers) && ap.license_numbers[0]?.value)
            ? String(ap.license_numbers[0].value)
            : undefined;
        const bio =
          (typeof ap.bio === 'object' && typeof ap.bio.en === 'string')
            ? ap.bio.en.slice(0, 240)
            : undefined;
        const agent: NonNullable<ExtractResult['agent']> = {};
        if (agentName)                            agent.name        = agentName;
        if (typeof ap.mobile_number === 'string') agent.mobile      = ap.mobile_number;
        if (typeof ap.whatsapp_number === 'string') agent.whatsapp  = ap.whatsapp_number;
        if (typeof ap.email === 'string')         agent.email       = ap.email;
        if (typeof ap.profile_pic === 'string')   agent.photo       = ap.profile_pic;
        if (typeof ap.agency_name === 'string')   agent.agencyName  = ap.agency_name;
        if (typeof ap.agency_logo === 'string')   agent.agencyLogo  = ap.agency_logo;
        if (brn)                                  agent.brn         = brn;
        if (bio)                                  agent.bio         = bio;
        agent.sourceUrl = url;
        if (Object.keys(agent).length > 1) out.agent = agent;
      } else if (typeof p.agent_name === 'string') {
        // Bare-bones fallback when only the name is exposed.
        out.agent = { name: p.agent_name, sourceUrl: url };
      }

      if (Object.keys(out).length > 1) return out;
    }
  }

  // Legacy paths — older Dubizzle pages or different page types may
  // still expose data under pageProps.{listingData,listing,adData,detail}.
  const candidates = [
    nd?.props?.pageProps?.listingData,
    nd?.props?.pageProps?.listing,
    nd?.props?.pageProps?.adData,
    nd?.props?.pageProps?.detail,
  ];
  for (const p of candidates) {
    if (!p || typeof p !== 'object') continue;
    const out: Partial<ExtractResult> = {};
    if (p.title)        out.propertyName = String(p.title);
    if (p.location?.name || p.locality?.name || p.neighbourhood?.name)
      out.area = String(p.location?.name || p.locality?.name || p.neighbourhood?.name);
    if (p.category?.name) out.propertyType = String(p.category.name).toLowerCase();
    const beds = Number(p.bedrooms ?? p.attributes?.beds);
    if (Number.isFinite(beds)) out.bedrooms = beds;
    const size = Number(p.size ?? p.area ?? p.attributes?.size);
    if (Number.isFinite(size) && size > 0) out.size = size;
    const price = Number(p.price ?? p.amount);
    if (Number.isFinite(price) && price > 0) out.price = price;
    const photos = collectPhotos(p.images ?? p.photos);
    if (photos.length) {
      out.photos = photos;
      out.photoUrl = photos[0];
    }
    if (Object.keys(out).length > 1) return out;
  }
  return null;
}

// ── JSON-LD extractor (cross-platform) ────────────────────────────────────
function findOffer(ld: unknown[]): Record<string, any> | undefined {
  for (const node of ld) {
    if (!node || typeof node !== 'object') continue;
    const n = node as Record<string, any>;
    const t = n['@type'];
    if (t === 'RealEstateListing' || t === 'Product' || t === 'Offer' ||
        t === 'Apartment' || t === 'House' || t === 'SingleFamilyResidence' ||
        t === 'Residence' || t === 'Place') return n;
    if (Array.isArray(n['@graph'])) {
      const inner = findOffer(n['@graph']);
      if (inner) return inner;
    }
  }
  return undefined;
}

function extractFromJsonLd(ld: unknown[]): Partial<ExtractResult> | null {
  const offer = findOffer(ld);
  if (!offer) return null;
  const o = offer;
  const inner = (o.offers ?? o) as Record<string, any>;
  const out: Partial<ExtractResult> = {};
  if (typeof o.name === 'string') out.propertyName = o.name;
  const priceLd = Number(inner.price ?? inner.lowPrice ?? inner.highPrice ?? o.price);
  if (Number.isFinite(priceLd) && priceLd > 0) out.price = priceLd;
  const sizeLd = Number(o.floorSize?.value ?? o.size ?? inner.size);
  if (Number.isFinite(sizeLd) && sizeLd > 0) out.size = sizeLd;
  const bedsLd = Number(o.numberOfBedrooms ?? o.numberOfRooms);
  if (Number.isFinite(bedsLd)) out.bedrooms = bedsLd;
  const addr = o.address;
  if (addr && typeof addr === 'object') {
    const locality = addr.addressLocality || addr.addressRegion || addr.streetAddress;
    if (typeof locality === 'string') out.area = locality;
  }
  if (Array.isArray(o.image)) {
    const photos = collectPhotos(o.image);
    if (photos.length) {
      out.photos = photos;
      out.photoUrl = photos[0];
    }
  } else if (typeof o.image === 'string') {
    out.photoUrl = o.image;
    out.photos = [o.image];
  }
  return Object.keys(out).length > 0 ? out : null;
}

// ── OG / title regex (last resort) ────────────────────────────────────────
function extractFromTitleRegex(title: string): Partial<ExtractResult> {
  const out: Partial<ExtractResult> = {};
  const t = title;

  const bedM = t.match(/\b(studio)\b/i) || t.match(/(\d+)\s*(?:BR|Bed(?:room)?s?)\b/i);
  if (bedM) out.bedrooms = bedM[1].toLowerCase() === 'studio' ? 0 : Number(bedM[1]);

  const typeM = t.match(/\b(Apartment|Villa|Townhouse|Penthouse|Studio|Plot|Land|Office|Duplex|Loft)\b/i);
  if (typeM) out.propertyType = typeM[1].toLowerCase();

  const areaM = t.match(/\bin\s+([^|]+?)\s+for\b/i)
             || t.match(/\bin\s+([^,|]+?)(?:\s*-\s*|,)/i);
  if (areaM) {
    let area = areaM[1].trim();
    if (area.includes(',')) area = area.split(',').pop()!.trim();
    if (area.length < 60) out.area = area;
  }

  const priceM = t.match(/AED\s*([\d,]+)/i) || t.match(/([\d,]+)\s*AED/i);
  if (priceM) {
    const p = Number(priceM[1].replace(/,/g, ''));
    if (Number.isFinite(p) && p > 0) out.price = p;
  }

  return out;
}

// ── Anti-bot detection ────────────────────────────────────────────────────
// Each of the 3 sites returns a recognisable "blocked" response when our
// IP gets challenged. We detect the markers cheaply (size + a few
// keywords) and trigger the ScraperAPI fallback on a hit.
function looksBlocked(html: string, status: number, finalUrl?: string): boolean {
  if (status === 202) return true;                       // PF empty-body block
  if (html.length < 5000 && /captcha|challenge|cf-mitigated|cf-error|access denied/i.test(html))
    return true;                                          // tiny page = challenge
  if (/Pardon\s+Our\s+Interruption|Captcha\s*\|\s*Bayut/i.test(html)) return true;
  if (finalUrl && /captchaChallenge|cdn-cgi\/challenge/i.test(finalUrl)) return true;
  // If we got HTML but it has neither __NEXT_DATA__ nor a JSON-LD block,
  // for one of the 3 listing sites that's a strong signal we got the
  // challenge / shell page, not the real listing.
  if (!/__NEXT_DATA__/i.test(html) && !/application\/ld\+json/i.test(html)) return true;
  return false;
}

// ── Fetch via ScraperAPI (residential proxy + Cloudflare bypass) ──────────
// ScraperAPI handles Cloudflare/anti-bot for us. The free trial covers
// Dubizzle reliably. Bayut and Property Finder use Cloudflare's
// strongest protection and require ScraperAPI's premium proxy pool —
// available on the Hobby plan ($49/mo) and above. We do NOT pass
// premium=true here because the trial plan rejects it with HTTP 403
// ("your current plan does not allow you to use our premium proxies").
//
// When the founder upgrades the ScraperAPI plan, just pass
// `premium=true` in the params block and Bayut/PF will start working.
//
// If SCRAPER_API_KEY isn't configured, this is a no-op.
async function fetchViaScraperApi(url: string): Promise<{ html: string; status: number } | { error: string }> {
  if (!SCRAPER_API_KEY) return { error: 'No SCRAPER_API_KEY configured' };
  const controller = new AbortController();
  const tm = setTimeout(() => controller.abort(), 70000); // render mode can take 30-60s
  try {
    const params = new URLSearchParams({
      api_key: SCRAPER_API_KEY,
      url,
      render:  'true', // run JS so __NEXT_DATA__ hydrates
      // No country_code — UAE proxies sometimes 500 on PF; default
      // pool is more reliable for the trial tier.
    });
    const r = await fetch(`https://api.scraperapi.com/?${params}`, {
      signal: controller.signal,
    });
    if (!r.ok) return { error: `ScraperAPI returned ${r.status}` };
    return { html: await r.text(), status: r.status };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'ScraperAPI fetch failed' };
  } finally {
    clearTimeout(tm);
  }
}

// ── Fetch with direct → multi-UA → ScraperAPI fallback ────────────────────
async function fetchHtml(url: string): Promise<{ html: string; status: number; via: 'direct' | 'scraper' } | { error: string }> {
  const attempts: { ua: string; label: string }[] = [
    { ua: UA_DESKTOP, label: 'desktop' },
    { ua: UA_MOBILE,  label: 'mobile' },
  ];

  // Step 1 — try direct fetch with browser-like headers.
  for (const a of attempts) {
    const controller = new AbortController();
    const tm = setTimeout(() => controller.abort(), 15000);
    try {
      const r = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': a.ua,
          'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language':  'en-US,en;q=0.9,ar;q=0.8',
          'Accept-Encoding':  'gzip, deflate, br',
          'Cache-Control':    'no-cache',
          'Pragma':           'no-cache',
          'Sec-Fetch-Dest':   'document',
          'Sec-Fetch-Mode':   'navigate',
          'Sec-Fetch-Site':   'none',
          'Sec-Fetch-User':   '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      });
      if (!r.ok && r.status !== 202) {
        if (r.status === 403 || r.status === 429 || r.status === 503) continue;
        // Non-typical-block error — break and try ScraperAPI.
        break;
      }
      const html = await r.text();
      // If the response looks like a real listing page, we're done.
      if (!looksBlocked(html, r.status, r.url)) {
        return { html, status: r.status, via: 'direct' };
      }
      // Otherwise fall through to next UA / ScraperAPI.
    } catch {
      // try next UA
    } finally {
      clearTimeout(tm);
    }
  }

  // Step 2 — ScraperAPI fallback (handles Cloudflare).
  const sa = await fetchViaScraperApi(url);
  if ('error' in sa) {
    return { error: SCRAPER_API_KEY
      ? `Listing is protected by anti-bot — ScraperAPI fallback failed: ${sa.error}`
      : `Listing is protected by anti-bot. Configure SCRAPER_API_KEY to enable the proxy fallback.`,
    };
  }
  return { ...sa, via: 'scraper' };
}

// ── Main handler ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url } = await req.json() as { url?: string };
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed: URL;
    try { parsed = new URL(url); }
    catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const platform = HOST_PLATFORM[parsed.hostname.toLowerCase()];
    if (!platform) {
      return new Response(JSON.stringify({
        error: 'Unsupported platform — only Bayut, Property Finder and Dubizzle are supported',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cache lookup — repeat pastes of the same URL skip the 45s
    // ScraperAPI render and return immediately. Keyed by SHA-256 of
    // the full URL so query-string variations stay distinct.
    const urlHash = await sha256Hex(url);
    const cached = await readFromCache(urlHash);
    if (cached) {
      const annotated = { ...(cached as Record<string, unknown>), _cache: 'hit' };
      return new Response(JSON.stringify(annotated), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch with direct → ScraperAPI fallback.
    const fetched = await fetchHtml(url);
    if ('error' in fetched) {
      return new Response(JSON.stringify({ error: fetched.error }), {
        // 200 so the client can show a friendly message rather than a hard error.
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = fetched.html;
    const result: ExtractResult = { platform, confidence: 0 };
    // Annotate which path got us the HTML — handy for debugging.
    (result as any)._via = fetched.via;

    // ── Strategy 1: __NEXT_DATA__ (richest) ────────────────────────────
    const nd = readJsonScript(html, { id: '__NEXT_DATA__' });
    let ndOut: Partial<ExtractResult> | null = null;
    if (nd) {
      if (platform === 'bayut')           ndOut = extractFromNextDataBayut(nd);
      else if (platform === 'propertyfinder') ndOut = extractFromNextDataPropertyFinder(nd);
      else if (platform === 'dubizzle')   ndOut = extractFromNextDataDubizzle(nd, url);
    }
    if (ndOut) {
      Object.assign(result, ndOut);
      result.source = 'next_data';
    }

    // ── Strategy 2: JSON-LD (fill gaps) ───────────────────────────────
    const ld = readAllJsonLd(html);
    if (ld.length > 0) {
      const ldOut = extractFromJsonLd(ld);
      if (ldOut) {
        // Fill ONLY missing fields from JSON-LD; don't overwrite richer NEXT_DATA.
        for (const [k, v] of Object.entries(ldOut)) {
          if ((result as any)[k] === undefined) (result as any)[k] = v;
        }
        if (!result.source) result.source = 'json_ld';
        else result.source = 'mixed';
      }
    }

    // ── Strategy 3: OG meta + title regex (last resort) ──────────────
    const ogTitle  = meta(html, 'og:title')       ?? meta(html, 'title');
    const ogDesc   = meta(html, 'og:description') ?? meta(html, 'description');
    const ogImage  = meta(html, 'og:image');
    if (ogImage && !result.photoUrl) result.photoUrl = ogImage;
    if (ogImage && (!result.photos || result.photos.length === 0)) result.photos = [ogImage];
    if (ogTitle) {
      if (!result.propertyName) result.propertyName = ogTitle.split(/[|·•]/)[0].trim();
      const titleOut = extractFromTitleRegex(ogTitle);
      for (const [k, v] of Object.entries(titleOut)) {
        if ((result as any)[k] === undefined) (result as any)[k] = v;
      }
    }
    if (ogDesc) {
      const descOut = extractFromTitleRegex(ogDesc);
      for (const [k, v] of Object.entries(descOut)) {
        if ((result as any)[k] === undefined) (result as any)[k] = v;
      }
    }
    if (!result.source && (result.propertyName || result.area)) result.source = 'og_title';

    // Normalise propertyType to our supported set.
    if (result.propertyType) {
      const t = result.propertyType.toLowerCase();
      if (t.includes('apartment') || t.includes('flat'))      result.propertyType = 'apartment';
      else if (t.includes('villa'))                            result.propertyType = 'villa';
      else if (t.includes('townhouse'))                        result.propertyType = 'townhouse';
      else if (t.includes('penthouse'))                        result.propertyType = 'penthouse';
      else if (t.includes('plot') || t.includes('land'))      result.propertyType = 'land';
    }

    // Confidence — proportion of analysis-critical fields filled.
    const required = ['area', 'price', 'size'] as const;
    const optional = ['propertyName', 'propertyType', 'bedrooms'] as const;
    const reqFilled = required.filter(k => result[k] !== undefined).length;
    const optFilled = optional.filter(k => result[k] !== undefined).length;
    // Required fields weight 70%, optional 30%.
    result.confidence = Math.round(
      (reqFilled / required.length) * 70 + (optFilled / optional.length) * 30
    );

    // Write to cache only when we got something useful (avoid caching
    // failure responses — those would lock in a bad result for 24h).
    if ((result.confidence ?? 0) >= 50) {
      writeToCache(urlHash, url, platform, result).catch(() => {});
    }

    return new Response(JSON.stringify({ ...result, _cache: 'miss' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
