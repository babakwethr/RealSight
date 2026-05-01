/**
 * dld-proxy — Dubai Digital Authority (DDA) data fabric proxy.
 *
 * Per LAUNCH_PLAN.md §14. Credentials and granted-API confirmation
 * received from DDADS support 1 May 2026 (application
 * `PUBLIC-USR-UID-4511215`, STG environment). Gateway docs in
 * /DDA API Docs/ — HowToUseAPI.pdf is the canonical reference.
 *
 * Two-step OAuth flow:
 *
 *   STEP 1  POST {BASE}/secure/ssis/dubaiai/gatewaytoken/1.0.0/getAccessToken
 *           Headers:  Content-Type: application/json
 *                     x-DDA-SecurityApplicationIdentifier
 *           Body:     { grant_type: "client_credentials",
 *                       client_id, client_secret }                 (JSON)
 *           Returns:  { access_token, token_type: "Bearer",
 *                       expires_in (3600s), scope }
 *
 *   STEP 2  GET  {BASE}/open/<entity>/<dataset>
 *           Headers:  Authorization: Bearer <access_token>
 *           Query:    column, filter, page, pageSize, limit,
 *                     order_by, order_dir, offset                  (all optional)
 *           Returns:  { results: [...] }                           (1000 rows/page max)
 *
 *   Confirmed via the live "Endpoints" panel on data.dubai for the
 *   Real Estate Transactions dataset (1 May 2026):
 *     https://apis.data.dubai/open/dld/dld_transactions-open-api
 *   The doc text mentioned `/secure/ddads/openapi/1.0.0/...` but the
 *   sample request and the live portal both show `/open/...` — the
 *   doc text was misleading; the portal is canonical.
 *
 * Tokens last 60 minutes. We cache in module-scope so warm function instances
 * skip re-auth, and refresh ~1 minute before expiry to avoid edge-of-window
 * 401s. Rate limit per docs: 60 req/min, 30s timeout per request.
 *
 * GEO-RESTRICTION (the real blocker)
 * ----------------------------------
 * Per HowToUseAPI.pdf §6.3 — DDA's gateway is only reachable from UAE
 * source IPs. Our Supabase Edge Functions run in Tokyo
 * (`ap-northeast-1`), Vercel runs in US — both outside UAE, so this
 * proxy will continue to receive HTTP 403 ("Unauthorized application
 * request") until calls originate from a UAE-resident server. Options
 * under consideration: AWS Lambda in me-central-1, Azure Functions in
 * UAE North, or a small UAE-based VPS relay. When the chosen relay is
 * deployed, an env var `DDA_UAE_RELAY_URL` will route requests through
 * it; absent that, this proxy attempts direct calls.
 *
 * The proxy stays behind a `DDA_ENABLED` flag. When DDA_ENABLED is
 * "true" and credentials are present, we make real calls. Otherwise
 * callers receive `{ fallback: true, source: 'cache' }` (HTTP 503) —
 * same shape as before, so existing consumers keep working.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Allowed entity/dataset combinations ──────────────────────────────────
// Tightening down what the public proxy will fetch. Keeps a stray
// /admin path or PII-bearing dataset from being relayed by accident.
// Update once DDADS confirms the granted dataset list (per the email we
// sent 27 Apr 2026).
const ALLOWED_ENTITIES = new Set<string>([
  "dld",     // Dubai Land Dept — transactions, rents, projects, brokers
  "det",     // Dept of Economy & Tourism (commercial license context)
  "rta",     // Roads & Transport (parking / commute proxies for area scoring)
  "dsc",     // Dubai Statistics Centre (demographics / GDP indicators)
]);

// ── Token cache (module-scope; survives across warm invocations) ─────────
let cachedToken: { value: string; expiresAt: number } | null = null;

const TOKEN_REFRESH_MARGIN_MS = 60_000; // refresh ~1 min before real expiry

async function fetchAccessToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  appIdentifier: string,
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > now) {
    return cachedToken.value;
  }

  // Per HowToUseAPI.pdf §3.1 — official path is
  //   /secure/ssis/dubaiai/gatewaytoken/1.0.0/getAccessToken
  // (the previous `/sdg/ssis/gatewayoauthtoken/...` path was a guess
  // from the v1 generic spec; not what the iPaaS actually exposes).
  const url = `${baseUrl.replace(/\/+$/, "")}/secure/ssis/dubaiai/gatewaytoken/1.0.0/getAccessToken`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-DDA-SecurityApplicationIdentifier": appIdentifier,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`DDA token request failed (${res.status}): ${detail}`);
  }

  const data = await res.json() as {
    access_token: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error("DDA token response missing access_token");
  }

  // Default to 50 min if expires_in is absent — DDA docs say 3600s.
  const ttlMs = (data.expires_in ?? 3600) * 1000;
  cachedToken = {
    value: data.access_token,
    expiresAt: now + ttlMs,
  };
  return data.access_token;
}

// ── Main handler ─────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Read all DDA env at request time so flipping the enable flag in the
  // dashboard doesn't require a redeploy.
  const enabled = Deno.env.get("DDA_ENABLED") === "true";
  const clientId = Deno.env.get("DDA_CLIENT_ID");
  const clientSecret = Deno.env.get("DDA_CLIENT_SECRET");
  const appIdentifier = Deno.env.get("DDA_APP_IDENTIFIER");
  const baseUrl = Deno.env.get("DDA_BASE_URL") ||
    "https://stg-apis.data.dubai";

  // Pre-launch / disabled / missing creds → graceful fallback. NEVER 500
  // — that scares users. The shape is intentionally identical to the
  // previous shell so existing callers keep working unchanged.
  if (!enabled || !clientId || !clientSecret || !appIdentifier) {
    return new Response(
      JSON.stringify({
        fallback: true,
        source: "cache",
        message:
          "Live DDA feed not yet active — serving cached transaction data.",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const url = new URL(req.url);
    const entity = (url.searchParams.get("entity") ?? "").toLowerCase().trim();
    const dataset = (url.searchParams.get("dataset") ?? "").trim();

    if (!entity || !dataset) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required query params: ?entity=<name>&dataset=<name>",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!ALLOWED_ENTITIES.has(entity)) {
      return new Response(
        JSON.stringify({
          error: `Entity "${entity}" not in allow-list. Permitted: ${
            [...ALLOWED_ENTITIES].join(", ")
          }`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Defence in depth — block anything that smells like a path escape.
    if (
      dataset.includes("..") || dataset.includes("/") || dataset.includes("\\")
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid dataset name." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get a token (cached if still fresh).
    let token: string;
    try {
      token = await fetchAccessToken(
        baseUrl,
        clientId,
        clientSecret,
        appIdentifier,
      );
    } catch (authErr: any) {
      console.error("[dld-proxy] auth failed:", authErr?.message);
      // Fall back gracefully so the UI keeps working off cached data.
      return new Response(
        JSON.stringify({
          fallback: true,
          source: "cache",
          message:
            "Live DDA feed unavailable — serving cached data while we reconnect.",
          detail: authErr?.message,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build the upstream URL. Path is `/open/<entity>/<dataset>` —
    // confirmed via the live "Endpoints" panel on data.dubai
    // (see DLD Real Estate Transactions: dld/dld_transactions-open-api).
    const targetUrl = new URL(
      `${baseUrl.replace(/\/+$/, "")}/open/${entity}/${dataset}`,
    );

    // Forward the supported DDA query params (per OpenAPI doc §"Supported
    // Query Parameters"). Whitelisted to avoid SSRF / surprise behaviour.
    const FORWARDABLE = [
      "column",
      "filter",
      "page",
      "pageSize",
      "limit",
      "order_by",
      "order_dir",
      "offset",
    ];
    for (const k of FORWARDABLE) {
      const v = url.searchParams.get(k);
      if (v !== null) targetUrl.searchParams.set(k, v);
    }

    // 30s timeout per the DDA docs.
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30_000);

    const upstream = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "x-DDA-SecurityApplicationIdentifier": appIdentifier,
        "Accept": "application/json",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    const body = await upstream.text();

    // If DDA returns 401 it usually means our cached token rotted between
    // checks — wipe the cache so the next call re-auths. Don't try to
    // hot-retry here; let the caller decide.
    if (upstream.status === 401) {
      cachedToken = null;
    }

    return new Response(body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") ||
          "application/json",
      },
    });
  } catch (err: any) {
    console.error("[dld-proxy] error:", err);
    return new Response(
      JSON.stringify({
        error: err?.message ?? "Internal proxy error",
        fallback: true,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
