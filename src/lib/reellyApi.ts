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
  /** Free-text search across project/developer/area name (Reelly's `search_query`). */
  searchQuery?: string;
  /** Multi-select developer ID(s) (comma-separated). */
  developer?: string;
  /** Comma-separated bedroom counts (e.g. "1,2"). */
  bedrooms?: string;
  /** Sale status filter (on_sale, presale, announced, out_of_stock, start_of_sales). */
  saleStatus?: string;
  /** Min price (in the project's native currency). */
  unitPriceFrom?: number;
  /** Max price (in the project's native currency). */
  unitPriceTo?: number;
  /** Sort order — Reelly's `ordering` param. */
  ordering?: string;
}): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const params = new URLSearchParams({
    path: 'clients/projects',
    limit: String(opts.limit),
    offset: String(opts.offset ?? 0),
  });
  if (opts.country) params.set('country', opts.country);
  if (opts.searchQuery) params.set('search_query', opts.searchQuery);
  if (opts.developer) params.set('developer', opts.developer);
  if (opts.bedrooms) params.set('bedrooms', opts.bedrooms);
  if (opts.saleStatus) params.set('sale_status', opts.saleStatus);
  if (opts.unitPriceFrom != null) params.set('unit_price_from', String(opts.unitPriceFrom));
  if (opts.unitPriceTo != null) params.set('unit_price_to', String(opts.unitPriceTo));
  if (opts.ordering) params.set('ordering', opts.ordering);
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
