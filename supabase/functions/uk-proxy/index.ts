/**
 * uk-proxy — UK property data fabric for RealSight.
 *
 * Wraps HM Land Registry's UK House Price Index (UKHPI) endpoint as the
 * spine of UK market intelligence. UKHPI is free, OGL v3.0 licensed,
 * commercially redistributable, and updated monthly by the Land Registry.
 * It covers 13 official regions + major cities with:
 *   - average price (overall + by property type)
 *   - house price index (HPI 100 = Jan 2015 baseline)
 *   - sales volume
 *   - month-on-month and year-on-year change
 *
 * Why UKHPI instead of Price Paid Data (PPI)?
 * -------------------------------------------
 * PPI gives transaction-level depth (every sale since 1995, 31M+ rows) but
 * the public SPARQL endpoint is rate-limited (HTTP 429 within seconds) and
 * not suitable for user-facing real-time traffic. The right architecture
 * for PPI is bulk ingest → our own Postgres → serve from there
 * (Phase 2B of the global-launch plan). For Phase 2A we ship UKHPI as
 * the spine — directly analogous to the FHFA HPI we'll use for the US.
 *
 * Optional enrichment endpoints
 * -----------------------------
 *   - Companies House (developer reputation lookups): requires
 *     COMPANIES_HOUSE_API_KEY. Without it, returns 503 fallback.
 *   - EPC register (energy ratings by postcode): requires
 *     EPC_AUTH (base64 email:apikey). Without it, returns 503 fallback.
 *
 * The proxy stays behind a `UK_ENABLED` flag. When the flag is false we
 * return the fallback shape so consumers can keep working off cached /
 * demo data.
 *
 * Wire contract (matches dld-proxy + reelly-proxy convention):
 *   GET ?entity=<name>&dataset=<name>&...params
 *
 * Allowed entity/dataset combinations:
 *   landregistry / ukhpi-region              one month for one region
 *   landregistry / ukhpi-region-history      last N months for one region
 *   landregistry / ukhpi-regions-snapshot    most recent month across all regions
 *   companies-house / search                 developer search by name
 *   companies-house / profile                single company profile by ID
 *   epc / domestic                           EPC ratings by postcode
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LR_BASE = "https://landregistry.data.gov.uk/data/ukhpi/region";
const CH_BASE = "https://api.company-information.service.gov.uk";
const EPC_BASE = "https://epc.opendatacommunities.org/api/v1";

// ── Allowed regions (slugs Land Registry uses) ────────────────────────
// Source: https://landregistry.data.gov.uk/data/ukhpi/region
// Covers the 13 official UK regions + the 4 nations + a few major cities.
const ALLOWED_REGIONS = new Set<string>([
  "united-kingdom",
  "england",
  "scotland",
  "wales",
  "northern-ireland",
  "london",
  "north-east",
  "north-west",
  "yorkshire-and-the-humber",
  "east-midlands",
  "west-midlands",
  "east",
  "south-east",
  "south-west",
  "manchester",
  "birmingham",
  "edinburgh",
  "bristol",
]);

// ── Module-scope cache (survives across warm invocations) ─────────────
type CacheEntry = { value: unknown; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — UKHPI updates monthly

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

// ── Helpers ───────────────────────────────────────────────────────────
function fallbackResponse(reason: string, status = 503) {
  return new Response(
    JSON.stringify({
      fallback: true,
      source: "cache",
      message: "UK live data not yet active — serving cached estimates.",
      reason,
      // Diagnostic field — exposes what the upstream fetch actually
      // returned (status / parse error / etc.). Removed in v1.1 once
      // we trust the fetch path.
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

/** YYYY-MM string of N months before now. */
function monthOffset(monthsBack: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - monthsBack);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Land Registry publishes ~2-3 months behind. Walk back from current month
 * until we find a published row. Returns the YYYY-MM string and the data.
 */
async function fetchLatestUkhpi(region: string): Promise<{ month: string; data: Ukhpi } | null> {
  for (let back = 0; back < 6; back++) {
    const month = monthOffset(back);
    const data = await fetchUkhpiMonth(region, month);
    if (data) return { month, data };
  }
  return null;
}

interface Ukhpi {
  averagePrice: number | null;
  housePriceIndex: number | null;
  salesVolume: number | null;
  averagePriceDetached: number | null;
  averagePriceSemiDetached: number | null;
  averagePriceTerraced: number | null;
  averagePriceFlatMaisonette: number | null;
  percentageChangeMonth: number | null;
  percentageChangeYear: number | null;
  refMonth: string;
  refRegion: string;
}

/** Module-level diagnostic — populated on each failed fetch so the
 * proxy can surface what actually went wrong without us needing access
 * to the Supabase edge function logs. Wiped on every successful fetch. */
let lastFetchDiagnostic: {
  url: string;
  status?: number;
  reason: string;
  bodyPreview?: string;
} | null = null;

async function fetchUkhpiMonth(region: string, month: string): Promise<Ukhpi | null> {
  const cacheKey = `ukhpi:${region}:${month}`;
  const cached = cacheGet<Ukhpi>(cacheKey);
  if (cached) return cached;

  const url = `${LR_BASE}/${encodeURIComponent(region)}/month/${encodeURIComponent(month)}.json`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        // Some .gov.uk endpoints reject requests without a UA.
        "User-Agent": "RealSight-uk-proxy/1.0 (+realsight.app)",
      },
    });
  } catch (e) {
    lastFetchDiagnostic = { url, reason: `fetch_threw:${(e as Error).message}` };
    return null;
  }
  if (!res.ok) {
    lastFetchDiagnostic = { url, status: res.status, reason: "non_2xx" };
    return null;
  }
  let json: { result?: { primaryTopic?: unknown } };
  const rawText = await res.text();
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    lastFetchDiagnostic = { url, status: res.status, reason: `json_parse:${(e as Error).message}`, bodyPreview: rawText.slice(0, 200) };
    return null;
  }
  const pt = json.result?.primaryTopic;
  // When the month isn't published yet the API returns a literal
  // "elda:missingEndpoint" string instead of an object — skip those.
  if (!pt || typeof pt !== "object") {
    lastFetchDiagnostic = { url, status: res.status, reason: `bad_primary_topic:${typeof pt}:${String(pt).slice(0, 80)}` };
    return null;
  }
  const o = pt as Record<string, unknown>;

  const out: Ukhpi = {
    averagePrice: numOrNull(o.averagePrice),
    housePriceIndex: numOrNull(o.housePriceIndex),
    salesVolume: numOrNull(o.salesVolume),
    averagePriceDetached: numOrNull(o.averagePriceDetached),
    averagePriceSemiDetached: numOrNull(o.averagePriceSemiDetached),
    averagePriceTerraced: numOrNull(o.averagePriceTerraced),
    averagePriceFlatMaisonette: numOrNull(o.averagePriceFlatMaisonette),
    percentageChangeMonth: numOrNull(o.percentageChange),
    percentageChangeYear: numOrNull(o.percentageAnnualChange),
    refMonth: month,
    refRegion: region,
  };
  cacheSet(cacheKey, out);
  return out;
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  return null;
}

// ── Handler ───────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Read env at request time so flipping flags doesn't require redeploy.
  const enabled = Deno.env.get("UK_ENABLED") === "true";
  if (!enabled) {
    return fallbackResponse("uk_disabled");
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

    // ─── landregistry / ukhpi-region ───────────────────────────────────
    if (entity === "landregistry" && dataset === "ukhpi-region") {
      const region = (url.searchParams.get("region") || "london").toLowerCase();
      if (!ALLOWED_REGIONS.has(region)) {
        return jsonResponse(
          { error: `Unknown region "${region}". Allowed: ${[...ALLOWED_REGIONS].join(", ")}` },
          400,
        );
      }
      const requestedMonth = url.searchParams.get("month");
      const result = requestedMonth
        ? { month: requestedMonth, data: await fetchUkhpiMonth(region, requestedMonth) }
        : await fetchLatestUkhpi(region);

      if (!result || !result.data) {
        return fallbackResponse("ukhpi_no_data");
      }
      return jsonResponse({ source: "landregistry-ukhpi", ...result.data });
    }

    // ─── landregistry / ukhpi-region-history ───────────────────────────
    if (entity === "landregistry" && dataset === "ukhpi-region-history") {
      const region = (url.searchParams.get("region") || "london").toLowerCase();
      if (!ALLOWED_REGIONS.has(region)) {
        return jsonResponse({ error: `Unknown region "${region}".` }, 400);
      }
      const months = Math.min(60, Math.max(1, parseInt(url.searchParams.get("months") ?? "12", 10)));
      // Walk back from the most recent published month — the first that
      // returns null indicates the cutoff.
      const series: Ukhpi[] = [];
      let startBack = 0;
      // Find the start (most recent published)
      for (; startBack < 6; startBack++) {
        const data = await fetchUkhpiMonth(region, monthOffset(startBack));
        if (data) {
          series.push(data);
          break;
        }
      }
      if (series.length === 0) return fallbackResponse("ukhpi_no_data");
      for (let i = 1; i < months; i++) {
        const data = await fetchUkhpiMonth(region, monthOffset(startBack + i));
        if (data) series.push(data);
      }
      return jsonResponse({ source: "landregistry-ukhpi-history", region, series });
    }

    // ─── landregistry / ukhpi-regions-snapshot ─────────────────────────
    if (entity === "landregistry" && dataset === "ukhpi-regions-snapshot") {
      const regions = (url.searchParams.get("regions") || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => ALLOWED_REGIONS.has(s));
      const targets = regions.length > 0 ? regions : [
        "united-kingdom",
        "london",
        "south-east",
        "north-west",
        "scotland",
        "wales",
        "northern-ireland",
        "manchester",
        "birmingham",
        "edinburgh",
      ];
      // For each region find the most recent published month. We fetch
      // sequentially with caching — for a cold cache this is ~10 calls
      // but each is small and the upstream is fast for the latest month.
      const results = await Promise.all(
        targets.map(async (region) => {
          const r = await fetchLatestUkhpi(region);
          return r ? { region, ...r.data } : { region, missing: true };
        }),
      );
      return jsonResponse({ source: "landregistry-ukhpi-snapshot", regions: results });
    }

    // ─── companies-house / search ──────────────────────────────────────
    if (entity === "companies-house" && dataset === "search") {
      const apiKey = Deno.env.get("COMPANIES_HOUSE_API_KEY");
      if (!apiKey) return fallbackResponse("companies_house_key_missing");
      const q = url.searchParams.get("q");
      if (!q) return jsonResponse({ error: "Missing q parameter" }, 400);
      const target = `${CH_BASE}/search/companies?q=${encodeURIComponent(q)}&items_per_page=10`;
      // Companies House uses Basic auth with API key as username, empty password.
      const auth = btoa(`${apiKey}:`);
      const r = await fetch(target, { headers: { Authorization: `Basic ${auth}` } });
      if (!r.ok) return fallbackResponse(`ch_status_${r.status}`);
      return new Response(await r.text(), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── companies-house / profile ─────────────────────────────────────
    if (entity === "companies-house" && dataset === "profile") {
      const apiKey = Deno.env.get("COMPANIES_HOUSE_API_KEY");
      if (!apiKey) return fallbackResponse("companies_house_key_missing");
      const id = url.searchParams.get("id");
      if (!id) return jsonResponse({ error: "Missing id parameter" }, 400);
      const target = `${CH_BASE}/company/${encodeURIComponent(id)}`;
      const auth = btoa(`${apiKey}:`);
      const r = await fetch(target, { headers: { Authorization: `Basic ${auth}` } });
      if (!r.ok) return fallbackResponse(`ch_status_${r.status}`);
      return new Response(await r.text(), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── epc / domestic ────────────────────────────────────────────────
    if (entity === "epc" && dataset === "domestic") {
      const auth = Deno.env.get("EPC_AUTH"); // base64(email:apikey)
      if (!auth) return fallbackResponse("epc_key_missing");
      const postcode = url.searchParams.get("postcode");
      if (!postcode) return jsonResponse({ error: "Missing postcode parameter" }, 400);
      const target = `${EPC_BASE}/domestic/search?postcode=${encodeURIComponent(postcode)}&size=20`;
      const r = await fetch(target, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) return fallbackResponse(`epc_status_${r.status}`);
      return new Response(await r.text(), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return jsonResponse(
      {
        error: `Unknown entity/dataset combination: ${entity}/${dataset}.`,
        allowed: [
          "landregistry/ukhpi-region",
          "landregistry/ukhpi-region-history",
          "landregistry/ukhpi-regions-snapshot",
          "companies-house/search",
          "companies-house/profile",
          "epc/domestic",
        ],
      },
      400,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal proxy error";
    console.error("[uk-proxy] error:", message);
    return jsonResponse({ error: message, fallback: true }, 500);
  }
});
