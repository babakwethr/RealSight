/**
 * Area-unit formatting helpers.
 *
 * v1 keeps everything in sqft across all markets (US sqft is native, UK
 * sqft is acceptable for residential, UAE is canonical, Spain is wrong
 * but we don't show Spain area yet). v2 will key off `market.areaUnit`
 * to switch to sqm where culturally appropriate.
 *
 * Use `formatArea(value, market)` instead of inlining `${n} sqft` strings.
 * That gives us one place to flip when v2 ships.
 */
import type { Market } from '@/lib/markets';

/** 1 m² in square feet. */
export const SQFT_PER_SQM = 10.7639;

export function sqmToSqft(sqm: number): number {
  return sqm * SQFT_PER_SQM;
}

export function sqftToSqm(sqft: number): number {
  return sqft / SQFT_PER_SQM;
}

/**
 * Format an area for display in the active market.
 *
 * @param sqft Area in square feet — the canonical storage unit.
 * @param market Active market (use `useMarket().market`).
 * @param opts.compact Round + truncate (e.g. 643.61 → "644"). Default true.
 */
export function formatArea(
  sqft: number | null | undefined,
  market: Pick<Market, 'areaUnit'>,
  opts: { compact?: boolean } = {},
): string {
  if (sqft == null || !isFinite(sqft)) return '—';
  const compact = opts.compact ?? true;

  if (market.areaUnit === 'sqm') {
    const sqm = sqftToSqm(sqft);
    return compact
      ? `${Math.round(sqm).toLocaleString()} sqm`
      : `${sqm.toLocaleString(undefined, { maximumFractionDigits: 1 })} sqm`;
  }

  // Default: sqft
  return compact
    ? `${Math.round(sqft).toLocaleString()} sqft`
    : `${sqft.toLocaleString(undefined, { maximumFractionDigits: 1 })} sqft`;
}
