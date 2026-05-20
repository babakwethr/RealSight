/**
 * dld-catalogue-build — populates public.dld_building_catalogue from
 * the DLD residential transactions feed.
 *
 * The autocomplete on the home search needs sub-100 ms response time.
 * DLD's relay is ~4 s/call which is unusable for live search, so we
 * pre-aggregate the data into our own Postgres table with a trigram
 * index. This function does the ingestion.
 *
 * Wire protocol:
 *   POST /dld-catalogue-build
 *   headers: Authorization: Bearer <anon or service role JWT>
 *   body: { offset?: number, batches?: number, pageSize?: number }
 *   response: { ok, last_offset, next_offset, rows_processed,
 *               rows_upserted, done }
 *
 * Pagination: the caller feeds `next_offset` back as `offset` until
 * `done` is true. Each invocation processes `batches × pageSize` rows
 * (defaults: 5 × 1000 = 5000), within the 150 s edge ceiling.
 *
 * Auth: the caller's Authorization header is forwarded to dld-proxy.
 * Because this function is `verify_jwt=true`, the token is by
 * definition valid (anon key is fine).
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
  transaction_id?: string;
  instance_date?: string;
  building_name_en?: string | null;
  project_name_en?: string | null;
  area_name_en?: string | null;
}

async function fetchDldPage(offset: number, pageSize: number, authToken: string): Promise<DldRow[]> {
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
  let rowsUpserted = 0;
  let lastOffset = offsetStart;
  let done = false;

  const agg = new Map<string, {
    building_name_en: string;
    project_name_en: string | null;
    area_name_en: string | null;
    transaction_count: number;
    last_seen_date: string | null;
  }>();

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
        rows_upserted: rowsUpserted,
        error: (err as Error).message,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    lastOffset = off + rows.length;
    rowsProcessed += rows.length;

    for (const r of rows) {
      const building = (r.building_name_en ?? "").trim();
      if (!building) continue;
      const area = (r.area_name_en ?? "").trim() || null;
      const project = (r.project_name_en ?? "").trim() || null;
      const key = `${building.toLowerCase()}|${(area ?? "").toLowerCase()}`;
      const existing = agg.get(key);
      if (existing) {
        existing.transaction_count += 1;
        if (r.instance_date && (!existing.last_seen_date || r.instance_date > existing.last_seen_date)) {
          existing.last_seen_date = r.instance_date;
        }
      } else {
        agg.set(key, {
          building_name_en: building,
          project_name_en: project,
          area_name_en: area,
          transaction_count: 1,
          last_seen_date: r.instance_date ?? null,
        });
      }
    }

    if (rows.length < pageSize) { done = true; break; }
  }

  if (agg.size > 0) {
    const payload = Array.from(agg.values());
    const CHUNK = 500;
    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.slice(i, i + CHUNK);
      const { error } = await sb.rpc("_upsert_dld_buildings", { batch: slice });
      if (error) {
        return new Response(JSON.stringify({
          ok: false,
          last_offset: lastOffset,
          rows_processed: rowsProcessed,
          rows_upserted: rowsUpserted,
          error: error.message,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      rowsUpserted += slice.length;
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    last_offset: lastOffset,
    next_offset: done ? null : lastOffset,
    rows_processed: rowsProcessed,
    rows_upserted: rowsUpserted,
    done,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
