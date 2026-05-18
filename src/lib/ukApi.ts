/**
 * ukApi — single helper for constructing uk-proxy URLs.
 *
 * Mirrors the dld-proxy / reelly-proxy URL conventions. All UK data
 * fetching in the frontend should go through these helpers so we can
 * change the proxy contract in one place.
 *
 * Backed by HM Land Registry's UKHPI (UK House Price Index) — free,
 * OGL-licensed, redistributable. See `supabase/functions/uk-proxy/`.
 */

const BASE = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uk-proxy`;

/** Region slugs supported by the proxy (must match its ALLOWED_REGIONS). */
export type UkRegionSlug =
  | 'united-kingdom'
  | 'england'
  | 'scotland'
  | 'wales'
  | 'northern-ireland'
  | 'london'
  | 'north-east'
  | 'north-west'
  | 'yorkshire-and-the-humber'
  | 'east-midlands'
  | 'west-midlands'
  | 'east'
  | 'south-east'
  | 'south-west'
  | 'manchester'
  | 'birmingham'
  | 'edinburgh'
  | 'bristol';

/** Shape returned by `ukhpi-region` and `ukhpi-region-history`. */
export interface UkhpiPoint {
  averagePrice: number | null;
  housePriceIndex: number | null;
  salesVolume: number | null;
  averagePriceDetached: number | null;
  averagePriceSemiDetached: number | null;
  averagePriceTerraced: number | null;
  averagePriceFlatMaisonette: number | null;
  percentageChangeMonth: number | null;
  percentageChangeYear: number | null;
  refMonth: string;
  refRegion: string;
}

export interface UkhpiSnapshotEntry extends UkhpiPoint {
  region: string;
  missing?: boolean;
}

/** Single-month single-region UKHPI snapshot. */
export function ukhpiRegionUrl(opts: { region: UkRegionSlug; month?: string }): string {
  const params = new URLSearchParams({
    entity: 'landregistry',
    dataset: 'ukhpi-region',
    region: opts.region,
  });
  if (opts.month) params.set('month', opts.month);
  return `${BASE()}?${params.toString()}`;
}

/** Last N months for a region (defaults to 12). */
export function ukhpiRegionHistoryUrl(opts: { region: UkRegionSlug; months?: number }): string {
  const params = new URLSearchParams({
    entity: 'landregistry',
    dataset: 'ukhpi-region-history',
    region: opts.region,
    months: String(opts.months ?? 12),
  });
  return `${BASE()}?${params.toString()}`;
}

/** Most-recent-month across a list of regions (defaults to a curated 10). */
export function ukhpiRegionsSnapshotUrl(opts: { regions?: UkRegionSlug[] } = {}): string {
  const params = new URLSearchParams({
    entity: 'landregistry',
    dataset: 'ukhpi-regions-snapshot',
  });
  if (opts.regions && opts.regions.length > 0) {
    params.set('regions', opts.regions.join(','));
  }
  return `${BASE()}?${params.toString()}`;
}
