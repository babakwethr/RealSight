/**
 * useTickerData — hooks that feed the live market ticker.
 *
 * Each hook is a thin TanStack Query wrapper around a Supabase read.
 * Cached for 5 min and silently refetched in the background; we do NOT
 * refetch on focus (DLD doesn't update minute-to-minute, and refetching
 * every tab switch would burn quota).
 *
 * All hooks return a normalised shape so the tile components stay simple:
 *   { items: T[], isLoading: boolean }
 *
 * Consumers: src/components/ticker/MarketTicker.tsx
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { classifyArea, type Signal } from '@/lib/signals';

const FIVE_MIN = 5 * 60 * 1000;

const sharedOpts = {
  staleTime: FIVE_MIN,
  refetchInterval: FIVE_MIN,
  refetchOnWindowFocus: false,
  retry: 1,
};

// ── Types ────────────────────────────────────────────────────────────────

export interface TickerDeal {
  id: string;
  area: string;
  propertyType: string;
  price: number;
  pricePerSqft: number;
  size: number;
  date: string; // ISO
  projectName: string | null;
}

export interface TickerArea {
  id: string;
  name: string;
  pricePerSqft: number;
  yoyDelta: number; // %
  rentalYield: number;
  demandScore: number;
}

export interface TickerIndex {
  month: string; // ISO
  avgPricePerSqft: number;
  yoyGrowth: number;
  txVolume: number;
  // MoM calculated against the previous month
  momDelta: number;
}

// ── Recent high-value deals ──────────────────────────────────────────────

export function useTickerRecentDeals(opts: { limit?: number; enabled?: boolean } = {}) {
  const limit = opts.limit ?? 10;
  const enabled = opts.enabled !== false;
  const { data, isLoading } = useQuery({
    queryKey: ['ticker-recent-deals', limit],
    enabled,
    ...sharedOpts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dld_transactions')
        .select('id, area_id, project_name, property_type, price, price_per_sqft, size_sqft, transaction_date, dld_areas!inner(name)')
        .order('transaction_date', { ascending: false })
        .order('price', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((tx: any): TickerDeal => ({
        id: tx.id,
        area: tx.dld_areas?.name ?? 'Dubai',
        propertyType: (tx.property_type ?? 'Property') as string,
        price: Number(tx.price ?? 0),
        pricePerSqft: Number(tx.price_per_sqft ?? 0),
        size: Number(tx.size_sqft ?? 0),
        date: tx.transaction_date,
        projectName: tx.project_name ?? null,
      }));
    },
  });
  return { items: data ?? [], isLoading };
}

// ── Area heartbeats ──────────────────────────────────────────────────────
// `sortBy: 'demand'` for "All Dubai" overviews;
// `sortBy: 'movers'` for the heatmap (biggest absolute YoY swings first).

export function useTickerAreaHeartbeats(opts: { limit?: number; sortBy?: 'demand' | 'movers'; enabled?: boolean } = {}) {
  const limit = opts.limit ?? 12;
  const sortBy = opts.sortBy ?? 'demand';
  const enabled = opts.enabled !== false;

  const { data, isLoading } = useQuery({
    queryKey: ['ticker-area-heartbeats', limit, sortBy],
    enabled,
    ...sharedOpts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dld_areas')
        .select('id, name, avg_price_per_sqft_current, avg_price_per_sqft_12m_ago, rental_yield_avg, demand_score, transaction_volume_30d')
        .order('demand_score', { ascending: false })
        .limit(40);
      if (error) throw error;

      const enriched: TickerArea[] = (data ?? [])
        .filter(a => a.name && (a.avg_price_per_sqft_current ?? 0) > 0)
        .map(a => {
          const past = a.avg_price_per_sqft_12m_ago ?? 0;
          const cur = a.avg_price_per_sqft_current ?? 0;
          const yoy = past > 0 ? ((cur - past) / past) * 100 : 0;
          return {
            id: a.id,
            name: a.name,
            pricePerSqft: Math.round(cur),
            yoyDelta: yoy,
            rentalYield: a.rental_yield_avg ?? 0,
            demandScore: a.demand_score ?? 0,
          };
        });

      const sorted = sortBy === 'movers'
        ? [...enriched].sort((a, b) => Math.abs(b.yoyDelta) - Math.abs(a.yoyDelta))
        : enriched; // already demand-desc from the SQL order

      return sorted.slice(0, limit);
    },
  });
  return { items: data ?? [], isLoading };
}

// ── Deals filtered to a specific area ────────────────────────────────────

export function useTickerAreaDeals(areaName: string | null | undefined, limit = 8) {
  const { data, isLoading } = useQuery({
    queryKey: ['ticker-area-deals', areaName, limit],
    enabled: !!areaName,
    ...sharedOpts,
    queryFn: async () => {
      // Two-step: resolve the area_id, then fetch its transactions.
      // (We can't do `.eq('dld_areas.name', x)` cleanly across the join.)
      const { data: areaRow } = await supabase
        .from('dld_areas')
        .select('id, name')
        .ilike('name', areaName!)
        .maybeSingle();
      if (!areaRow) return [];

      const { data, error } = await supabase
        .from('dld_transactions')
        .select('id, project_name, property_type, price, price_per_sqft, size_sqft, transaction_date')
        .eq('area_id', areaRow.id)
        .order('transaction_date', { ascending: false })
        .order('price', { ascending: false })
        .limit(limit);
      if (error) throw error;

      return (data ?? []).map((tx: any): TickerDeal => ({
        id: tx.id,
        area: areaRow.name,
        propertyType: (tx.property_type ?? 'Property') as string,
        price: Number(tx.price ?? 0),
        pricePerSqft: Number(tx.price_per_sqft ?? 0),
        size: Number(tx.size_sqft ?? 0),
        date: tx.transaction_date,
        projectName: tx.project_name ?? null,
      }));
    },
  });
  return { items: data ?? [], isLoading };
}

// ── Opportunity signals ──────────────────────────────────────────────────

export function useTickerSignals(opts: { limit?: number; enabled?: boolean } = {}) {
  const limit = opts.limit ?? 8;
  const enabled = opts.enabled !== false;
  const { data, isLoading } = useQuery({
    queryKey: ['ticker-signals', limit],
    enabled,
    ...sharedOpts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dld_areas')
        .select('name, avg_price_per_sqft_current, avg_price_per_sqft_12m_ago, rental_yield_avg, demand_score, transaction_volume_30d')
        .order('demand_score', { ascending: false });
      if (error) throw error;

      const classified = (data ?? [])
        .map(classifyArea)
        .filter((s): s is Signal => s !== null)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);
      return classified;
    },
  });
  return { items: data ?? [], isLoading };
}

// ── Dubai price index ────────────────────────────────────────────────────

export function useTickerPriceIndex(opts: { enabled?: boolean } = {}) {
  const enabled = opts.enabled !== false;
  const { data, isLoading } = useQuery({
    queryKey: ['ticker-price-index'],
    enabled,
    ...sharedOpts,
    queryFn: async (): Promise<TickerIndex | null> => {
      const { data, error } = await supabase
        .from('dubai_price_index_monthly')
        .select('month, avg_price_per_sqft, yoy_growth, tx_volume')
        .order('month', { ascending: false })
        .limit(2);
      if (error) throw error;
      if (!data || data.length === 0) return null;

      const latest = data[0];
      const prev = data[1];
      const cur = latest.avg_price_per_sqft ?? 0;
      const last = prev?.avg_price_per_sqft ?? 0;
      const mom = last > 0 ? ((cur - last) / last) * 100 : 0;

      return {
        month: latest.month,
        avgPricePerSqft: Math.round(cur),
        yoyGrowth: latest.yoy_growth ?? 0,
        txVolume: latest.tx_volume ?? 0,
        momDelta: mom,
      };
    },
  });
  return { item: data ?? null, isLoading };
}

// ── Watchlist updates (filtered to user's saved areas/projects) ──────────
// Reads the same localStorage key OpportunitySignals + Watchlist already use,
// so the ticker on /watchlist is consistent with what the user saved.

interface WatchlistItem {
  id: string;
  type: 'projects' | 'areas' | 'signals';
  name: string;
}

function readWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('realsight-watchlist');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useTickerWatchedUpdates(opts: { limit?: number; enabled?: boolean } = {}) {
  const limit = opts.limit ?? 8;
  const enabled = opts.enabled !== false;
  const watched = readWatchlist().filter(w => w.type === 'areas').map(w => w.name);

  const { data, isLoading } = useQuery({
    queryKey: ['ticker-watched-updates', watched.join(',')],
    enabled: enabled && watched.length > 0,
    ...sharedOpts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dld_areas')
        .select('id, name, avg_price_per_sqft_current, avg_price_per_sqft_12m_ago, rental_yield_avg, demand_score, transaction_volume_30d')
        .in('name', watched);
      if (error) throw error;

      return (data ?? []).map((a): TickerArea => {
        const past = a.avg_price_per_sqft_12m_ago ?? 0;
        const cur = a.avg_price_per_sqft_current ?? 0;
        const yoy = past > 0 ? ((cur - past) / past) * 100 : 0;
        return {
          id: a.id,
          name: a.name,
          pricePerSqft: Math.round(cur),
          yoyDelta: yoy,
          rentalYield: a.rental_yield_avg ?? 0,
          demandScore: a.demand_score ?? 0,
        };
      }).slice(0, limit);
    },
  });
  return { items: data ?? [], isLoading };
}
