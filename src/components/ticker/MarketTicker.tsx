/**
 * MarketTicker — the Bloomberg-style scrolling bar.
 *
 * One component, source-driven:
 *
 *   <MarketTicker source="recent-deals" />
 *   <MarketTicker source="area-heartbeats" />
 *   <MarketTicker source="area-deals" areaName="JVC" />
 *   <MarketTicker source="movers" />
 *   <MarketTicker source="signals" />
 *   <MarketTicker source="mixed" />
 *   <MarketTicker source="watched-updates" />
 *
 * Behaviour:
 *   • Pulsing emerald dot + "DLD LIVE" badge on the left.
 *   • Marquee fills the rest, ~55s loop (slow, readable).
 *   • Pause on hover (desktop). Touch devices keep scrolling.
 *   • prefers-reduced-motion → no animation, scrollable instead.
 *   • Dismissible — × on the right, persists in localStorage.
 *   • Skeleton state with placeholder tiles to avoid layout shift.
 *
 * Accessibility:
 *   • aria-label="Live market ticker"
 *   • aria-live="off" — silent for screen readers (would be noise).
 */
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import Marquee from '@/components/ui/Marquee';
import { cn } from '@/lib/utils';
import {
  useTickerRecentDeals,
  useTickerAreaHeartbeats,
  useTickerAreaDeals,
  useTickerSignals,
  useTickerPriceIndex,
  useTickerWatchedUpdates,
  type TickerDeal,
  type TickerArea,
  type TickerIndex,
} from '@/hooks/useTickerData';
import type { Signal } from '@/lib/signals';
import {
  DealTile,
  AreaTile,
  SignalTile,
  IndexTile,
  SkeletonTile,
} from './TickerTiles';

const DISMISS_KEY = 'rs.ticker.dismissed';

export type TickerSource =
  | 'recent-deals'
  | 'area-heartbeats'
  | 'area-deals'      // requires `areaName`
  | 'movers'          // area heartbeats sorted by abs YoY
  | 'signals'
  | 'mixed'
  | 'watched-updates';

interface MarketTickerProps {
  source: TickerSource;
  areaName?: string;
}

// Helper — flatten a heterogeneous mix into a single React node array.
type MixedItem =
  | { kind: 'deal';   value: TickerDeal }
  | { kind: 'area';   value: TickerArea }
  | { kind: 'signal'; value: Signal }
  | { kind: 'index';  value: TickerIndex };

function renderTile(item: MixedItem, key: string): React.ReactNode {
  switch (item.kind) {
    case 'deal':   return <DealTile   key={key} deal={item.value}   />;
    case 'area':   return <AreaTile   key={key} area={item.value}   />;
    case 'signal': return <SignalTile key={key} signal={item.value} />;
    case 'index':  return <IndexTile  key={key} index={item.value}  />;
  }
}

export function MarketTicker({ source, areaName }: MarketTickerProps) {
  // Dismissal lives in localStorage. Read once on mount; tickers across
  // pages share the same flag so dismiss-once dismisses everywhere.
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  // Fetch the right feed. We call all hooks unconditionally (rules of
  // hooks) but each hook accepts `enabled` so only the source actually
  // used hits Supabase. Cached for 5min via TanStack Query.
  const wantRecentDeals  = source === 'recent-deals' || source === 'mixed';
  const wantHeartbeats   = source === 'area-heartbeats' || source === 'mixed';
  const wantMovers       = source === 'movers';
  const wantSignals      = source === 'signals' || source === 'mixed';
  const wantIndex        = source === 'mixed';
  const wantWatched      = source === 'watched-updates';

  const recentDeals = useTickerRecentDeals({ enabled: wantRecentDeals });
  const heartbeats  = useTickerAreaHeartbeats({ sortBy: 'demand', enabled: wantHeartbeats });
  const movers      = useTickerAreaHeartbeats({ sortBy: 'movers', enabled: wantMovers });
  const areaDeals   = useTickerAreaDeals(source === 'area-deals' ? areaName : null, 8);
  const signals     = useTickerSignals({ enabled: wantSignals });
  const priceIndex  = useTickerPriceIndex({ enabled: wantIndex });
  const watched     = useTickerWatchedUpdates({ enabled: wantWatched });

  // Build the list of items for the active source.
  const items: MixedItem[] = useMemo(() => {
    switch (source) {
      case 'recent-deals':
        return recentDeals.items.map(d => ({ kind: 'deal', value: d } as MixedItem));
      case 'area-heartbeats':
        return heartbeats.items.map(a => ({ kind: 'area', value: a } as MixedItem));
      case 'movers':
        return movers.items.map(a => ({ kind: 'area', value: a } as MixedItem));
      case 'area-deals':
        return areaDeals.items.map(d => ({ kind: 'deal', value: d } as MixedItem));
      case 'signals':
        return signals.items.map(s => ({ kind: 'signal', value: s } as MixedItem));
      case 'watched-updates':
        return watched.items.map(a => ({ kind: 'area', value: a } as MixedItem));
      case 'mixed': {
        // Round-robin so the eye gets variety: index → deal → signal → area → repeat
        const out: MixedItem[] = [];
        if (priceIndex.item) out.push({ kind: 'index', value: priceIndex.item });
        const max = Math.max(recentDeals.items.length, signals.items.length, heartbeats.items.length);
        for (let i = 0; i < max; i++) {
          if (recentDeals.items[i]) out.push({ kind: 'deal',   value: recentDeals.items[i] });
          if (signals.items[i])     out.push({ kind: 'signal', value: signals.items[i] });
          if (heartbeats.items[i])  out.push({ kind: 'area',   value: heartbeats.items[i] });
        }
        return out;
      }
    }
  }, [source, recentDeals.items, heartbeats.items, movers.items, areaDeals.items, signals.items, priceIndex.item, watched.items]);

  // Pick a representative loading state for the active source.
  const isLoading =
    (source === 'recent-deals'    && recentDeals.isLoading) ||
    (source === 'area-heartbeats' && heartbeats.isLoading) ||
    (source === 'movers'          && movers.isLoading) ||
    (source === 'area-deals'      && areaDeals.isLoading) ||
    (source === 'signals'         && signals.isLoading) ||
    (source === 'mixed'           && (recentDeals.isLoading || signals.isLoading || heartbeats.isLoading)) ||
    (source === 'watched-updates' && watched.isLoading);

  if (dismissed) return null;

  // Empty state: render nothing rather than a sad bar. Watched-updates
  // is the most likely empty case (user has nothing in their watchlist).
  if (!isLoading && items.length === 0) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  return (
    <div
      role="region"
      aria-label="Live market ticker"
      aria-live="off"
      className={cn(
        'relative flex items-stretch h-9 sm:h-10 border-b border-white/[0.06]',
        'overflow-hidden',
      )}
      style={{
        background: 'rgba(7, 4, 15, 0.72)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      }}
    >
      {/* Live badge — pinned left */}
      <div className="flex items-center gap-2 px-3 sm:px-4 shrink-0 border-r border-white/[0.06] bg-black/20">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-[#2effc0] opacity-75 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-[#18d6a4]" />
        </span>
        <span className="text-[9px] sm:text-[10px] font-black tracking-[0.18em] text-[#2effc0] uppercase whitespace-nowrap">
          DLD Live
        </span>
      </div>

      {/* Scrolling content */}
      <div className="relative flex-1 min-w-0 motion-reduce:overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center h-full">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonTile key={i} />)}
          </div>
        ) : (
          <Marquee
            pauseOnHover
            className="!p-0 h-full [--duration:55s] [--gap:1.25rem] motion-reduce:[animation:none] motion-reduce:flex motion-reduce:overflow-x-auto items-center"
            repeat={3}
          >
            {items.map((it, i) => renderTile(it, `${source}-${i}`))}
          </Marquee>
        )}
        {/* Edge fade — gives the feel of items sliding in/out cleanly */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8"
          style={{ background: 'linear-gradient(90deg, rgba(7,4,15,0.85), transparent)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8"
          style={{ background: 'linear-gradient(270deg, rgba(7,4,15,0.85), transparent)' }}
        />
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Dismiss live ticker"
        className="shrink-0 px-2 sm:px-3 text-white/35 hover:text-white/85 hover:bg-white/[0.04] transition-colors flex items-center justify-center border-l border-white/[0.06]"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
