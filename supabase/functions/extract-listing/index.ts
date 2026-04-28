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
// Multi-UA fallback: try desktop Safari first; on 4xx/5xx retry with a
// mobile Safari UA (anti-bot rules sometimes treat mobile traffic
// differently and let us through).
//
// Founder ask: this should "always work or fall back gracefully". We
// can't realistically guarantee 100% — Bayut etc. employ Cloudflare —
// but with 3 parsers + 2 UAs we expect ~80-90% success.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

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
  photoUrl?: string;
  /** 0–100 — proportion of fields we managed to fill. */
  confidence: number;
  /** Which parser stage the data came from — useful for debugging. */
  source?: 'next_data' | 'json_ld' | 'og_title' | 'mixed';
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
    const photo = p.coverPhoto?.url ?? p.photos?.[0]?.url ?? p.cover_photo_url;
    if (typeof photo === 'string') out.photoUrl = photo;
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
    const photo = p.images?.[0]?.full ?? p.images?.[0]?.medium ?? p.cover_photo;
    if (typeof photo === 'string') out.photoUrl = photo;
    if (Object.keys(out).length > 1) return out;
  }
  return null;
}

function extractFromNextDataDubizzle(nd: any): Partial<ExtractResult> | null {
  // Dubizzle typical path: props.pageProps.listingData
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
    const photo = p.images?.[0] ?? p.photos?.[0]?.url;
    if (typeof photo === 'string') out.photoUrl = photo;
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
  if (typeof o.image === 'string') out.photoUrl = o.image;
  else if (Array.isArray(o.image) && typeof o.image[0] === 'string') out.photoUrl = o.image[0];
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

// ── Fetch with multi-UA fallback ──────────────────────────────────────────
async function fetchHtml(url: string): Promise<{ html: string; status: number } | { error: string }> {
  const attempts: { ua: string; label: string }[] = [
    { ua: UA_DESKTOP, label: 'desktop' },
    { ua: UA_MOBILE,  label: 'mobile' },
  ];
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
      if (!r.ok) {
        // Try the next UA on 403/429 — those are the typical anti-bot rejects.
        if (r.status === 403 || r.status === 429 || r.status === 503) continue;
        return { error: `Listing site returned ${r.status}`, };
      }
      const html = await r.text();
      return { html, status: r.status };
    } catch (e) {
      const msg = e instanceof Error ? (e.name === 'AbortError' ? 'Timed out' : e.message) : 'fetch failed';
      // Try next UA if any timeout / network error
      if (a === attempts[attempts.length - 1]) return { error: msg };
    } finally {
      clearTimeout(tm);
    }
  }
  return { error: 'All fetch attempts failed' };
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

    // Fetch with multi-UA fallback.
    const fetched = await fetchHtml(url);
    if ('error' in fetched) {
      return new Response(JSON.stringify({ error: fetched.error }), {
        // 200 so the client can show a friendly message rather than a hard error.
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = fetched.html;
    const result: ExtractResult = { platform, confidence: 0 };

    // ── Strategy 1: __NEXT_DATA__ (richest) ────────────────────────────
    const nd = readJsonScript(html, { id: '__NEXT_DATA__' });
    let ndOut: Partial<ExtractResult> | null = null;
    if (nd) {
      if (platform === 'bayut')           ndOut = extractFromNextDataBayut(nd);
      else if (platform === 'propertyfinder') ndOut = extractFromNextDataPropertyFinder(nd);
      else if (platform === 'dubizzle')   ndOut = extractFromNextDataDubizzle(nd);
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
