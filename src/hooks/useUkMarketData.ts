/**
 * useUkMarketData — TanStack Query hooks for the UK market data fabric.
 *
 * Wraps the uk-proxy edge function calls (HM Land Registry UKHPI).
 * Use `useUkRegion(region)` for a single region's snapshot, or
 * `useUkRegionsSnapshot()` for the home-page grid of major regions.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ukhpiRegionUrl,
  ukhpiRegionHistoryUrl,
  ukhpiRegionsSnapshotUrl,
  type UkRegionSlug,
  type UkhpiPoint,
  type UkhpiSnapshotEntry,
} from '@/lib/ukApi';

/** Common fetcher — uses anon JWT for the edge function. */
async function getJson<T>(url: string): Promise<T | null> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** Single region — most recent published month (or a specific month). */
export function useUkRegion(region: UkRegionSlug, month?: string) {
  return useQuery({
    queryKey: ['uk-ukhpi-region', region, month ?? 'latest'],
    queryFn: () => getJson<{ source: string } & UkhpiPoint>(ukhpiRegionUrl({ region, month })),
    staleTime: 6 * 60 * 60 * 1000, // 6h — UKHPI updates monthly
  });
}

/** N months of history for a region — for trend charts. */
export function useUkRegionHistory(region: UkRegionSlug, months = 12) {
  return useQuery({
    queryKey: ['uk-ukhpi-history', region, months],
    queryFn: () =>
      getJson<{ source: string; region: string; series: UkhpiPoint[] }>(
        ukhpiRegionHistoryUrl({ region, months }),
      ),
    staleTime: 6 * 60 * 60 * 1000,
  });
}

/** Most-recent-month across all major regions — for the UK home grid. */
export function useUkRegionsSnapshot(regions?: UkRegionSlug[]) {
  return useQuery({
    queryKey: ['uk-ukhpi-snapshot', regions?.join(',') ?? 'default'],
    queryFn: () =>
      getJson<{ source: string; regions: UkhpiSnapshotEntry[] }>(
        ukhpiRegionsSnapshotUrl({ regions }),
      ),
    staleTime: 6 * 60 * 60 * 1000,
  });
}
