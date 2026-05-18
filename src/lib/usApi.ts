/**
 * usApi — single helper for constructing us-proxy URLs.
 *
 * Mirrors dld-proxy / uk-proxy / reelly-proxy conventions. Centralises
 * all US data fetching in the frontend.
 *
 * Backed by NYC OpenData + Cook County + FRED + HUD + Census. See
 * `supabase/functions/us-proxy/index.ts` for the full source mix.
 */

const BASE = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/us-proxy`;

export type NycBorough = 'manhattan' | 'bronx' | 'brooklyn' | 'queens' | 'staten-island';

/** Shape of a single NYC sale record (subset of the OpenData schema). */
export interface NycSale {
  borough: string;
  neighborhood: string;
  building_class_category: string;
  address: string;
  apartment_number?: string;
  zip_code: string;
  residential_units?: string;
  total_units?: string;
  land_square_feet?: string;
  gross_square_feet?: string;
  year_built?: string;
  sale_price: string;
  sale_date: string;
  latitude?: string;
  longitude?: string;
}

export interface ChicagoSale {
  pin: string;
  year: string;
  township_code?: string;
  nbhd?: string;
  class: string;
  sale_date: string;
  sale_price: string;
  deed_type?: string;
}

/** NYC sales — most recent first. Default borough = manhattan. */
export function usNycSalesUrl(opts: {
  borough?: NycBorough;
  limit?: number;
  minPrice?: number;
} = {}): string {
  const params = new URLSearchParams({
    entity: 'nyc',
    dataset: 'sales',
    borough: opts.borough ?? 'manhattan',
    limit: String(opts.limit ?? 20),
  });
  if (opts.minPrice) params.set('min_price', String(opts.minPrice));
  return `${BASE()}?${params.toString()}`;
}

/** Chicago (Cook County) sales — most recent first. */
export function usChicagoSalesUrl(opts: { limit?: number; minPrice?: number } = {}): string {
  const params = new URLSearchParams({
    entity: 'chicago',
    dataset: 'sales',
    limit: String(opts.limit ?? 20),
  });
  if (opts.minPrice) params.set('min_price', String(opts.minPrice));
  return `${BASE()}?${params.toString()}`;
}

/**
 * FRED macro time-series.
 * Common series ids:
 *   MORTGAGE30US  — 30-year fixed mortgage rate (weekly)
 *   CSUSHPINSA    — Case-Shiller US National HPI
 *   MSPUS         — Median sales price of US houses (quarterly)
 *   HOUST         — Housing starts
 *   RRVRUSQ156N   — Rental vacancy rate
 */
export function usFredObservationsUrl(opts: {
  seriesId: string;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}): string {
  const params = new URLSearchParams({
    entity: 'fred',
    dataset: 'observations',
    series_id: opts.seriesId,
    limit: String(opts.limit ?? 12),
    sort_order: opts.sortOrder ?? 'desc',
  });
  return `${BASE()}?${params.toString()}`;
}
