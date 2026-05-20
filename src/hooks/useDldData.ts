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

/** Map our app-side filter values to DLD column literals. */
function bedsToRoomsEn(beds: string | null | undefined): string | null {
  if (!beds || beds === 'Any') return null;
  if (beds === 'Studio') return 'Studio';
  // App-side labels: "1 Bed" / "2 Beds" / etc. → DLD rooms_en: "1 B/R" / "2 B/R" …
  const n = parseInt(beds, 10);
  if (!isFinite(n) || n <= 0) return null;
  return `${n} B/R`;
}

function statusToRegTypeEn(status: string | null | undefined): string | null {
  if (!status || status === 'Any') return null;
  if (status === 'Ready')    return 'Existing Properties';
  if (status === 'Off-Plan') return 'Off-plan Properties';
  return null;
}

function propTypeToSubTypeEn(t: string | null | undefined): string | null {
  if (!t || t === 'Any') return null;
  if (t === 'Apartment')   return 'Flat';
  if (t === 'Villa')       return 'Villa';
  if (t === 'Townhouse')   return 'Townhouse';
  if (t === 'Penthouse')   return 'Penthouse';
  return null;
}

export interface BuildingTxFilters {
  beds?: string;
  /** 'sales' | 'rental' — DLD residential only has Sales today. */
  mode?: string;
  /** 'Ready' | 'Off-Plan' | 'Any'. */
  status?: string;
  /** 'Apartment' | 'Villa' | 'Townhouse' | 'Penthouse'. */
  type?: string;
}

export interface BuildingTransaction {
  transaction_id: string;
  date: string;
  /** AED. */
  price: number | null;
  /** AED per sqft. */
  pricePerSqft: number | null;
  rooms: string | null;
  subType: string | null;
  regType: string | null;
  area: string | null;
  building: string | null;
  procedureArea: number | null;
}

/**
 * Live DLD transactions for a specific building, filtered by the search
 * criteria the user picked on the home page (Beds / Sale-Rent / Type /
 * Status). Returns the 25 most recent matching rows.
 *
 * Note: DLD's public dataset is Sales + Mortgages only. Rentals aren't
 * available — when mode === 'rental' we return null + a "not available"
 * signal in `error` so the UI can show the right message.
 */
export function useDldBuildingTransactions(
  buildingName: string | null | undefined,
  filters: BuildingTxFilters,
): { data: BuildingTransaction[] | null; isLoading: boolean; modeUnavailable: boolean } {
  const modeUnavailable = filters.mode === 'rental';

  const query = useQuery({
    queryKey: [
      'dld-building-tx', buildingName ?? '',
      filters.beds ?? '*', filters.mode ?? '*',
      filters.status ?? '*', filters.type ?? '*',
    ],
    queryFn: async (): Promise<BuildingTransaction[]> => {
      if (!buildingName || modeUnavailable) return [];
      const safe = buildingName.replace(/'/g, "''");
      const clauses: string[] = [`building_name_en like '%${safe}%'`];

      const rooms = bedsToRoomsEn(filters.beds);
      if (rooms) clauses.push(`rooms_en='${rooms}'`);
      const regType = statusToRegTypeEn(filters.status);
      if (regType) clauses.push(`reg_type_en='${regType}'`);
      const subType = propTypeToSubTypeEn(filters.type);
      if (subType) clauses.push(`property_sub_type_en='${subType}'`);
      // mode is implicitly Sales (DLD residential dataset is Sales +
      // Mortgages; we filter to Sales to keep the page consistent).
      clauses.push(`trans_group_en='Sales'`);

      const filter = clauses.join(' AND ');
      const params = new URLSearchParams({
        entity: 'dld',
        dataset: 'dld_transactions-open-api',
        filter,
        limit: '25',
        order_by: 'instance_date',
        order_dir: 'desc',
      });
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dld-proxy?${params.toString()}`;
      const json = await getJson<DldListResponse>(url);
      const rows = json?.results ?? [];
      return rows.map((r) => ({
        transaction_id: r.transaction_id,
        date: r.instance_date,
        price: r.actual_worth ?? null,
        pricePerSqft: r.meter_sale_price ?? null,
        rooms: (r as Record<string, unknown>).rooms_en as string ?? null,
        subType: (r as Record<string, unknown>).property_sub_type_en as string ?? null,
        regType: (r as Record<string, unknown>).reg_type_en as string ?? null,
        area: r.area_name_en,
        building: r.building_name_en,
        procedureArea: (r as Record<string, unknown>).procedure_area as number ?? null,
      }));
    },
    enabled: !!buildingName && !modeUnavailable,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    modeUnavailable,
  };
}

/* ─── Rentals (DLD Ejari contracts) ───────────────────────────────── */

/**
 * Map our app-side beds value to DLD Ejari property sub-type.
 *   App: "Studio" / "1 Bed" / "2 Beds" / "3 Beds" / "4 Beds" / "5+ Beds"
 *   DLD: "Studio" / "1 bed rooms+hall" / "2 bed rooms+hall" / …
 *
 * 5+ collapses to "4 bed rooms+hall" upper bound (rentals dataset
 * doesn't cleanly support "5+" as a single value).
 */
function bedsToEjariSubType(beds: string | null | undefined): string | null {
  if (!beds || beds === 'Any') return null;
  if (beds === 'Studio') return 'Studio';
  const n = parseInt(beds, 10);
  if (!isFinite(n) || n <= 0) return null;
  return `${n} bed rooms+hall`;
}

export interface AreaRental {
  contract_id: string;
  startDate: string;
  endDate: string;
  /** AED per year. */
  annualAmount: number | null;
  subType: string | null;
  propertyType: string | null;
  area: string | null;
  actualAreaSqm: number | null;
  isNew: boolean;
}

/**
 * Live DLD rental contracts for an area + optional bedroom filter.
 * Returns the 25 most-recent contracts (registered/renewed).
 *
 * NOTE: DLD's rental dataset does NOT carry `building_name_en`. We
 * can filter by area, bedrooms, property type — but not per building.
 * Callers should warn the user when they were drilling into a building.
 */
export function useDldAreaRentals(
  areaName: string | null | undefined,
  filters: { beds?: string; type?: string },
) {
  return useQuery({
    queryKey: ['dld-area-rentals', areaName ?? '', filters.beds ?? '*', filters.type ?? '*'],
    queryFn: async (): Promise<AreaRental[]> => {
      if (!areaName) return [];
      const safe = areaName.replace(/'/g, "''");
      const clauses: string[] = [
        `area_name_en='${safe}'`,
        `property_usage_en='Residential'`,
      ];
      const subType = bedsToEjariSubType(filters.beds);
      if (subType) clauses.push(`ejari_property_sub_type_en='${subType}'`);
      const propType = propTypeToSubTypeEn(filters.type);
      if (propType && propType !== 'Penthouse') {
        // DLD rentals use the broader ejari_property_type_en (Flat/Villa/…).
        clauses.push(`ejari_property_type_en='${propType}'`);
      }
      const params = new URLSearchParams({
        entity: 'dld',
        dataset: 'dld_rent_contracts-open-api',
        filter: clauses.join(' AND '),
        limit: '25',
        order_by: 'contract_start_date',
        order_dir: 'desc',
      });
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dld-proxy?${params.toString()}`;
      const json = await getJson<{ results: Array<Record<string, unknown>> }>(url);
      const rows = json?.results ?? [];
      return rows.map((r) => ({
        contract_id: String(r.contract_id),
        startDate: String(r.contract_start_date ?? ''),
        endDate: String(r.contract_end_date ?? ''),
        annualAmount: typeof r.annual_amount === 'number' ? r.annual_amount : null,
        subType: (r.ejari_property_sub_type_en as string) ?? null,
        propertyType: (r.ejari_property_type_en as string) ?? null,
        area: (r.area_name_en as string) ?? null,
        actualAreaSqm: typeof r.actual_area === 'number' ? r.actual_area : null,
        isNew: r.contract_reg_type_en === 'New',
      }));
    },
    enabled: !!areaName,
    staleTime: 5 * 60 * 1000,
  });
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
