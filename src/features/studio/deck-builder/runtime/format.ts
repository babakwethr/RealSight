/**
 * Number / currency / percent formatters shared across slide layouts.
 * Lifted from the reference deck's lib/data.ts (which mixed data and
 * helpers — separated here so the runtime stays data-agnostic).
 */

/** AED 15,831,888 — compact gives AED 15.8M / AED 850K. */
export function formatAED(n: number, opts?: { compact?: boolean }): string {
  if (opts?.compact) {
    if (n >= 1_000_000_000) return `AED ${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  }
  return `AED ${Math.round(n).toLocaleString('en-US')}`;
}

/** +12.7% / −15.5% / 0.0% — uses the minus-sign character (U+2212). */
export function formatPct(n: number, decimals = 1): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${Math.abs(n).toFixed(decimals)}%`;
}

/** Integer with thousands separators: 343,906. */
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
