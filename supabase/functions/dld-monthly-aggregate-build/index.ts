/**
 * dld-monthly-aggregate-build — populates public.dld_monthly_aggregates
 * with month-bucketed price/volume averages from the DLD residential
 * transactions feed.
 *
 * Mirrors dld-catalogue-build's wire protocol exactly:
 *   POST /dld-monthly-aggregate-build
 *   headers: Authorization: Bearer <anon or service role JWT>
 *   body: { offset?: number, batches?: number, pageSize?: number }
 *   response: { ok, last_offset, next_offset, rows_processed,
 *               months_upserted, done }
 *
 * Powers the "UAE 24-month price trend" chart on
 * /market-intelligence and the marketing surfaces.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const dldProxyUrl = `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/dld-proxy`;

interface DldRow {
  instance_date?: string;
  actual_worth?: number | null;
  procedure_area?: number | null;
}

async function fetchDldPage(offset: number, pageSize: number, authToken: string): Promise<DldRow[]> {
  // Only Sales rows. Rows without a price are skipped client-side
  // (DLD's filter syntax doesn't support IS NOT NULL).
  const filter = `trans_group_en='Sales'`;
  const params = new URLSearchParams({
    entity: "dld",
    dataset: "dld_transactions-open-api",
    filter,
    limit: String(pageSize),
    offset: String(offset),
    order_by: "instance_date",
    order_dir: "desc",
  });
  const res = await fetch(`${dldProxyUrl}?${params.toString()}`, {
    headers: { Authorization: authToken, Accept: "application/json" },
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(`dld-proxy ${res.status}: ${detail}`);
  }
  const json = await res.json() as { results?: DldRow[] };
  return json.results ?? [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { offset?: number; batches?: number; pageSize?: number } = {};
  try { body = await req.json(); } catch { /* default */ }
  const offsetStart = Number(body.offset ?? 0);
  const batches = Math.max(1, Math.min(20, Number(body.batches ?? 5)));
  const pageSize = Math.max(100, Math.min(1000, Number(body.pageSize ?? 1000)));

  if (!SERVICE_ROLE) {
    return new Response(JSON.stringify({
      error: "SUPABASE_SERVICE_ROLE_KEY not present in env",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let rowsProcessed = 0;
  let monthsUpserted = 0;
  let lastOffset = offsetStart;
  let done = false;

  // Month-bucket accumulator. We track:
  //   - sales_count: every Sales row in the month
  //   - total_aed / total_sqm: raw totals for reference
  //   - psqft_sum / psqft_count: SUM of per-row AED/sqft from rows that
  //     pass the outlier filter, used to compute a sensible monthly
  //     mean. Outlier filter drops land plots (huge sqm), bulk
  //     portfolio deals, and obvious data errors.
  interface Bucket {
    sales_count: number;
    total_aed: number;
    total_sqm: number;
    psqft_sum: number;
    psqft_count: number;
  }
  const agg = new Map<string, Bucket>();

  const PSQFT_MIN = 200;    // AED 200/sqft floor — below this is a land/data error.
  const PSQFT_MAX = 6000;   // AED 6000/sqft ceiling — above this is luxury outliers.
  const SQM_TO_SQFT = 10.7639;

  for (let b = 0; b < batches; b++) {
    const off = offsetStart + b * pageSize;
    let rows: DldRow[];
    try {
      rows = await fetchDldPage(off, pageSize, authHeader);
    } catch (err) {
      return new Response(JSON.stringify({
        ok: false,
        last_offset: lastOffset,
        rows_processed: rowsProcessed,
        months_upserted: monthsUpserted,
        error: (err as Error).message,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    lastOffset = off + rows.length;
    rowsProcessed += rows.length;

    for (const r of rows) {
      const date = (r.instance_date ?? "").slice(0, 7); // YYYY-MM
      if (!/^\d{4}-\d{2}$/.test(date)) continue;
      const price = typeof r.actual_worth === "number" ? r.actual_worth : 0;
      const sqm = typeof r.procedure_area === "number" ? r.procedure_area : 0;
      if (price <= 0) continue;

      const bucket: Bucket = agg.get(date) ?? {
        sales_count: 0, total_aed: 0, total_sqm: 0,
        psqft_sum: 0, psqft_count: 0,
      };
      bucket.sales_count += 1;
      bucket.total_aed += price;
      bucket.total_sqm += sqm;

      // Per-row psqft, only included in the average when it's plausible.
      if (sqm > 0) {
        const psqft = price / (sqm * SQM_TO_SQFT);
        if (psqft >= PSQFT_MIN && psqft <= PSQFT_MAX) {
          bucket.psqft_sum += psqft;
          bucket.psqft_count += 1;
        }
      }
      agg.set(date, bucket);
    }

    if (rows.length < pageSize) { done = true; break; }
  }

  if (agg.size > 0) {
    const payload = Array.from(agg.entries()).map(([month, v]) => ({
      month,
      sales_count: v.sales_count,
      total_aed: v.total_aed,
      total_sqm: v.total_sqm,
      psqft_sum: v.psqft_sum,
      psqft_count: v.psqft_count,
    }));
    const { error } = await sb.rpc("_upsert_dld_monthly", { batch: payload });
    if (error) {
      return new Response(JSON.stringify({
        ok: false,
        last_offset: lastOffset,
        rows_processed: rowsProcessed,
        months_upserted: monthsUpserted,
        error: error.message,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    monthsUpserted += payload.length;
  }

  return new Response(JSON.stringify({
    ok: true,
    last_offset: lastOffset,
    next_offset: done ? null : lastOffset,
    rows_processed: rowsProcessed,
    months_upserted: monthsUpserted,
    done,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
