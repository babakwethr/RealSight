/**
 * reellyApi — single helper for constructing reelly-proxy URLs.
 *
 * Centralises country filtering so the 4 list callers (Home, TopPicks,
 * Inventory, public Projects) stay consistent. When the active market is
 * UAE we filter `country=United Arab Emirates`. For US / UK / Spain we
 * either return an empty result (Reelly doesn't cover those markets) or
 * we fall through to the off-plan-only countries we genuinely advertise
 * (Bali, Phuket — surfaced in the dedicated /off-plan page, not the
 * country market list).
 *
 * NOTE: detail calls (`clients/projects/{id}`) don't need country
 * filtering — they identify a project by id. Use `reellyDetailUrl()`
 * for those.
 */

/** Top-level Reelly listing endpoint — projects in a given country. */
export function reellyListUrl(opts: {
  /** Reelly's `country` query value, or null for unfiltered. */
  country: string | null;
  /** Page size. */
  limit: number;
  /** Pagination offset. Defaults to 0. */
  offset?: number;
}): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const params = new URLSearchParams({
    path: 'clients/projects',
    limit: String(opts.limit),
    offset: String(opts.offset ?? 0),
  });
  if (opts.country) {
    params.set('country', opts.country);
  }
  return `${supabaseUrl}/functions/v1/reelly-proxy?${params.toString()}`;
}

/** Single project detail. */
export function reellyDetailUrl(id: string | number): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const params = new URLSearchParams({
    path: `clients/projects/${id}`,
  });
  return `${supabaseUrl}/functions/v1/reelly-proxy?${params.toString()}`;
}

/** Units for a specific project (paywalled today — returns 403). */
export function reellyUnitsUrl(id: string | number): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const params = new URLSearchParams({
    path: `clients/projects/${id}/units`,
  });
  return `${supabaseUrl}/functions/v1/reelly-proxy?${params.toString()}`;
}
