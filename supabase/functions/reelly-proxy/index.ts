/**
 * reelly-proxy — proxies the Reelly off-plan inventory API.
 *
 * Pre-launch state (27 Apr 2026): `REELLY_API_KEY` is not yet configured in
 * Supabase Edge Function secrets. The Playwright QA caught a console error
 * on every page that uses this proxy — not because the UX was broken (the
 * frontend already falls back to demo data), but because we were emitting
 * HTTP 500 + console.error instead of a clean "live feed not active" signal.
 *
 * Mirrors the `dld-proxy` pattern: when the upstream isn't reachable for any
 * reason that's the operator's fault (missing key, expired key, 401/403 from
 * upstream), we return HTTP 503 with `{ fallback: true, source: 'demo' }` —
 * a quiet, intentional signal that callers should swap to demo data. The
 * frontend caller logs this at info level and shows the demo badge.
 *
 * On real upstream errors (network, 5xx, malformed response), we still
 * surface the underlying status so it's visible in observability.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REELLY_API_BASE = "https://api-reelly.up.railway.app/api/v2";

function fallbackResponse(reason: string) {
  // 503 = "service unavailable, retry later" — semantically correct AND lets
  // the frontend's existing `if (!res.ok)` branch trigger demo mode without
  // any code change there.
  return new Response(
    JSON.stringify({
      fallback: true,
      source: "demo",
      message:
        "Live inventory not yet active — showing sample units. Reach out to enable.",
      reason,
    }),
    {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path");

    if (!rawPath) {
      return new Response(
        JSON.stringify({ error: "Missing path parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sanitise path (remove leading/trailing slashes; collapse duplicated api/v2)
    let sanitizedPath = rawPath.replace(/^\/+/, "").replace(/\/+$/, "");
    if (sanitizedPath.startsWith("api/v2/")) {
      sanitizedPath = sanitizedPath.substring(7);
    }

    const reellyApiKey = Deno.env.get("REELLY_API_KEY");

    // Operator-side gap: no key configured yet. Return the graceful fallback
    // signal — NOT a 500 — so the caller can swap to demo mode without log
    // spam. Use console.info (not error) so observability stays clean.
    if (!reellyApiKey) {
      console.info("[reelly-proxy] REELLY_API_KEY unset — returning fallback");
      return fallbackResponse("missing_api_key");
    }

    const targetUrl = new URL(`${REELLY_API_BASE}/${sanitizedPath}`);
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    if (limit) targetUrl.searchParams.set("limit", limit);
    if (offset) targetUrl.searchParams.set("offset", offset);

    const reellyResponse = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${reellyApiKey}`,
      },
    });

    // Auth-failures from upstream → graceful fallback. Same UX as missing key:
    // the user sees demo data, we don't pollute their console with 401/403s.
    if (reellyResponse.status === 401 || reellyResponse.status === 403) {
      console.info(
        `[reelly-proxy] upstream ${reellyResponse.status} — key likely expired, returning fallback`,
      );
      return fallbackResponse(
        `upstream_${reellyResponse.status}`,
      );
    }

    const data = await reellyResponse.text();

    // Pass everything else through — including 5xx, so real upstream
    // problems are visible in observability and to clients.
    return new Response(data, {
      status: reellyResponse.status,
      headers: {
        ...corsHeaders,
        "Content-Type": reellyResponse.headers.get("Content-Type") ||
          "application/json",
      },
    });
  } catch (error: any) {
    console.error("[reelly-proxy] unexpected error:", error?.message);
    return new Response(
      JSON.stringify({
        fallback: true,
        source: "demo",
        error: error?.message ?? "Internal proxy error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
