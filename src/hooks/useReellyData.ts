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

/** List of off-plan projects, optionally filtered by Reelly country name. */
export function useReellyProjects(opts: {
  country: string | null;
  limit?: number;
  offset?: number;
} = { country: null }) {
  return useQuery({
    queryKey: ['reelly-projects', opts.country ?? 'all', opts.limit ?? 24, opts.offset ?? 0],
    queryFn: () =>
      getJson<ReellyListResponse>(
        reellyListUrl({ country: opts.country, limit: opts.limit ?? 24, offset: opts.offset ?? 0 }),
      ),
    staleTime: 10 * 60 * 1000,
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
