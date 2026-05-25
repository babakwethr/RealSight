/**
 * Studio Deck Builder — LLM tool catalogue.
 *
 * Every tool listed here can be invoked by the LLM during outline
 * generation (`studio-deck-plan` edge function). The system prompt
 * forces the constraint: *no number on any slide may exist that
 * isn't the literal return value of one of these tools.*
 *
 * Each tool returns `{ data, rows, window? }`. The orchestrator
 * builds a `Citation` from that + the call's params and persists it
 * into `studio_decks.outline[i].citation` so the front-end
 * `CitationChip` can render hover-revealed source proof.
 *
 * Phase 1 ships the UAE-DLD and uploaded-asset tools live; the
 * Reelly / UK / US / cached-aggregate tools are declared (so the
 * LLM can pick them) but stubbed to return empty rows. Phase 2 + 3
 * fleshes them out.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ── JSON-schema helpers (Gemini's function-calling format) ─────────

type Schema = {
  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array';
  description?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: string[];
};

// ── Tool implementation surface ───────────────────────────────────

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  profileId: string;
  deckId?: string;
}

export interface ToolResult {
  data: unknown;
  /** Row count — surfaced in the citation chip. */
  rows: number;
  /** Optional human-readable date window — e.g. '27 Feb – 18 May 2026'. */
  window?: string;
}

export interface StudioTool {
  name: string;
  description: string;
  parameters: Schema;
  /** Source label that ends up in the citation chip — 'DLD',
   *  'HM Land Registry', 'Case-Shiller', 'Reelly', etc. */
  source: string;
  /** Implementation. Throws on hard failure; returns `{ rows: 0 }`
   *  for "no data" responses (the LLM will phrase the slide without
   *  numbers). */
  fn: (params: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

// ── Tool implementations ──────────────────────────────────────────

/** Dubai-wide monthly transactions (count + value + psqft). */
const query_dld_monthly: StudioTool = {
  name: 'query_dld_monthly',
  description:
    'Dubai monthly transaction count, AED total value, and average AED per square foot, for a given window. Use this for any time-series chart of Dubai market activity.',
  parameters: {
    type: 'object',
    properties: {
      start: { type: 'string', description: 'Window start, YYYY-MM (e.g. 2025-09).' },
      end:   { type: 'string', description: 'Window end, YYYY-MM (inclusive).' },
      area:  { type: 'string', description: 'Optional area name. Omit (or "__all__") for Dubai-wide.' },
    },
    required: ['start', 'end'],
  },
  source: 'Dubai Land Department',
  fn: async (params, { supabase }) => {
    const start = String(params.start);
    const end = String(params.end);
    const area = (params.area as string | undefined) || '__all__';
    const { data, error } = await supabase.rpc('get_dld_monthly_trend', {
      p_area: area,
      p_start: start + '-01',
      p_end: end + '-01',
    });
    if (error) throw new Error(`query_dld_monthly: ${error.message}`);
    return {
      data: data ?? [],
      rows: Array.isArray(data) ? data.length : 0,
      window: `${start} to ${end}`,
    };
  },
};

/** Top areas in Dubai by recent activity. */
const query_dld_areas: StudioTool = {
  name: 'query_dld_areas',
  description:
    'Top Dubai areas sorted by activity. Each row has area name, current avg AED/sqft, 12-month growth, gross rental yield, demand score. Use for any "top areas" ranking, area selection, or area comparison.',
  parameters: {
    type: 'object',
    properties: {
      top_n:   { type: 'integer', description: 'How many areas to return (max 20, default 8).' },
      sort_by: {
        type: 'string',
        description: "Sort key — 'demand' | 'growth' | 'yield' | 'psqft'.",
        enum: ['demand', 'growth', 'yield', 'psqft'],
      },
    },
  },
  source: 'Dubai Land Department',
  fn: async (params, { supabase }) => {
    const topN = Math.min(20, Number(params.top_n ?? 8));
    const { data, error } = await supabase.rpc('list_dld_areas');
    if (error) throw new Error(`query_dld_areas: ${error.message}`);
    let rows = (data ?? []) as Array<Record<string, unknown>>;
    const sortBy = String(params.sort_by ?? 'demand');
    // Best-effort sort — column names depend on RPC shape, fall back gracefully.
    rows = [...rows].sort((a, b) => Number(b[sortBy] ?? 0) - Number(a[sortBy] ?? 0));
    rows = rows.slice(0, topN);
    return { data: rows, rows: rows.length };
  },
};

/** Stub — fleshed out in Phase 2 once the cached aggregate lands. */
const query_dld_offplan_split: StudioTool = {
  name: 'query_dld_offplan_split',
  description:
    'Dubai off-plan vs secondary split for a given window: count of deals, total AED value, and the percentage cut by both metrics. Use for "off-plan vs secondary" slides.',
  parameters: {
    type: 'object',
    properties: {
      start_date: { type: 'string', description: 'Window start, YYYY-MM-DD.' },
      end_date:   { type: 'string', description: 'Window end, YYYY-MM-DD.' },
      area:       { type: 'string', description: 'Optional area filter.' },
    },
    required: ['start_date', 'end_date'],
  },
  source: 'Dubai Land Department',
  fn: async (_params) => {
    // Phase 2 wires this to `dld_monthly_aggregates_by_regtype`.
    // Until then, return empty so the LLM writes the slide without
    // hallucinated numbers.
    return { data: { unavailable: true }, rows: 0 };
  },
};

/** Stub — fleshed out in Phase 2. */
const query_dld_rentals_by_area: StudioTool = {
  name: 'query_dld_rentals_by_area',
  description:
    'Top Dubai areas by rental contract volume (DLD Ejari registrations) for a given window. Use for "rental hotspots" slides.',
  parameters: {
    type: 'object',
    properties: {
      start_date: { type: 'string', description: 'Window start, YYYY-MM-DD.' },
      end_date:   { type: 'string', description: 'Window end, YYYY-MM-DD.' },
      top_n:      { type: 'integer', description: 'How many to return (max 10).' },
    },
    required: ['start_date', 'end_date'],
  },
  source: 'Dubai Land Department · Ejari',
  fn: async (_params) => {
    return { data: { unavailable: true }, rows: 0 };
  },
};

/** Recent Dubai sale transactions feed. */
const query_dld_recent_transactions: StudioTool = {
  name: 'query_dld_recent_transactions',
  description:
    'Most recent Dubai sale transactions, optionally filtered by area. Each row is a deal with area, building, price, date. Use sparingly — only for slides that benefit from concrete deal examples.',
  parameters: {
    type: 'object',
    properties: {
      area:  { type: 'string', description: 'Optional area filter.' },
      limit: { type: 'integer', description: 'Max rows (default 20, max 50).' },
    },
  },
  source: 'Dubai Land Department',
  fn: async (params, { supabase }) => {
    const limit = Math.min(50, Number(params.limit ?? 20));
    const area = params.area as string | undefined;
    let q = supabase
      .from('dld_transactions')
      .select('area_name, transaction_date, transaction_value, procedure_area, building_name')
      .order('transaction_date', { ascending: false })
      .limit(limit);
    if (area) q = q.ilike('area_name', `%${area}%`);
    const { data, error } = await q;
    if (error) {
      // Table might not exist on every env — fail soft, no numbers
      return { data: { unavailable: true, hint: error.message }, rows: 0 };
    }
    return { data: data ?? [], rows: Array.isArray(data) ? data.length : 0 };
  },
};

/** Reelly off-plan project list (stub for Phase 1). */
const query_reelly_projects: StudioTool = {
  name: 'query_reelly_projects',
  description:
    'Off-plan and new-launch projects from the Reelly catalogue, optionally filtered by developer, city, or sale status. Use for slides about specific developer launches or off-plan strategy.',
  parameters: {
    type: 'object',
    properties: {
      developer:   { type: 'string', description: 'Optional developer name (e.g. "Emaar").' },
      city:        { type: 'string', description: 'Optional city (e.g. "Dubai", "Bali").' },
      sale_status: { type: 'string', description: 'Optional sale status filter.' },
    },
  },
  source: 'Reelly',
  fn: async (_params) => {
    // Phase 2: invoke `reelly-proxy` edge function. Stub for now.
    return { data: { unavailable: true }, rows: 0 };
  },
};

const query_reelly_project_detail: StudioTool = {
  name: 'query_reelly_project_detail',
  description: 'Detail for a single Reelly project by id.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Reelly project ID.' },
    },
    required: ['id'],
  },
  source: 'Reelly',
  fn: async (_params) => ({ data: { unavailable: true }, rows: 0 }),
};

const query_uk_landregistry: StudioTool = {
  name: 'query_uk_landregistry',
  description: 'UK HM Land Registry UKHPI by region for a date range.',
  parameters: {
    type: 'object',
    properties: {
      region: { type: 'string', description: 'Region or postcode area.' },
      start:  { type: 'string', description: 'YYYY-MM.' },
      end:    { type: 'string', description: 'YYYY-MM.' },
    },
    required: ['region'],
  },
  source: 'HM Land Registry · UKHPI',
  fn: async (_params) => ({ data: { unavailable: true }, rows: 0 }),
};

const query_us_caseshiller: StudioTool = {
  name: 'query_us_caseshiller',
  description: 'US Case-Shiller home-price index for a metro area over a window.',
  parameters: {
    type: 'object',
    properties: {
      msa:   { type: 'string', description: 'Metro area (e.g. "New York").' },
      start: { type: 'string', description: 'YYYY-MM.' },
      end:   { type: 'string', description: 'YYYY-MM.' },
    },
    required: ['msa'],
  },
  source: 'S&P Case-Shiller',
  fn: async (_params) => ({ data: { unavailable: true }, rows: 0 }),
};

const query_us_nyc_sales: StudioTool = {
  name: 'query_us_nyc_sales',
  description: 'NYC sales aggregates, optionally filtered by ZIP code.',
  parameters: {
    type: 'object',
    properties: {
      zip:   { type: 'string', description: 'Optional ZIP code (e.g. "10001").' },
      start: { type: 'string', description: 'YYYY-MM.' },
      end:   { type: 'string', description: 'YYYY-MM.' },
    },
  },
  source: 'NYC Open Data',
  fn: async (_params) => ({ data: { unavailable: true }, rows: 0 }),
};

/** Read text extracted from an uploaded PDF reference. */
const fetch_uploaded_doc: StudioTool = {
  name: 'fetch_uploaded_doc',
  description:
    'Read the extracted text of a PDF the adviser uploaded as reference material for this deck.',
  parameters: {
    type: 'object',
    properties: {
      asset_id: { type: 'string', description: 'studio_assets.id of the PDF.' },
    },
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

/** Read text extracted from a YouTube URL the adviser attached. */
const fetch_youtube_transcript: StudioTool = {
  name: 'fetch_youtube_transcript',
  description:
    'Read the transcript of a YouTube video the adviser attached as reference material.',
  parameters: {
    type: 'object',
    properties: {
      asset_id: { type: 'string', description: 'studio_assets.id of the youtube_transcript row.' },
    },
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

// ── Public registry ───────────────────────────────────────────────

export const STUDIO_TOOLS: StudioTool[] = [
  query_dld_monthly,
  query_dld_areas,
  query_dld_offplan_split,
  query_dld_rentals_by_area,
  query_dld_recent_transactions,
  query_reelly_projects,
  query_reelly_project_detail,
  query_uk_landregistry,
  query_us_caseshiller,
  query_us_nyc_sales,
  fetch_uploaded_doc,
  fetch_youtube_transcript,
];

export function findStudioTool(name: string): StudioTool | undefined {
  return STUDIO_TOOLS.find((t) => t.name === name);
}

/** Gemini function-declaration form, sent in the `tools[]` payload. */
export function geminiFunctionDeclarations() {
  return STUDIO_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}
