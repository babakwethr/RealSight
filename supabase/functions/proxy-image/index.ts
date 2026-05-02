// proxy-image — public CORS-friendly image proxy.
//
// Why: gallery photos extracted from Bayut / Property Finder /
// Dubizzle are served from CDNs that DO NOT allow cross-origin
// fetches from realsight.app. The PDF generator's `imageToDataUrl`
// helper therefore returns null for every gallery photo, leaving
// the PDF Image components rendering grey placeholders (founder QA
// 29 Apr 2026: "the photos are not showing; it's just a gray
// placeholder").
//
// Fix: route the photo URLs through this function. The browser
// fetches `…/functions/v1/proxy-image?url=<encoded>` (which IS
// allowed in our CSP via *.supabase.co), this function fetches the
// actual image server-side (no CORS at all between Supabase and
// Bayut etc.), and returns the bytes with `Access-Control-Allow-
// Origin: *` headers. The browser is happy, imageToDataUrl works.
//
// Auth: public, no JWT required. The URL parameter is the entire
// API surface — we strictly allowlist the source hosts so this
// can't be abused as a generic proxy.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Hosts we know serve listing photography for the 3 supported platforms.
// Sub-hosts caught with `endsWith` so e.g. `images.bayut.com`,
// `imgcache.dubizzle.com`, `cf.bstatic.com/propertyfinder/...` all match
// their parent. This is intentionally permissive on the CDN side but
// strict on the platform side — random URLs are rejected.
const ALLOWED_SUFFIXES = [
  'bayut.com',
  'bayutimages.com',
  'propertyfinder.ae',
  'propertyfinder.com',
  'dubizzle.com',
  'olx-cdn.com',
  'olxuae.com',                 // Dubizzle is owned by OLX UAE; some CDN paths surface via this domain
  'imgcache.dubizzle.com',
  'akamaized.net',              // PF + dubizzle both use Akamai
  'cloudfront.net',             // generic CDN used by all 3
  'amazonaws.com',              // Dubizzle prod listing photos sit on S3 (e.g. dubizzle-prod-listing-photos.s3.amazonaws.com)
];

function hostMatches(host: string): boolean {
  const h = host.toLowerCase();
  return ALLOWED_SUFFIXES.some(suffix => h === suffix || h.endsWith('.' + suffix));
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url).searchParams.get('url');
  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let target: URL;
  try { target = new URL(url); }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!hostMatches(target.hostname)) {
    return new Response(JSON.stringify({ error: 'Host not allowed' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch the upstream image. 10s timeout — these are usually <1MB.
  const controller = new AbortController();
  const tm = setTimeout(() => controller.abort(), 10_000);
  try {
    const r = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        'Accept':     'image/webp,image/avif,image/png,image/jpeg,*/*;q=0.8',
        'Referer':    `https://${target.hostname}/`,
      },
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `Upstream returned ${r.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = r.headers.get('Content-Type') ?? 'image/jpeg';
    const bytes       = await r.arrayBuffer();

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type':  contentType,
        // Browsers will cache the proxied image, dropping repeated
        // pulls on the same listing. 1h is plenty for a single share.
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: e instanceof Error && e.name === 'AbortError' ? 'Upstream timed out' : 'Proxy fetch failed',
    }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(tm);
  }
});
