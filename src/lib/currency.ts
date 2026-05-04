/**
 * Currency formatting helpers.
 *
 * Per LAUNCH_PLAN.md §12 (international positioning):
 *   AED + USD shown side by side everywhere — e.g. "AED 2.6M / USD 707K".
 *   This signals to non-UAE investors that we are a global platform that
 *   happens to cover Dubai, not a Dubai-only company.
 *
 * AED is pegged to USD at ~3.6725 — effectively fixed since 1997. We use
 * a constant rate; no need for a live FX feed for display purposes.
 */

/** Fixed AED → USD rate (UAE Central Bank peg). */
export const AED_PER_USD = 3.6725;

/** Convert AED → USD using the pegged rate. */
export function aedToUsd(aed: number): number {
  return aed / AED_PER_USD;
}

/**
 * Format a number as a compact human-readable price (e.g. 2_600_000 → "2.6M").
 * Returns "—" for null / undefined / NaN.
 */
export function formatCompact(value: number | null | undefined, decimals = 1): string {
  if (value == null || !isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(decimals)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return Math.round(value).toLocaleString();
}

/**
 * Format an AED amount as a single string with both currencies.
 * Default short form: "AED 2.6M / USD 707K".
 *
 * @param aed Amount in AED.
 * @param opts.compact use M / K suffixes (default true).
 * @param opts.separator string between AED and USD (default " / ").
 */
export function formatDualPrice(
  aed: number | null | undefined,
  opts: { compact?: boolean; separator?: string } = {},
): string {
  if (aed == null || !isFinite(aed)) return '—';
  const compact = opts.compact ?? true;
  const sep = opts.separator ?? ' / ';
  const usd = aedToUsd(aed);
  if (compact) {
    return `AED ${formatCompact(aed)}${sep}USD ${formatCompact(usd)}`;
  }
  return `AED ${aed.toLocaleString(undefined, { maximumFractionDigits: 0 })}${sep}USD ${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Just the USD-equivalent line, e.g. "≈ USD 707K" — useful as a subtitle. */
export function formatUsdEquivalent(aed: number | null | undefined): string {
  if (aed == null || !isFinite(aed)) return '';
  return `≈ USD ${formatCompact(aedToUsd(aed))}`;
}

/**
 * Split form of dual price — returns the AED line and the USD line as two
 * strings, so the UI can render them stacked (AED big, USD small below).
 * Use this in narrow card layouts where the joined "AED X / USD Y" string
 * would wrap awkwardly mid-value.
 */
export function formatPriceSplit(
  aed: number | null | undefined,
  opts: { compact?: boolean } = {},
): { aed: string; usd: string } {
  if (aed == null || !isFinite(aed)) return { aed: '—', usd: '' };
  const compact = opts.compact ?? true;
  const usd = aedToUsd(aed);
  if (compact) {
    return { aed: `AED ${formatCompact(aed)}`, usd: `USD ${formatCompact(usd)}` };
  }
  return {
    aed: `AED ${aed.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    usd: `USD ${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  };
}
