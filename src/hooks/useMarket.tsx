/**
 * useMarket — React context + hook for the active market.
 *
 * The provider tracks the user's selected market and persists it to
 * localStorage. Reading order:
 *
 *   1. URL query param `?market=<slug>` (deep links + sharing)
 *   2. localStorage `realsight.market` (returning user)
 *   3. DEFAULT_MARKET_SLUG (`uae` while UAE is the only fully-live market)
 *
 * Every market-aware data hook and component should call `useMarket()`
 * and read `currency` / `areaUnit` / `reellyCountry` etc. from the
 * returned `market` object. Direct imports from `lib/markets.ts` are
 * fine for static metadata; the hook is for the *currently active*
 * market.
 *
 * NOTE: matching the codebase convention (`useAuth.tsx`, `useTenant.tsx`),
 * the provider + hook live in one `.tsx` file with the hook exported as
 * `useMarket`.
 */
import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import {
  type Market,
  type MarketSlug,
  MARKETS,
  DEFAULT_MARKET_SLUG,
  getMarket,
} from '@/lib/markets';

const STORAGE_KEY = 'realsight.market';

interface MarketContextValue {
  /** The currently active market (always resolved, never null). */
  market: Market;
  /** Switch markets. Persists to localStorage. */
  setMarket: (slug: MarketSlug) => void;
  /** All known markets (re-exported for convenience). */
  markets: readonly Market[];
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

/** Read the saved slug from localStorage, returning null if absent / invalid. */
function readStoredSlug(): MarketSlug | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const match = MARKETS.find((m) => m.slug === raw);
  return match ? (raw as MarketSlug) : null;
}

/** Read the URL `?market=` param, returning null if absent / invalid. */
function readUrlSlug(): MarketSlug | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('market');
  if (!raw) return null;
  const match = MARKETS.find((m) => m.slug === raw);
  return match ? (raw as MarketSlug) : null;
}

interface MarketProviderProps {
  children: ReactNode;
  /** Optional override — useful for tests / Storybook. */
  initialSlug?: MarketSlug;
}

export function MarketProvider({ children, initialSlug }: MarketProviderProps) {
  // Resolve initial slug: prop > URL > localStorage > default.
  const [slug, setSlug] = useState<MarketSlug>(() => {
    if (initialSlug) return initialSlug;
    return readUrlSlug() ?? readStoredSlug() ?? DEFAULT_MARKET_SLUG;
  });

  // Persist to localStorage on change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, slug);
    } catch {
      // localStorage can throw in private-browsing mode — fail silently,
      // the in-memory state still works for the session.
    }
  }, [slug]);

  const value = useMemo<MarketContextValue>(
    () => ({
      market: getMarket(slug),
      setMarket: (next: MarketSlug) => setSlug(next),
      markets: MARKETS,
    }),
    [slug],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

/**
 * Read the active market. Throws (in dev) if not wrapped in `<MarketProvider>`
 * so we catch missing-provider mistakes early.
 */
export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error('useMarket() must be called inside a <MarketProvider>.');
  }
  return ctx;
}
