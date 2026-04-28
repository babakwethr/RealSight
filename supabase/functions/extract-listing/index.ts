// extract-listing — best-effort scrape of a Bayut / Property Finder /
// Dubizzle listing URL. Reads OpenGraph meta tags + JSON-LD blobs and
// returns a normalised set of property fields the Deal Analyzer form
// can prefill.
//
// Scope (founder approved 28 Apr 2026): "best-effort" not "magic".
//   - Only the 3 platforms above (allowlist host check).
//   - 8s timeout, single fetch attempt, no proxy.
//   - All output fields optional — caller fills the gaps manually.
//
// Anti-bot: we send a normal browser User-Agent. ~30% of URLs may be
// blocked by Cloudflare etc; the client surfaces a "couldn't read
// this link" toast and the manual form still works.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ExtractResult {
  platform?: 'bayut' | 'propertyfinder' | 'dubizzle';
  propertyName?: string;
  area?: string;
  propertyType?: string;
  bedrooms?: number;        // 0 = studio
  size?: number;            // sqft
  price?: number;           // AED
  photoUrl?: string;
  /** 0–100 — how confident we are the scrape worked. */
  confidence: number;
}

// ── Allowlist + platform detection ────────────────────────────────────────
const HOST_PLATFORM: Record<string, ExtractResult['platform']> = {
  'bayut.com':            'bayut',
  'www.bayut.com':        'bayut',
  'propertyfinder.ae':    'propertyfinder',
  'www.propertyfinder.ae': 'propertyfinder',
  'dubai.dubizzle.com':   'dubizzle',
  'dubizzle.com':         'dubizzle',
  'www.dubizzle.com':     'dubizzle',
};

// ── Lightweight HTML helpers ──────────────────────────────────────────────
function meta(html: string, prop: string): string | undefined {
  // Match either property="og:foo" or name="foo"
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

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function jsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const cleaned = m[1].trim();
      if (!cleaned) continue;
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      // Skip malformed blobs.
    }
  }
  return out;
}

function findOffer(ld: unknown[]): Record<string, any> | undefined {
  for (const node of ld) {
    if (!node || typeof node !== 'object') continue;
    const n = node as Record<string, any>;
    const t = n['@type'];
    if (t === 'RealEstateListing' || t === 'Product' || t === 'Offer' || t === 'Apartment' || t === 'House') return n;
    // Some listings nest under @graph
    if (Array.isArray(n['@graph'])) {
      const inner = findOffer(n['@graph']);
      if (inner) return inner;
    }
  }
  return undefined;
}

// ── Per-platform title parsers (best-effort regex) ────────────────────────
// Bayut titles look like: "2 BR Apartment in Murjan 6 - JVC for sale | Bayut"
// PF: "2 Bedroom Apartment in Murjan 6, JVC, Dubai for AED 2,100,000 | propertyfinder.ae"
// Dubizzle: "Luma 22 - 2 Bed Apartment for Sale - JVC, Dubai"
function parseTitle(title: string, platform: ExtractResult['platform']): Partial<ExtractResult> {
  const out: Partial<ExtractResult> = {};
  const t = title;

  // Bedrooms (handle BR / Bed / Bedroom)
  const bedM = t.match(/\b(studio)\b/i) || t.match(/(\d+)\s*(?:BR|Bed(?:room)?s?)\b/i);
  if (bedM) out.bedrooms = bedM[1].toLowerCase() === 'studio' ? 0 : Number(bedM[1]);

  // Property type
  const typeM = t.match(/\b(Apartment|Villa|Townhouse|Penthouse|Studio|Plot|Land|Office)\b/i);
  if (typeM) out.propertyType = typeM[1].toLowerCase();

  // Area (text between "in " and the next " for"/"|"/comma)
  const areaM = t.match(/\bin\s+([^|]+?)\s+for\b/i)
             || t.match(/\bin\s+([^,|]+?)(?:\s*-\s*|,)/i);
  if (areaM) {
    let area = areaM[1].trim();
    // Strip building names ("Murjan 6, JVC" → "JVC")
    if (area.includes(',')) area = area.split(',').pop()!.trim();
    if (area.length < 60) out.area = area;
  }

  // Price (AED 2,100,000)
  const priceM = t.match(/AED\s*([\d,]+)/i);
  if (priceM) {
    const p = Number(priceM[1].replace(/,/g, ''));
    if (Number.isFinite(p) && p > 0) out.price = p;
  }

  // Suppress unused variable
  void platform;
  return out;
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
      return new Response(JSON.stringify({ error: 'Unsupported platform — only Bayut, Property Finder and Dubizzle are supported' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the page with browser headers + 8s timeout.
    const controller = new AbortController();
    const tm = setTimeout(() => controller.abort(), 8000);
    let html: string;
    try {
      const r = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
          'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language':  'en-US,en;q=0.9',
        },
      });
      if (!r.ok) {
        return new Response(JSON.stringify({
          error: `Listing site returned ${r.status} — try again or fill the form manually`,
          status: r.status,
        }), {
          status: 200, // not a server error per se; client just won't get fields
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      html = await r.text();
    } catch (e) {
      return new Response(JSON.stringify({
        error: e instanceof Error && e.name === 'AbortError' ? 'Timed out fetching the listing' : 'Failed to fetch listing',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } finally {
      clearTimeout(tm);
    }

    const result: ExtractResult = { platform, confidence: 0 };

    // 1. OpenGraph
    const ogTitle  = meta(html, 'og:title')       ?? meta(html, 'title');
    const ogDesc   = meta(html, 'og:description') ?? meta(html, 'description');
    const ogImage  = meta(html, 'og:image');
    if (ogImage) result.photoUrl = ogImage;
    if (ogTitle) {
      result.propertyName = ogTitle.split(/[|·•]/)[0].trim();
      Object.assign(result, parseTitle(ogTitle, platform));
    }
    if (ogDesc && !result.area) {
      const desc = parseTitle(ogDesc, platform);
      Object.assign(result, desc);
    }

    // 2. JSON-LD overrides (more reliable when present)
    const offer = findOffer(jsonLd(html));
    if (offer) {
      const o = offer;
      const offerInner = (o.offers ?? o) as Record<string, any>;
      const priceLd = Number(offerInner.price ?? offerInner.lowPrice ?? offerInner.highPrice);
      if (Number.isFinite(priceLd) && priceLd > 0) result.price = priceLd;
      const sizeLd = Number(o.floorSize?.value ?? o.size ?? offerInner.size);
      if (Number.isFinite(sizeLd) && sizeLd > 0) result.size = sizeLd;
      const bedsLd = Number(o.numberOfBedrooms ?? o.numberOfRooms);
      if (Number.isFinite(bedsLd)) result.bedrooms = bedsLd;
      if (typeof o.name === 'string') result.propertyName = o.name;
      const addr = o.address;
      if (addr && typeof addr === 'object') {
        const locality = addr.addressLocality || addr.addressRegion;
        if (typeof locality === 'string') result.area = locality;
      }
    }

    // 3. Confidence — tally how many fields we filled.
    const fields = ['propertyName','area','propertyType','bedrooms','size','price'] as const;
    const filled = fields.filter(k => result[k] !== undefined).length;
    result.confidence = Math.round((filled / fields.length) * 100);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
