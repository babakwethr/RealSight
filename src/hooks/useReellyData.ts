/**
 * useReellyData — shared TanStack hooks for the Reelly off-plan API.
 *
 * The 4 list callers (Home, TopPicks, admin/Inventory, public/Projects)
 * each have their own fetch logic — kept for backward-compatibility.
 * New surfaces (like /off-plan) should use these hooks instead.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { reellyListUrl, reellyDetailUrl } from '@/lib/reellyApi';
import type { ReellyProject } from '@/types/reelly';

async function getJson<T>(url: string): Promise<T | null> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

interface ReellyListResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: ReellyProject[];
  fallback?: boolean;
}

/** Filter set the OffPlan page uses (PR 4). */
export interface ReellyProjectFilters {
  country: string | null;
  /** Free-text search across name + developer + district. */
  searchQuery?: string;
  /** Comma-separated bedroom counts (e.g. "1,2,3"). */
  bedrooms?: string;
  /** sale_status filter: on_sale / presale / announced / out_of_stock. */
  saleStatus?: string;
  /** Min unit price (Reelly's native currency for the project). */
  unitPriceFrom?: number;
  /** Max unit price. */
  unitPriceTo?: number;
  /** Sort: "-completion_datetime" (newest), "min_price", "-min_price". */
  ordering?: string;
}

/** List of off-plan projects with optional filters. Used by /off-plan. */
export function useReellyProjects(opts: ReellyProjectFilters & {
  limit?: number;
  offset?: number;
}) {
  const {
    country, searchQuery, bedrooms, saleStatus, unitPriceFrom, unitPriceTo,
    ordering, limit = 24, offset = 0,
  } = opts;
  return useQuery({
    // queryKey includes every filter so React Query refetches when any
    // changes. Falsy values normalised to '*' so the key stays stable.
    queryKey: [
      'reelly-projects',
      country ?? 'all',
      searchQuery ?? '*',
      bedrooms ?? '*',
      saleStatus ?? '*',
      unitPriceFrom ?? '*',
      unitPriceTo ?? '*',
      ordering ?? '*',
      limit, offset,
    ],
    queryFn: () =>
      getJson<ReellyListResponse>(
        reellyListUrl({
          country, limit, offset,
          searchQuery, bedrooms, saleStatus, unitPriceFrom, unitPriceTo, ordering,
        }),
      ),
    staleTime: 5 * 60 * 1000,
  });
}

/** Single project detail. */
export function useReellyProject(id: string | number | null | undefined) {
  return useQuery({
    queryKey: ['reelly-project', id ?? null],
    queryFn: () => id == null ? Promise.resolve(null) : getJson<ReellyProject>(reellyDetailUrl(id)),
    enabled: id != null,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Free-text search across Reelly's catalogue (project name, developer,
 * district). Backed by Reelly's `search_query` parameter — server-side
 * search across all 1,867 UAE projects (or whatever country is passed).
 *
 * Use this for the autocomplete dropdown on each market home. Returns
 * up to `limit` matches.
 *
 * NOTE: caller is responsible for debouncing — fire this only when the
 * user has paused typing for ~250-300ms. We don't debounce inside the
 * hook so the caller can decide.
 */
export function useReellySearch(opts: {
  query: string;
  country: string | null;
  limit?: number;
  enabled?: boolean;
}) {
  const enabled = (opts.enabled ?? true) && opts.query.trim().length >= 2;
  return useQuery({
    queryKey: ['reelly-search', opts.country ?? 'all', opts.query, opts.limit ?? 8],
    queryFn: () =>
      getJson<ReellyListResponse>(
        reellyListUrl({
          country: opts.country,
          limit: opts.limit ?? 8,
          searchQuery: opts.query.trim(),
        }),
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
