/**
 * useDldMonthlyTrend — Dubai-wide monthly price trend, backed by
 * `public.dld_monthly_aggregates` + the `get_dld_monthly_trend` RPC.
 *
 * Sibling of useUkRegionHistory / useFredSeries on the UK + US pages,
 * powers the "UAE 24-month price trend" chart on MarketIntelligence.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DldMonthlyPoint {
  month: string;       // YYYY-MM
  sales_count: number;
  total_aed: number;
  avg_psqft: number | null;
}

/**
 * Pull the monthly trend for a given area, or Dubai-wide when `area`
 * is empty / undefined. The RPC accepts an area name verbatim
 * (case-sensitive, matches DLD's `area_name_en`).
 */
export function useDldMonthlyTrend(months = 24, area?: string | null) {
  return useQuery({
    queryKey: ['dld-monthly-trend', months, area ?? '__all__'],
    queryFn: async (): Promise<DldMonthlyPoint[]> => {
      const { data, error } = await supabase.rpc('get_dld_monthly_trend', {
        p_months: months,
        p_area: area || null,
      });
      if (error) {
        console.error('[dld-monthly-trend] rpc error', error);
        return [];
      }
      type Row = { month: string; sales_count: number; total_aed: number | string; avg_psqft: number | string | null };
      const rows = ((data ?? []) as Row[]).map(r => ({
        month: r.month,
        sales_count: Number(r.sales_count) || 0,
        total_aed: Number(r.total_aed) || 0,
        avg_psqft: r.avg_psqft == null ? null : Number(r.avg_psqft),
      }));
      // RPC returns DESC by month; reverse to oldest → newest for charts.
      return rows.sort((a, b) => a.month.localeCompare(b.month));
    },
    staleTime: 12 * 60 * 60 * 1000, // 12h — refreshed nightly
  });
}
