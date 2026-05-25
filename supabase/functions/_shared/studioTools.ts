/**
 * Studio Deck Builder — LLM tool catalogue.
 *
 * Every tool listed here can be invoked by the LLM during outline
 * generation (`studio-deck-plan` edge function). The system prompt
 * forces the constraint: *no number on any slide may exist that
 * isn't the literal return value of one of these tools.*
 *
 * V2 — real data wiring. Phase 1 stubbed most tools; this rewrite
 * connects them to the actual cached tables in RealSight Supabase:
 *
 *   - dld_monthly_aggregates  (Dubai-wide + per-area, ~24 months)
 *   - dld_areas               (~70 areas with psqft, growth, yield,
 *                              demand, supply pipeline)
 *   - dld_building_catalogue  (~4,500 buildings with txn counts)
 *   - dld_transactions        (limited rows; live feed via dld-proxy)
 *
 * Internationals (Reelly, UK, US) remain stubs in this build — the
 * proxy chain through the edge-function gateway adds latency the
 * LLM doesn't tolerate well during a 30 s outline generation. They
 * land in the next chunk; the system prompt steers the LLM to UAE
 * data when those return rows=0.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type Schema = {
  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array';
  description?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: string[];
};

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  profileId: string;
  deckId?: string;
}

export interface ToolResult {
  data: unknown;
  rows: number;
  window?: string;
}

export interface StudioTool {
  name: string;
  description: string;
  parameters: Schema;
  source: string;
  fn: (params: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

// ── DLD: monthly trend ───────────────────────────────────────────

const query_dld_monthly: StudioTool = {
  name: 'query_dld_monthly',
  description:
    'Dubai monthly transaction series — count, total AED value, average AED per square foot — for a date window. Use for any market-trend or time-series chart. Pass area="__all__" (default) for Dubai-wide, or a specific area name for that community.',
  parameters: {
    type: 'object',
    properties: {
      start: { type: 'string', description: 'YYYY-MM (e.g. 2024-09).' },
      end:   { type: 'string', description: 'YYYY-MM inclusive.' },
      area:  { type: 'string', description: 'Optional area name. Default __all__.' },
    },
    required: ['start', 'end'],
  },
  source: 'Dubai Land Department',
  fn: async (params, { supabase }) => {
    // The dld_monthly_aggregates.month column is TEXT stored as
    // 'YYYY-MM' (no day component). String comparison against
    // 'YYYY-MM-01' would EXCLUDE all rows because the shorter
    // string is lexicographically less than the longer one. So
    // we filter against the raw 'YYYY-MM' bounds.
    const start = String(params.start).slice(0, 7);
    const end = String(params.end).slice(0, 7);
    const area = (params.area as string | undefined) || '__all__';
    const { data, error } = await supabase
      .from('dld_monthly_aggregates')
      .select('month, sales_count, total_aed, avg_psqft')
      .eq('area_name', area)
      .gte('month', start)
      .lte('month', end)
      .order('month', { ascending: true });
    if (error) throw new Error(`query_dld_monthly: ${error.message}`);
    const rows = (data ?? []).map((r) => ({
      month: r.month,
      sales_count: r.sales_count,
      total_aed: Number(r.total_aed),
      avg_psqft: Number(r.avg_psqft),
    }));
    return { data: rows, rows: rows.length, window: `${start} to ${end}` };
  },
};

// ── DLD: areas ranked / top-N ───────────────────────────────────

const query_dld_areas: StudioTool = {
  name: 'query_dld_areas',
  description:
    'Top Dubai areas. Each row has avg price per sqft, 12-month growth %, rental yield %, demand score, supply pipeline. Use for top-areas rankings, area comparison, market-leader narratives.',
  parameters: {
    type: 'object',
    properties: {
      top_n:   { type: 'integer', description: 'Rows to return (default 10, max 25).' },
      sort_by: {
        type: 'string',
        description:
          "Sort key — 'volume' (txn count 30d), 'growth' (12m psqft growth %), 'yield' (rental yield), 'demand' (demand score), 'price' (current psqft).",
        enum: ['volume', 'growth', 'yield', 'demand', 'price'],
      },
    },
  },
  source: 'Dubai Land Department',
  fn: async (params, { supabase }) => {
    const topN = Math.min(25, Math.max(1, Number(params.top_n ?? 10)));
    const sortBy = String(params.sort_by ?? 'demand');
    const columnMap: Record<string, string> = {
      volume: 'transaction_volume_30d',
      yield:  'rental_yield_avg',
      demand: 'demand_score',
      price:  'avg_price_per_sqft_current',
      growth: 'avg_price_per_sqft_current', // sort manually below
    };
    const sortColumn = columnMap[sortBy] ?? 'demand_score';

    const { data, error } = await supabase
      .from('dld_areas')
      .select(
        'name, avg_price_per_sqft_current, avg_price_per_sqft_12m_ago, transaction_volume_30d, rental_yield_avg, demand_score, supply_pipeline_units',
      )
      .order(sortColumn, { ascending: false, nullsFirst: false })
      .limit(topN * 3); // overfetch so growth-sort can re-rank.
    if (error) throw new Error(`query_dld_areas: ${error.message}`);

    let rows = (data ?? []).map((r) => {
      const cur = Number(r.avg_price_per_sqft_current) || 0;
      const ago = Number(r.avg_price_per_sqft_12m_ago) || cur;
      const growth_12m_pct = ago > 0 ? ((cur - ago) / ago) * 100 : 0;
      return {
        name: r.name,
        price_per_sqft: Math.round(cur),
        price_per_sqft_12m_ago: Math.round(ago),
        growth_12m_pct: Number(growth_12m_pct.toFixed(1)),
        rental_yield_pct: Number(Number(r.rental_yield_avg ?? 0).toFixed(2)),
        demand_score: Number(r.demand_score ?? 0),
        transaction_volume_30d: Number(r.transaction_volume_30d ?? 0),
        supply_pipeline_units: Number(r.supply_pipeline_units ?? 0),
      };
    });
    if (sortBy === 'growth') rows.sort((a, b) => b.growth_12m_pct - a.growth_12m_pct);
    rows = rows.slice(0, topN);
    return { data: rows, rows: rows.length };
  },
};

// ── DLD: single-area detail ─────────────────────────────────────

const query_dld_area_detail: StudioTool = {
  name: 'query_dld_area_detail',
  description:
    'Full stats for one Dubai area — current price psqft, 12-month growth, rental yield, demand score, supply pipeline, recent transaction volume. Use when the deck topic mentions a specific community (e.g. "JVC", "Marina", "Palm Jumeirah").',
  parameters: {
    type: 'object',
    properties: {
      area: { type: 'string', description: 'Area name or partial match (case-insensitive).' },
    },
    required: ['area'],
  },
  source: 'Dubai Land Department',
  fn: async (params, { supabase }) => {
    const area = String(params.area);
    const { data, error } = await supabase
      .from('dld_areas')
      .select(
        'name, avg_price_per_sqft_current, avg_price_per_sqft_12m_ago, transaction_volume_30d, rental_yield_avg, demand_score, supply_pipeline_units, city',
      )
      .ilike('name', `%${area}%`)
      .order('demand_score', { ascending: false, nullsFirst: false })
      .limit(1);
    if (error) throw new Error(`query_dld_area_detail: ${error.message}`);
    const r = (data ?? [])[0];
    if (!r) return { data: { area_not_found: area }, rows: 0 };
    const cur = Number(r.avg_price_per_sqft_current) || 0;
    const ago = Number(r.avg_price_per_sqft_12m_ago) || cur;
    const growth_12m_pct = ago > 0 ? ((cur - ago) / ago) * 100 : 0;
    return {
      data: {
        name: r.name,
        city: r.city,
        price_per_sqft: Math.round(cur),
        price_per_sqft_12m_ago: Math.round(ago),
        growth_12m_pct: Number(growth_12m_pct.toFixed(1)),
        rental_yield_pct: Number(Number(r.rental_yield_avg ?? 0).toFixed(2)),
        demand_score: Number(r.demand_score ?? 0),
        transaction_volume_30d: Number(r.transaction_volume_30d ?? 0),
        supply_pipeline_units: Number(r.supply_pipeline_units ?? 0),
      },
      rows: 1,
    };
  },
};

// ── DLD: top buildings by transaction count ─────────────────────

const query_dld_top_buildings: StudioTool = {
  name: 'query_dld_top_buildings',
  description:
    'Top Dubai buildings ranked by recorded DLD transaction count. Use for "which towers are selling" narratives.',
  parameters: {
    type: 'object',
    properties: {
      top_n: { type: 'integer', description: 'Rows to return (default 10, max 25).' },
      area:  { type: 'string', description: 'Optional area filter (partial match).' },
    },
  },
  source: 'Dubai Land Department',
  fn: async (params, { supabase }) => {
    const topN = Math.min(25, Math.max(1, Number(params.top_n ?? 10)));
    let q = supabase
      .from('dld_building_catalogue')
      .select('building_name_en, project_name_en, area_name_en, transaction_count, last_seen_date')
      .order('transaction_count', { ascending: false, nullsFirst: false })
      .limit(topN);
    if (params.area) q = q.ilike('area_name_en', `%${String(params.area)}%`);
    const { data, error } = await q;
    if (error) throw new Error(`query_dld_top_buildings: ${error.message}`);
    const rows = (data ?? []).map((r) => ({
      building_name: r.building_name_en,
      project_name: r.project_name_en,
      area_name: r.area_name_en,
      transaction_count: Number(r.transaction_count ?? 0),
      last_seen_date: r.last_seen_date,
    }));
    return { data: rows, rows: rows.length };
  },
};

// ── DLD: developer roll-up from building catalogue ──────────────

const query_dld_top_developers: StudioTool = {
  name: 'query_dld_top_developers',
  description:
    'Top Dubai developers ranked by aggregated transaction count across their projects. Use when the topic mentions developers (Emaar, Damac, Nakheel, etc.) or off-plan launches.',
  parameters: {
    type: 'object',
    properties: {
      top_n: { type: 'integer', description: 'Rows to return (default 8, max 20).' },
    },
  },
  source: 'Dubai Land Department',
  fn: async (params, { supabase }) => {
    const topN = Math.min(20, Math.max(1, Number(params.top_n ?? 8)));
    // No developer_name column in catalogue — roll up by project_name.
    const { data, error } = await supabase
      .from('dld_building_catalogue')
      .select('project_name_en, transaction_count')
      .not('project_name_en', 'is', null)
      .order('transaction_count', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw new Error(`query_dld_top_developers: ${error.message}`);
    // Group by project_name_en (closest proxy we have for developer).
    const byProject = new Map<string, number>();
    for (const r of data ?? []) {
      const key = String(r.project_name_en ?? '').trim();
      if (!key) continue;
      byProject.set(key, (byProject.get(key) ?? 0) + Number(r.transaction_count ?? 0));
    }
    const rows = [...byProject.entries()]
      .map(([project, total]) => ({ project, transaction_count: total }))
      .sort((a, b) => b.transaction_count - a.transaction_count)
      .slice(0, topN);
    return { data: rows, rows: rows.length };
  },
};

// ── DLD: recent transactions (limited — fed by dld-proxy nightly) ─

const query_dld_recent_transactions: StudioTool = {
  name: 'query_dld_recent_transactions',
  description:
    'Most recently recorded Dubai sale transactions — each row has area, building, property type, price, size, psqft, date. Use sparingly: only for "concrete example" slides where a few real deals make the abstract numbers tangible.',
  parameters: {
    type: 'object',
    properties: {
      area:  { type: 'string', description: 'Optional area filter (partial match).' },
      limit: { type: 'integer', description: 'Max rows (default 12, max 25).' },
    },
  },
  source: 'Dubai Land Department',
  fn: async (params, { supabase }) => {
    const limit = Math.min(25, Math.max(1, Number(params.limit ?? 12)));
    let q = supabase
      .from('dld_transactions')
      .select(
        'area_id, project_name, building_name, property_type, transaction_type, price, size_sqft, price_per_sqft, transaction_date, bedrooms, view',
      )
      .eq('transaction_type', 'Sales')
      .order('transaction_date', { ascending: false, nullsFirst: false })
      .limit(limit);
    const { data, error } = await q;
    if (error) {
      // Table might not be populated — return empty, don't crash.
      return { data: { unavailable: true, hint: error.message }, rows: 0 };
    }
    return { data: data ?? [], rows: Array.isArray(data) ? data.length : 0 };
  },
};

// ── Internationals — proxy stubs (return rows=0 for V1) ─────────

function makeStub(name: string, description: string, parameters: Schema, source: string): StudioTool {
  return {
    name,
    description,
    parameters,
    source,
    fn: async () => ({ data: { unavailable: true, reason: 'live proxy integration in the next chunk' }, rows: 0 }),
  };
}

const query_dld_offplan_split = makeStub(
  'query_dld_offplan_split',
  'Dubai off-plan vs secondary split (count + AED value) for a window. STUB until the cached aggregate is built — returns rows=0; write the slide without specific percentages, or call query_dld_areas for area-level data instead.',
  {
    type: 'object',
    properties: {
      start_date: { type: 'string' },
      end_date:   { type: 'string' },
      area:       { type: 'string' },
    },
    required: ['start_date', 'end_date'],
  },
  'Dubai Land Department',
);

const query_dld_rentals_by_area = makeStub(
  'query_dld_rentals_by_area',
  'Top Dubai areas by DLD Ejari rental contract volume for a window. STUB until cached — returns rows=0; use query_dld_areas with sort_by=yield as a proxy for rental hotspots.',
  {
    type: 'object',
    properties: {
      start_date: { type: 'string' },
      end_date:   { type: 'string' },
      top_n:      { type: 'integer' },
    },
    required: ['start_date', 'end_date'],
  },
  'Dubai Land Department · Ejari',
);

const query_reelly_projects = makeStub(
  'query_reelly_projects',
  'Reelly off-plan project catalogue. STUB — write the slide narrative without specific project counts.',
  {
    type: 'object',
    properties: {
      developer:   { type: 'string' },
      city:        { type: 'string' },
      sale_status: { type: 'string' },
    },
  },
  'Reelly',
);

const query_uk_landregistry = makeStub(
  'query_uk_landregistry',
  'UK HM Land Registry UKHPI by region. STUB.',
  {
    type: 'object',
    properties: { region: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' } },
    required: ['region'],
  },
  'HM Land Registry',
);

const query_us_caseshiller = makeStub(
  'query_us_caseshiller',
  'US Case-Shiller home-price index by MSA. STUB.',
  {
    type: 'object',
    properties: { msa: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' } },
    required: ['msa'],
  },
  'S&P Case-Shiller',
);

// ── Reference assets ───────────────────────────────────────────

const fetch_uploaded_doc: StudioTool = {
  name: 'fetch_uploaded_doc',
  description: 'Read the extracted text of a PDF the adviser attached as reference.',
  parameters: {
    type: 'object',
    properties: { asset_id: { type: 'string' } },
    required: ['asset_id'],
  },
  source: 'Uploaded PDF',
  fn: async (params, { supabase }) => {
    const id = String(params.asset_id);
    const { data, error } = await supabase
      .from('studio_assets')
      .select('extracted_text, storage_path, source_url')
      .eq('id', id)
      .eq('kind', 'pdf')
      .single();
    if (error) throw new Error(`fetch_uploaded_doc: ${error.message}`);
    return {
      data: { text: data?.extracted_text ?? '', source: data?.storage_path ?? data?.source_url },
      rows: data?.extracted_text ? 1 : 0,
    };
  },
};

const fetch_youtube_transcript: StudioTool = {
  name: 'fetch_youtube_transcript',
  description: 'Read the transcript of a YouTube video the adviser attached.',
  parameters: {
    type: 'object',
    properties: { asset_id: { type: 'string' } },
    required: ['asset_id'],
  },
  source: 'YouTube',
  fn: async (params, { supabase }) => {
    const id = String(params.asset_id);
    const { data, error } = await supabase
      .from('studio_assets')
      .select('extracted_text, source_url')
      .eq('id', id)
      .eq('kind', 'youtube_transcript')
      .single();
    if (error) throw new Error(`fetch_youtube_transcript: ${error.message}`);
    return {
      data: { text: data?.extracted_text ?? '', url: data?.source_url },
      rows: data?.extracted_text ? 1 : 0,
    };
  },
};

// ── Public registry ────────────────────────────────────────────

export const STUDIO_TOOLS: StudioTool[] = [
  query_dld_monthly,
  query_dld_areas,
  query_dld_area_detail,
  query_dld_top_buildings,
  query_dld_top_developers,
  query_dld_recent_transactions,
  query_dld_offplan_split,
  query_dld_rentals_by_area,
  query_reelly_projects,
  query_uk_landregistry,
  query_us_caseshiller,
  fetch_uploaded_doc,
  fetch_youtube_transcript,
];

export function findStudioTool(name: string): StudioTool | undefined {
  return STUDIO_TOOLS.find((t) => t.name === name);
}

export function geminiFunctionDeclarations() {
  return STUDIO_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}
