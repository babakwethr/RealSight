/**
 * Deck Builder runtime — shared types.
 *
 * The runtime renders a deck composed of N slides (5–10) drawn from
 * the slide-type catalogue. Each slide type has its own data shape,
 * but they share the SlideProps envelope:
 *   - `entry`     — the LLM-produced outline entry (headline, body,
 *                   citation, slide-specific `data` payload)
 *   - `branding`  — tenant + adviser branding the runtime applies to
 *                   every slide (logo, accent override)
 *   - `visual`    — per-slide image URL chosen by the adviser
 *                   (upload or curated stock) — overrides any default
 *                   the template provides
 *   - `isMobile`  — true on small viewports OR in static (print/PDF)
 *                   rendering; tells slides to skip cinematic motion
 *
 * Slides receive their data via `entry.data` so the runtime stays
 * source-agnostic — the same Stage component renders both a
 * preview-mode deck (composed in the editor) and a published deck
 * (loaded from `studio_decks` table).
 */

import type { ReactNode } from 'react';

// ── Catalogue ──────────────────────────────────────────────────────

export type SlideType =
  | 'cover'
  | 'why_now'
  | 'market_trend'
  | 'signal'
  | 'offplan_split'
  | 'buyer'
  | 'top_volume'
  | 'top_yield'
  | 'strategy'
  | 'closing';

export const SLIDE_TYPES: SlideType[] = [
  'cover',
  'why_now',
  'market_trend',
  'signal',
  'offplan_split',
  'buyer',
  'top_volume',
  'top_yield',
  'strategy',
  'closing',
];

// ── Citation (data traceability) ──────────────────────────────────

/**
 * Every number on every slide must trace to one of these. The deck
 * planner persists the citation alongside the data, so the front-end
 * renders the chip without re-running the tool.
 */
export interface Citation {
  /** Tool name as registered in studioTools.ts — e.g. 'query_dld_monthly'. */
  tool: string;
  /** Parameters the LLM passed when invoking the tool. */
  params: Record<string, unknown>;
  /** Number of rows returned (for the "DLD · N deals" chip text). */
  rows: number;
  /** ISO timestamp of when the tool ran. */
  fetched_at: string;
  /** Human-readable source label — e.g. 'DLD', 'HM Land Registry'. */
  source: string;
  /** Optional human-readable window — e.g. '27 Feb – 18 May 2026'. */
  window?: string;
}

// ── Branding (per-tenant + per-adviser overlay) ───────────────────

export interface Branding {
  /** Agency logo URL from tenants.branding_config.logo_url. */
  logo_url?: string;
  /** Accent colour override from tenants.branding_config.colors.primary. */
  accent_color?: string;
  /** Agency display name. */
  agency_name?: string;
}

// ── Closing-slide adviser profile ─────────────────────────────────

export interface AdviserContact {
  full_name: string;
  title?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  calendar_url?: string;
  avatar_url?: string;
  rera_number?: string; // BRN
  /** Tenant-level RERA QR PNG URL. */
  rera_qr_url?: string;
}

// ── Per-slide data shapes (loose union; each slide narrows) ───────

export interface CoverData {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  presenter?: string;
  data_source_label?: string;
}

export interface WhyNowData {
  paragraphs: string[];
}

export interface BarPoint {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface MarketTrendData {
  bars: BarPoint[];
  caption?: string;
  /** Index in `bars` to mark as the trend-break / pivot point. */
  pivot_index?: number;
  /** Optional summary stats rendered as a 3-up StatCard row. */
  stats?: { label: string; value: string; sub?: string; accent?: boolean }[];
}

export interface SignalData {
  bars: BarPoint[];
  caption?: string;
  signal_text?: string;
  stats?: { label: string; value: string; sub?: string; accent?: boolean }[];
}

export interface OffplanSplitData {
  window_label: string;
  total_deals: number;
  total_value_bn: number;
  off_plan_pct_count: number;
  secondary_pct_count: number;
  off_plan_pct_value: number;
  secondary_pct_value: number;
}

export interface BuyerTypeRow {
  type: string;
  tag: string;
  qualify: string;
  plays: string[];
}

export interface BuyerData {
  rows: BuyerTypeRow[];
}

export interface AreaBarRow {
  area: string;
  primary: number;   // sales count OR rental contracts
  secondary?: number; // optional value (e.g. value_bn)
}

export interface TopVolumeData {
  rows: AreaBarRow[];
  window_label?: string;
  caption?: string;
}

export interface TopYieldData {
  rows: AreaBarRow[];
  window_label?: string;
  caption?: string;
}

export interface StrategyTier {
  tier: string;
  label: string;
  items: string[];
  why?: string;
}

export interface StrategyData {
  tiers: StrategyTier[];
  intro?: string;
}

/** Closing slide gets its data from the adviser's profile + tenant, not
 *  from the LLM outline. So no `ClosingData` — the slide reads
 *  `adviser` + `branding` directly. */

// ── Outline (the canonical deck structure) ────────────────────────

export interface OutlineEntry {
  slide_type: SlideType;
  /** Headline overlay text (LLM-produced). */
  headline?: string;
  /** Body / sub-headline text (LLM-produced). */
  body?: string;
  /** Tool-call citation, if any. */
  citation?: Citation | null;
  /** Slide-specific data payload (shape depends on slide_type). */
  data?: unknown;
}

// ── SlideProps envelope (passed to every slide layout) ────────────

export interface SlideProps<T = unknown> {
  index: number;
  isMobile?: boolean;
  entry: OutlineEntry & { data?: T };
  branding: Branding;
  /** Image URL for the slide background. Optional — some slides
   *  (closing, buyer) have no photo background. */
  visual?: string;
  /** Closing slide reads adviser contact directly. Other slides
   *  don't need it, but it's passed for consistency. */
  adviser?: AdviserContact;
}

// ── Render-time helpers ───────────────────────────────────────────

/** Inline ReactNode prop type (for StatCard etc.). */
export type Inline = ReactNode;
