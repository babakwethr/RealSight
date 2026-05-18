/**
 * Currency formatting helpers.
 *
 * Per LAUNCH_PLAN.md §12 (international positioning):
 *   In the UAE market we show AED + USD side by side — "AED 2.6M / USD 707K".
 *
 * Phase 1 of the global-launch plan adds market-aware helpers
 * (`formatMarketPrice`, `formatMarketDualPrice`) that pick the right base
 * currency (USD/GBP/AED/EUR) from the active market. The legacy AED-only
 * helpers (`formatDualPrice`, `formatUsdEquivalent`, `formatPriceSplit`)
 * are kept exported and unchanged for the existing UAE callers — they are
 * NOT deprecated, they are correct for UAE pages.
 *
 * FX rates: AED is pegged to USD at 3.6725 (fixed since 1997). GBP and EUR
 * use a snapshot rate refreshed daily by the `fx-rates-cron` edge function
 * (Phase 1 deliverable). The constants here are the fallback values used
 * when the live rate table is unavailable.
 */
import type { Currency, Market } from '@/lib/markets';

/** Fixed AED → USD rate (UAE Central Bank peg). */
export const AED_PER_USD = 3.6725;

/**
 * Fallback rates: 1 unit of source currency = N USD.
 * Live values arrive via the FX cron in Phase 1. Until then, these are
 * reasonable approximations as of May 2026.
 */
export const FALLBACK_RATES_TO_USD: Record<Currency, number> = {
  USD: 1.0,
  GBP: 1.27,
  AED: 1 / AED_PER_USD,
  EUR: 1.08,
};

/** Convert any market currency → USD using the fallback rates. */
export function toUsd(amount: number, currency: Currency): number {
  return amount * FALLBACK_RATES_TO_USD[currency];
}

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

// ──────────────────────────────────────────────────────────────────────
// Market-aware helpers (Phase 1 of global-launch plan)
// ──────────────────────────────────────────────────────────────────────

/**
 * Format a price in the market's native currency.
 *
 * @param amount Value in the market's base currency (USD for US, GBP for
 *               UK, AED for UAE, EUR for Spain).
 * @param market Active market (from `useMarket().market`).
 * @param opts.compact Use M/K suffix (default true).
 *
 * Examples:
 *   formatMarketPrice(2_600_000, usMarket) → "$2.6M"
 *   formatMarketPrice(2_100_000, ukMarket) → "£2.1M"
 *   formatMarketPrice(2_600_000, uaeMarket) → "AED 2.6M"
 *   formatMarketPrice(1_900_000, spainMarket) → "€1.9M"
 */
export function formatMarketPrice(
  amount: number | null | undefined,
  market: Pick<Market, 'currency' | 'currencySymbol'>,
  opts: { compact?: boolean } = {},
): string {
  if (amount == null || !isFinite(amount)) return '—';
  const compact = opts.compact ?? true;
  const symbol = market.currencySymbol;
  // USD / EUR use prefixed symbol with no space; AED uses the ISO prefix.
  const tight = market.currency === 'USD' || market.currency === 'EUR' || market.currency === 'GBP';
  const value = compact
    ? formatCompact(amount)
    : amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return tight ? `${symbol}${value}` : `${symbol} ${value}`;
}

/**
 * Dual-currency formatter for market-aware surfaces. Shows the market's
 * native currency as primary + USD as secondary equivalent.
 *
 * For UAE returns "AED 2.6M / USD 707K" (matches existing UX).
 * For US returns just "$2.6M" (USD is already native — no point dualling).
 * For UK / Spain returns "£2.1M / USD 2.7M" etc.
 *
 * Uses fallback FX rates until the FX cron lands a live table.
 */
export function formatMarketDualPrice(
  amount: number | null | undefined,
  market: Pick<Market, 'currency' | 'currencySymbol'>,
  opts: { compact?: boolean; separator?: string } = {},
): string {
  if (amount == null || !isFinite(amount)) return '—';
  const native = formatMarketPrice(amount, market, opts);
  if (market.currency === 'USD') return native;
  const sep = opts.separator ?? ' / ';
  const usd = toUsd(amount, market.currency);
  const compact = opts.compact ?? true;
  const usdStr = compact
    ? `USD ${formatCompact(usd)}`
    : `USD ${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `${native}${sep}${usdStr}`;
}
