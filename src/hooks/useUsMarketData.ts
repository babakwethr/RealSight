/**
 * useUsMarketData — TanStack Query hooks for the US market data fabric.
 * Wraps the us-proxy edge function. See `supabase/functions/us-proxy/`.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  usNycSalesUrl,
  usChicagoSalesUrl,
  usFredObservationsUrl,
  usMetrosSnapshotUrl,
  type NycBorough,
  type NycSale,
  type ChicagoSale,
  type UsMetroSnapshot,
} from '@/lib/usApi';

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

/** NYC recent sales — most recent first, default manhattan. */
export function useNycSales(opts: {
  borough?: NycBorough;
  limit?: number;
  minPrice?: number;
} = {}) {
  return useQuery({
    queryKey: ['us-nyc-sales', opts.borough ?? 'manhattan', opts.limit ?? 20, opts.minPrice ?? 0],
    queryFn: () =>
      getJson<{
        source: string;
        borough: string;
        count: number;
        sales: NycSale[];
      }>(usNycSalesUrl(opts)),
    staleTime: 60 * 60 * 1000, // 1h
  });
}

/** Chicago / Cook County recent sales. */
export function useChicagoSales(opts: { limit?: number; minPrice?: number } = {}) {
  return useQuery({
    queryKey: ['us-chicago-sales', opts.limit ?? 20, opts.minPrice ?? 0],
    queryFn: () =>
      getJson<{
        source: string;
        count: number;
        sales: ChicagoSale[];
      }>(usChicagoSalesUrl(opts)),
    staleTime: 60 * 60 * 1000,
  });
}

/** FRED macro time-series. Requires FRED_API_KEY in Supabase secrets. */
export function useFredSeries(seriesId: string, limit = 12) {
  return useQuery({
    queryKey: ['us-fred', seriesId, limit],
    queryFn: () =>
      getJson<{
        source: string;
        observations?: Array<{ date: string; value: string }>;
        fallback?: boolean;
      }>(usFredObservationsUrl({ seriesId, limit })),
    staleTime: 60 * 60 * 1000,
  });
}

/** 20 Case-Shiller metros — latest HPI + 12-month YoY change for each. */
export function useUsMetrosSnapshot() {
  return useQuery({
    queryKey: ['us-metros-snapshot'],
    queryFn: () =>
      getJson<{
        source: string;
        metros: UsMetroSnapshot[];
        fallback?: boolean;
      }>(usMetrosSnapshotUrl()),
    staleTime: 6 * 60 * 60 * 1000, // Case-Shiller updates monthly
  });
}
