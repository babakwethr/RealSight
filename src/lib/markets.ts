/**
 * Single source of truth for RealSight markets.
 *
 * Every market-aware surface in the app — MarketSwitcher, MarketHome,
 * Portfolio, GlobalRadar, currency/units formatters, edge-function
 * routing — reads from this list. Adding a new market means adding one
 * entry here (and wiring its `<market>-proxy` edge function).
 *
 * Order is deliberate: US first (ADRO LAB origin), UK second, UAE
 * third (international expansion), Spain on deck. This order must be
 * preserved in every public list (PublicHome, MarketSwitcher, Privacy/
 * Security legal copy).
 *
 * Per the global-launch plan, US and UK are tagged "live-cohort" — the
 * MarketSwitcher shows them as Live but clicks route to /request-access
 * until the per-market dashboards fully populate (Phases 2-3 of the plan).
 * UAE is fully live (DLD + Reelly). Spain is the only "coming-soon".
 */

export type MarketSlug = 'us' | 'uk' | 'uae' | 'spain';

export type MarketStatus = 'live' | 'live-cohort' | 'coming-soon';

export type Currency = 'USD' | 'GBP' | 'AED' | 'EUR';

export interface Market {
  /** Stable internal slug — used in URLs (?market=uk), DB columns, hook calls. */
  slug: MarketSlug;
  /** Human-readable name as shown to users. */
  name: string;
  /** Short label for tight surfaces (chips, mobile nav). */
  shortName: string;
  /** ISO 3166-1 alpha-2. */
  countryCode: 'US' | 'GB' | 'AE' | 'ES';
  /** Emoji flag. */
  flag: string;
  /** Base currency for prices in this market. */
  currency: Currency;
  /** Symbol used inline (e.g. "$2.6M"). For AED/EUR we use ISO prefix. */
  currencySymbol: string;
  /**
   * Area unit shown to users. We default to sqft everywhere for v1
   * (consistent dual display with Dubai); switching to sqm per market
   * is a v2 concern.
   */
  areaUnit: 'sqft' | 'sqm';
  /** Locale tag for number / date formatting. */
  locale: string;
  /** Launch status — see MarketStatus. */
  status: MarketStatus;
  /**
   * Maps to Reelly's `country` query parameter. Null when Reelly does not
   * cover this market (the Reelly proxy falls back to demo / empty state).
   * Reelly only has populated catalogues for UAE; non-UAE values are
   * reserved for future expansion (Bali/Thailand surface in the off-plan
   * section, not the country market list).
   */
  reellyCountry: string | null;
}

export const MARKETS: readonly Market[] = [
  {
    slug: 'us',
    name: 'United States',
    shortName: 'US',
    countryCode: 'US',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    areaUnit: 'sqft',
    locale: 'en-US',
    status: 'live-cohort',
    reellyCountry: null,
  },
  {
    slug: 'uk',
    name: 'United Kingdom',
    shortName: 'UK',
    countryCode: 'GB',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    areaUnit: 'sqft',
    locale: 'en-GB',
    status: 'live-cohort',
    reellyCountry: null,
  },
  {
    slug: 'uae',
    name: 'United Arab Emirates',
    shortName: 'UAE',
    countryCode: 'AE',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    areaUnit: 'sqft',
    locale: 'en-AE',
    status: 'live',
    reellyCountry: 'United Arab Emirates',
  },
  {
    slug: 'spain',
    name: 'Spain',
    shortName: 'Spain',
    countryCode: 'ES',
    flag: '🇪🇸',
    currency: 'EUR',
    currencySymbol: '€',
    areaUnit: 'sqft',
    locale: 'es-ES',
    status: 'coming-soon',
    reellyCountry: null,
  },
] as const;

/** Default market when none is selected. UAE has full data flowing today. */
export const DEFAULT_MARKET_SLUG: MarketSlug = 'uae';

/** Lookup. Returns the UAE market if the slug is unknown. */
export function getMarket(slug: string | null | undefined): Market {
  const found = MARKETS.find((m) => m.slug === slug);
  return found ?? (MARKETS.find((m) => m.slug === DEFAULT_MARKET_SLUG) as Market);
}

/** Markets that have at least cohort-level access (not "coming-soon"). */
export function liveOrCohortMarkets(): Market[] {
  return MARKETS.filter((m) => m.status !== 'coming-soon');
}

/** Markets users can actually browse data for today. */
export function fullyLiveMarkets(): Market[] {
  return MARKETS.filter((m) => m.status === 'live');
}
