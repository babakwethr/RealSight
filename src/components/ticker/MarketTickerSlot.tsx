/**
 * MarketTickerSlot — page-aware switch that decides which ticker
 * (if any) to render. Mounted once in AppLayout below the upgrade strip.
 *
 * Suppression rules:
 *   • Personal pages (Portfolio, Compare, Payments, Documents, Updates,
 *     Account, Billing) — no ticker. The user is looking at their own
 *     finances, not the market.
 *   • Admin pages (/admin/*) — no ticker. Adviser back-office.
 *   • Onboarding / login / setup-wizard — no ticker.
 *   • AI / utility (Concierge) — no ticker.
 *   • Marketing routes are handled by *not mounting this component on
 *     the public layout* — AppLayout wraps authenticated pages only.
 *
 * Per-page source map: see /Users/babak/.claude/plans/buzzing-rolling-grove.md.
 */
import { useLocation } from 'react-router-dom';
import { MarketTicker, type TickerSource } from './MarketTicker';

// Paths where we explicitly DO NOT render a ticker. Match either exact
// or prefix (so `/admin` matches `/admin/investors/...` etc.).
const SUPPRESS_PATHS = [
  '/portfolio',
  '/compare',
  '/payments',
  '/documents',
  '/updates',
  '/account',
  '/billing',
  '/concierge',
  '/admin',
  '/onboarding',
  '/setup-wizard',
  '/login',
  '/reset-password',
  '/auth/callback',
  // Founder feedback (28 Apr 2026): Deal Analyzer is a focused tool —
  // the user is mid-task entering numbers; a moving ticker pulls
  // attention away. Watchlist is a personal list, not a market view.
  '/deal-analyzer',
  '/watchlist',
];

function isSuppressed(pathname: string): boolean {
  return SUPPRESS_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

interface Resolved {
  source: TickerSource;
  areaName?: string;
}

function resolveTickerSource(pathname: string, search: string): Resolved | null {
  // Dashboard / home — latest deals, the "first impression" feed.
  if (pathname === '/dashboard') return { source: 'recent-deals' };

  // Market intelligence — area heartbeats, but if drilled into a single
  // area, switch to that area's deals.
  if (pathname === '/market-intelligence') {
    const params = new URLSearchParams(search);
    const area = params.get('area');
    if (area) return { source: 'area-deals', areaName: area };
    return { source: 'area-heartbeats' };
  }

  // Heatmap — biggest movers (largest absolute YoY change).
  if (pathname === '/heatmap') return { source: 'movers' };

  // Market pulse — the richest mix.
  if (pathname === '/market-pulse') return { source: 'mixed' };

  // Opportunity signals — the signals feed.
  if (pathname === '/opportunity-signals') return { source: 'signals' };

  // New launches — recent deals (off-plan context).
  if (pathname === '/projects' || pathname.startsWith('/projects/')) return { source: 'recent-deals' };

  // Anything else — no ticker.
  // (Deal Analyzer and Watchlist are intentionally suppressed; see
  // SUPPRESS_PATHS above.)
  return null;
}

export function MarketTickerSlot() {
  const loc = useLocation();
  const pathname = loc.pathname;

  if (isSuppressed(pathname)) return null;

  const resolved = resolveTickerSource(pathname, loc.search);
  if (!resolved) return null;

  // Key by source so the component remounts (and refreshes its data
  // dispatch) when the user navigates between data pages with
  // different feeds — clean state transition, no stale tiles flashing.
  return (
    <MarketTicker
      key={`${resolved.source}-${resolved.areaName ?? ''}`}
      source={resolved.source}
      areaName={resolved.areaName}
    />
  );
}
