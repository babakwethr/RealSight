/**
 * useDldData — DLD (Dubai Land Department) data hooks via the dld-proxy
 * Supabase edge function. Backed by the UAE Lambda relay (DLD's gateway
 * is geo-restricted to UAE IPs).
 *
 * v1 only exposes a building-search hook used by the home search bar.
 * More hooks (per-area metrics, per-building transaction history) will
 * grow here as we land more DLD-backed surfaces.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DldTransactionRow {
  transaction_id: string;
  instance_date: string;
  building_name_en: string | null;
  project_name_en: string | null;
  area_name_en: string | null;
  area_id: number | null;
  actual_worth: number | null;
  meter_sale_price: number | null;
}

interface DldListResponse {
  results: DldTransactionRow[];
}

async function getJson<T>(url: string): Promise<T | null> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export interface DldBuildingMatch {
  /** Stable key (building_name_en — deduped). */
  buildingName: string;
  /** Project the building rolls up to (e.g. "Marina Promenade" → many towers). */
  projectName: string | null;
  /** DLD area name (e.g. "Dubai Marina"). */
  areaName: string | null;
  /** Number of recent transactions that matched in this batch — gives a
   *  rough activity signal we can show as a hint in the dropdown. */
  recentTransactions: number;
}

function buildDldUrl(filter: string, limit: number): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const params = new URLSearchParams({
    entity: 'dld',
    dataset: 'dld_transactions-open-api',
    filter,
    limit: String(limit),
    order_by: 'instance_date',
    order_dir: 'desc',
  });
  return `${supabaseUrl}/functions/v1/dld-proxy?${params.toString()}`;
}

/**
 * Search DLD residential transactions for buildings matching the query.
 * Deduplicates rows to unique building names + bundles area + activity.
 *
 * Implementation note: DDA's filter syntax is SQL-like.
 *   building_name_en like '%foo%'
 *
 * We send TWO requests in parallel — one matching building_name_en, one
 * matching project_name_en — and merge the unique results client-side.
 * That catches both individual towers and umbrella projects.
 */
export function useDldBuildingSearch(query: string, opts: { limit?: number; enabled?: boolean } = {}) {
  const limit = opts.limit ?? 25;
  const enabled = (opts.enabled ?? true) && query.trim().length >= 2;
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['dld-building-search', trimmed, limit],
    queryFn: async (): Promise<DldBuildingMatch[]> => {
      // Escape single quotes (rare in building names but cheap to guard).
      const safe = trimmed.replace(/'/g, "''");
      const byBuilding = getJson<DldListResponse>(
        buildDldUrl(`building_name_en like '%${safe}%'`, limit),
      );
      const byProject = getJson<DldListResponse>(
        buildDldUrl(`project_name_en like '%${safe}%'`, limit),
      );
      const [a, b] = await Promise.all([byBuilding, byProject]);
      const rows = [...(a?.results ?? []), ...(b?.results ?? [])];

      // Dedupe by building name, keep the most-recent area + project +
      // count occurrences for the activity hint.
      const map = new Map<string, DldBuildingMatch>();
      for (const r of rows) {
        const key = r.building_name_en?.trim();
        if (!key) continue;
        const existing = map.get(key);
        if (existing) {
          existing.recentTransactions += 1;
        } else {
          map.set(key, {
            buildingName: key,
            projectName: r.project_name_en?.trim() ?? null,
            areaName: r.area_name_en?.trim() ?? null,
            recentTransactions: 1,
          });
        }
      }
      return Array.from(map.values()).slice(0, 8);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
