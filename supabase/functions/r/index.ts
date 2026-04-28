// r — public short-link redirector.
//
// We use this to wrap long Supabase Storage URLs (the public-bucket URLs
// for generated PDFs) into a clean `realsight.app/r/{id}` format that
// looks reasonable inside a WhatsApp message or email signature. Without
// this, a recipient sees a 200-character URL with `*.supabase.co` in it
// — not the tone we want for an adviser's client-facing share.
//
// Auth: public, no JWT required. The `id` is a non-guessable random
// token (≥ 12 chars from a URL-safe alphabet) that we generate when the
// link is created. With 12 chars × 36-symbol alphabet you get ~4.7e18
// possible IDs — collision odds are vanishingly small for our volume.
//
// Vercel rewrite (`vercel.json`) maps `/r/:id` to this function so the
// final URL the recipient sees is `https://realsight.app/r/{id}`.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function notFound(): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Link not found</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0f2e;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}.box{max-width:480px}h1{font-size:22px;margin:0 0 8px;color:#FFB020}p{color:rgba(255,255,255,0.7);line-height:1.6;font-size:14px}</style>
</head><body><div class="box">
<h1>Link expired or not found</h1>
<p>This share link is no longer valid. Please ask the person who sent it to generate a new report.</p>
<p style="margin-top:24px"><a href="https://realsight.app" style="color:#18d6a4;text-decoration:none">Visit RealSight →</a></p>
</div></body></html>`,
    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // Accept either ?id=xxx (query) or the last path segment so we can be
  // called from both the Vercel rewrite (which forwards as path) and a
  // direct hit on the function URL.
  const idFromPath  = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const idFromQuery = url.searchParams.get('id') ?? '';
  const id = (idFromQuery || idFromPath).trim();

  if (!id || id === 'r' || !/^[A-Za-z0-9_-]{6,40}$/.test(id)) {
    return notFound();
  }

  try {
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data, error } = await svc
      .from('share_links')
      .select('target_url, expires_at')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return notFound();
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return notFound();
    }

    // Best-effort hit counter — never blocks the redirect.
    svc.rpc('increment_share_link_count' as any, { p_id: id }).catch(() => {});

    return new Response(null, {
      status: 302,
      headers: {
        Location: data.target_url,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return notFound();
  }
});
