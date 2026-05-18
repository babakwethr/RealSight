/**
 * us-proxy — US property data fabric for RealSight.
 *
 * Phase 3 of the global-launch plan. Wraps a mix of free US public-data
 * sources so the US market dashboard can launch without a paid API.
 *
 * Wire contract (matches dld-proxy + uk-proxy + reelly-proxy):
 *   GET ?entity=<name>&dataset=<name>&...params
 *
 * Allowed entity/dataset combinations:
 *   nyc / sales                    NYC OpenData sales (no key needed)
 *   chicago / sales                Cook County sales (no key needed)
 *   fred / observations            FRED time-series macro data
 *   hud / fmr                      HUD Fair Market Rent by metro
 *   census / acs                   Census ACS demographics by state/tract
 *
 * Optional env vars (each unlocks one or more endpoints):
 *   FRED_API_KEY        — free at fred.stlouisfed.org/docs/api/api_key.html
 *   HUD_API_KEY         — free at huduser.gov/portal/dataset/fmr-api.html
 *   CENSUS_API_KEY      — free at api.census.gov/data/key_signup.html
 *
 * Always-on env var:
 *   US_ENABLED          — must be "true" or the proxy returns 503 fallback
 *
 * NYC and Chicago datasets work without any key — those are SODA-backed
 * public APIs with generous unauthenticated rate limits (~1000 req/h).
 * For higher volume you can register a free app token at
 *   data.cityofnewyork.us / datacatalog.cookcountyil.gov
 * and pass it via the SOCRATA_APP_TOKEN env var (currently optional).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// NYC Annual Sales (every sale citywide — borough, neighborhood, address,
// price, date, lat/lng, sqft). Updated regularly.
const NYC_SALES_URL = "https://data.cityofnewyork.us/resource/w2pb-icbu.json";

// Cook County (Chicago metro) — every property sale with parcel ID, sale
// date, sale price, deed type.
const CHICAGO_SALES_URL = "https://datacatalog.cookcountyil.gov/resource/wvhk-k5uv.json";

// FRED — Federal Reserve Economic Data. Free API key required.
const FRED_BASE = "https://api.stlouisfed.org/fred";

// HUD User — Fair Market Rent. Free Bearer-token API key.
const HUD_BASE = "https://www.huduser.gov/hudapi/public";

// Census Bureau — American Community Survey 5-year estimates.
const CENSUS_BASE = "https://api.census.gov/data";

// ─── Allowed borough codes (NYC) ──────────────────────────────────────
// NYC's API uses numeric borough codes:
//   1=Manhattan, 2=Bronx, 3=Brooklyn, 4=Queens, 5=Staten Island
const NYC_BOROUGHS: Record<string, string> = {
  manhattan: "1",
  bronx: "2",
  brooklyn: "3",
  queens: "4",
  "staten-island": "5",
};

// ─── Module-scope cache (survives across warm invocations) ─────────────
type CacheEntry = { value: unknown; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — keep US data fresh

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Diagnostic (mirrors uk-proxy convention) ──────────────────────────
let lastFetchDiagnostic: {
  url: string;
  status?: number;
  reason: string;
  bodyPreview?: string;
} | null = null;

// ─── Helpers ───────────────────────────────────────────────────────────
function fallbackResponse(reason: string, status = 503) {
  return new Response(
    JSON.stringify({
      fallback: true,
      source: "cache",
      message: "US live data not yet active — serving cached estimates.",
      reason,
      diagnostic: lastFetchDiagnostic,
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Forward a request to a SODA-backed open-data endpoint. Always sends a
 * User-Agent (some govt endpoints reject UA-less requests — see uk-proxy
 * post-mortem) and optionally a Socrata app token to bump rate limits.
 */
async function fetchSoda(url: string): Promise<Response> {
  const appToken = Deno.env.get("SOCRATA_APP_TOKEN");
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "RealSight-us-proxy/1.0 (+realsight.app)",
  };
  if (appToken) headers["X-App-Token"] = appToken;
  return await fetch(url, { headers });
}

// ─── Handler ───────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const enabled = Deno.env.get("US_ENABLED") === "true";
  if (!enabled) {
    return fallbackResponse("us_disabled");
  }

  try {
    const url = new URL(req.url);
    const entity = (url.searchParams.get("entity") ?? "").toLowerCase().trim();
    const dataset = (url.searchParams.get("dataset") ?? "").toLowerCase().trim();

    if (!entity || !dataset) {
      return jsonResponse(
        { error: "Missing required params: ?entity=<name>&dataset=<name>" },
        400,
      );
    }

    // ─── nyc / sales ───────────────────────────────────────────────────
    if (entity === "nyc" && dataset === "sales") {
      const borough = (url.searchParams.get("borough") || "manhattan").toLowerCase();
      const boroughCode = NYC_BOROUGHS[borough];
      if (!boroughCode) {
        return jsonResponse(
          { error: `Unknown NYC borough "${borough}". Allowed: ${Object.keys(NYC_BOROUGHS).join(", ")}` },
          400,
        );
      }
      const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
      const minPrice = url.searchParams.get("min_price");

      const cacheKey = `nyc:${borough}:${limit}:${minPrice ?? "*"}`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) return jsonResponse(cached);

      const params = new URLSearchParams({
        borough: boroughCode,
        $limit: String(limit),
        $order: "sale_date DESC",
      });
      if (minPrice) {
        params.set("$where", `sale_price > '${parseInt(minPrice, 10)}'`);
      } else {
        // Default — skip the noisy $0 sales that fill the dataset
        params.set("$where", "sale_price > '0'");
      }
      const target = `${NYC_SALES_URL}?${params.toString()}`;
      const res = await fetchSoda(target);
      if (!res.ok) {
        lastFetchDiagnostic = { url: target, status: res.status, reason: "non_2xx" };
        return fallbackResponse(`nyc_status_${res.status}`);
      }
      const sales = await res.json();
      const out = {
        source: "nyc-opendata-sales",
        borough,
        count: Array.isArray(sales) ? sales.length : 0,
        sales,
      };
      cacheSet(cacheKey, out);
      return jsonResponse(out);
    }

    // ─── chicago / sales ───────────────────────────────────────────────
    if (entity === "chicago" && dataset === "sales") {
      const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
      const minPrice = url.searchParams.get("min_price");
      const cacheKey = `chicago:${limit}:${minPrice ?? "*"}`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) return jsonResponse(cached);

      const params = new URLSearchParams({
        $limit: String(limit),
        $order: "sale_date DESC",
      });
      if (minPrice) {
        params.set("$where", `sale_price > '${parseInt(minPrice, 10)}'`);
      } else {
        params.set("$where", "sale_price > '0'");
      }
      const target = `${CHICAGO_SALES_URL}?${params.toString()}`;
      const res = await fetchSoda(target);
      if (!res.ok) {
        lastFetchDiagnostic = { url: target, status: res.status, reason: "non_2xx" };
        return fallbackResponse(`chicago_status_${res.status}`);
      }
      const sales = await res.json();
      const out = {
        source: "chicago-cookcounty-sales",
        count: Array.isArray(sales) ? sales.length : 0,
        sales,
      };
      cacheSet(cacheKey, out);
      return jsonResponse(out);
    }

    // ─── fred / metros-snapshot ────────────────────────────────────────
    // Case-Shiller 20-city HPI in one call. Returns each metro with the
    // latest published value and 12-month YoY change. Cached 6h since
    // Case-Shiller is monthly.
    if (entity === "fred" && dataset === "metros-snapshot") {
      const fredKey = Deno.env.get("FRED_API_KEY");
      if (!fredKey) return fallbackResponse("fred_key_missing");

      const cacheKey = `fred:metros-snapshot:v1`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) return jsonResponse(cached);

      // Case-Shiller series IDs (monthly, seasonally-adjusted home price
      // indices) — 20 city composite + the 20 individual cities.
      const METROS: Array<{ slug: string; name: string; series: string }> = [
        { slug: "us-composite", name: "US 20-City Composite", series: "SPCS20RSA" },
        { slug: "new-york",      name: "New York",      series: "NYXRSA" },
        { slug: "los-angeles",   name: "Los Angeles",   series: "LXXRSA" },
        { slug: "chicago",       name: "Chicago",       series: "CHXRSA" },
        { slug: "miami",         name: "Miami",         series: "MIXRSA" },
        { slug: "san-francisco", name: "San Francisco", series: "SFXRSA" },
        { slug: "boston",        name: "Boston",        series: "BOXRSA" },
        { slug: "washington-dc", name: "Washington DC", series: "WDXRSA" },
        { slug: "seattle",       name: "Seattle",       series: "SEXRSA" },
        { slug: "denver",        name: "Denver",        series: "DNXRSA" },
        { slug: "phoenix",       name: "Phoenix",       series: "PHXRSA" },
        { slug: "dallas",        name: "Dallas",        series: "DAXRSA" },
        { slug: "san-diego",     name: "San Diego",     series: "SDXRSA" },
        { slug: "portland",      name: "Portland",      series: "POXRSA" },
        { slug: "charlotte",     name: "Charlotte",     series: "CRXRSA" },
        { slug: "detroit",       name: "Detroit",       series: "DEXRSA" },
        { slug: "las-vegas",     name: "Las Vegas",     series: "LVXRSA" },
        { slug: "minneapolis",   name: "Minneapolis",   series: "MNXRSA" },
        { slug: "cleveland",     name: "Cleveland",     series: "CEXRSA" },
        { slug: "tampa",         name: "Tampa",         series: "TPXRSA" },
        { slug: "atlanta",       name: "Atlanta",       series: "ATXRSA" },
      ];

      // Fetch 13 observations per series (latest + 12 months prior) in
      // parallel. Each call is small; 20 in parallel completes in ~500ms cold.
      const results = await Promise.all(METROS.map(async (m) => {
        const params = new URLSearchParams({
          series_id: m.series,
          api_key: fredKey,
          file_type: "json",
          limit: "13",
          sort_order: "desc",
        });
        const target = `${FRED_BASE}/series/observations?${params.toString()}`;
        try {
          const res = await fetch(target, {
            headers: { "User-Agent": "RealSight-us-proxy/1.0 (+realsight.app)" },
          });
          if (!res.ok) return { ...m, missing: true };
          const data = await res.json() as { observations?: Array<{ date: string; value: string }> };
          const obs = data.observations ?? [];
          if (obs.length === 0) return { ...m, missing: true };
          const latest = parseFloat(obs[0].value);
          const yearAgo = obs.length >= 13 ? parseFloat(obs[12].value) : null;
          const yoy = (yearAgo != null && yearAgo !== 0 && isFinite(latest) && isFinite(yearAgo))
            ? ((latest - yearAgo) / yearAgo) * 100
            : null;
          return {
            ...m,
            latestValue: isFinite(latest) ? latest : null,
            latestDate: obs[0].date,
            yoyPct: yoy,
          };
        } catch {
          return { ...m, missing: true };
        }
      }));

      const out = { source: "fred-case-shiller-snapshot", metros: results };
      cacheSet(cacheKey, out);
      return jsonResponse(out);
    }

    // ─── fred / observations ───────────────────────────────────────────
    // FRED time-series macro data. Useful series:
    //   MORTGAGE30US  — 30-year fixed mortgage average rate (weekly)
    //   CSUSHPINSA    — Case-Shiller US National HPI (monthly)
    //   ATNHPIUS00000Q — All-Transactions HPI USA (quarterly, FHFA mirror)
    //   HOUST         — Housing starts (monthly)
    //   MSPUS         — Median sales price of houses sold (quarterly)
    //   RRVRUSQ156N   — Rental vacancy rate (quarterly)
    if (entity === "fred" && dataset === "observations") {
      const fredKey = Deno.env.get("FRED_API_KEY");
      if (!fredKey) return fallbackResponse("fred_key_missing");
      const seriesId = url.searchParams.get("series_id");
      if (!seriesId) return jsonResponse({ error: "Missing series_id parameter" }, 400);
      const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get("limit") ?? "12", 10)));
      const sort = url.searchParams.get("sort_order") || "desc";

      const cacheKey = `fred:${seriesId}:${limit}:${sort}`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) return jsonResponse(cached);

      const params = new URLSearchParams({
        series_id: seriesId,
        api_key: fredKey,
        file_type: "json",
        limit: String(limit),
        sort_order: sort,
      });
      const target = `${FRED_BASE}/series/observations?${params.toString()}`;
      const res = await fetch(target, {
        headers: { "User-Agent": "RealSight-us-proxy/1.0 (+realsight.app)" },
      });
      if (!res.ok) return fallbackResponse(`fred_status_${res.status}`);
      const data = await res.json();
      cacheSet(cacheKey, { source: "fred", ...data });
      return jsonResponse({ source: "fred", ...data });
    }

    // ─── hud / fmr ─────────────────────────────────────────────────────
    // HUD Fair Market Rent — median rent benchmarks per metro / state.
    if (entity === "hud" && dataset === "fmr") {
      const hudKey = Deno.env.get("HUD_API_KEY");
      if (!hudKey) return fallbackResponse("hud_key_missing");
      const stateOrMetro = url.searchParams.get("location");
      if (!stateOrMetro) return jsonResponse({ error: "Missing location parameter (state code or metro code)" }, 400);

      const cacheKey = `hud:fmr:${stateOrMetro}`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) return jsonResponse(cached);

      // HUD endpoint: /fmr/data/{entity_id}
      const target = `${HUD_BASE}/fmr/data/${encodeURIComponent(stateOrMetro)}`;
      const res = await fetch(target, {
        headers: {
          Authorization: `Bearer ${hudKey}`,
          "User-Agent": "RealSight-us-proxy/1.0 (+realsight.app)",
        },
      });
      if (!res.ok) return fallbackResponse(`hud_status_${res.status}`);
      const data = await res.json();
      const out = { source: "hud-fmr", ...data };
      cacheSet(cacheKey, out);
      return jsonResponse(out);
    }

    // ─── census / acs ──────────────────────────────────────────────────
    if (entity === "census" && dataset === "acs") {
      const censusKey = Deno.env.get("CENSUS_API_KEY");
      if (!censusKey) return fallbackResponse("census_key_missing");
      const stateCode = url.searchParams.get("state");
      if (!stateCode) return jsonResponse({ error: "Missing state parameter (2-digit FIPS)" }, 400);

      const cacheKey = `census:acs:${stateCode}`;
      const cached = cacheGet<unknown>(cacheKey);
      if (cached) return jsonResponse(cached);

      // ACS 5-year — population (B01001_001E) + median household income (B19013_001E).
      const target =
        `${CENSUS_BASE}/2022/acs/acs5?get=NAME,B01001_001E,B19013_001E&for=state:${encodeURIComponent(stateCode)}&key=${encodeURIComponent(censusKey)}`;
      const res = await fetch(target, {
        headers: { "User-Agent": "RealSight-us-proxy/1.0 (+realsight.app)" },
      });
      if (!res.ok) return fallbackResponse(`census_status_${res.status}`);
      const data = await res.json();
      const out = { source: "census-acs5", state: stateCode, data };
      cacheSet(cacheKey, out);
      return jsonResponse(out);
    }

    return jsonResponse(
      {
        error: `Unknown entity/dataset: ${entity}/${dataset}`,
        allowed: [
          "nyc/sales",
          "chicago/sales",
          "fred/observations",
          "hud/fmr",
          "census/acs",
        ],
      },
      400,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal proxy error";
    console.error("[us-proxy] error:", message);
    return jsonResponse({ error: message, fallback: true }, 500);
  }
});
