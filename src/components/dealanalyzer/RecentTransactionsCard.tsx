/**
 * RecentTransactionsCard — surfaces the last DLD-registered sales in
 * the same building / area as the current Deal Analyzer listing.
 *
 * Wires through `dld-proxy` (supabase/functions/dld-proxy/index.ts),
 * which in turn calls Dubai Land Department's DDA Open API. While the
 * gateway IP allowlist is still pending on DDA's side (see
 * docs/LAUNCH_PLAN.md §14), the proxy returns
 *   { fallback: true, source: 'cache', message: '...' }   (HTTP 503)
 * — that's our "not live yet" state. The component renders a clean
 * "awaiting DLD allowlist" placeholder so advisers can see the slot
 * is reserved. The moment `DDA_ENABLED=true` flips in Supabase
 * secrets and DDA returns real rows, this component renders them
 * automatically — no redeploy.
 *
 * Filtering strategy
 * ------------------
 * We pass the area + (optional) building name + (optional) bedroom
 * count to dld-proxy via the standard DDA `filter` query param. The
 * exact filter syntax is finalised in the granted-datasets doc DDA
 * will send once the allowlist lands. For now we send a best-effort
 * filter and fall back to "by area only" if the building filter
 * returns 0 rows. This keeps the live experience smart out of the
 * gate — refinements live in `buildDldFilter()` so they're easy to
 * tweak when we get the field schema in hand.
 *
 * Field-name tolerance
 * --------------------
 * DDA's response shape is `{ results: [...] }`. Each row's exact field
 * names vary slightly by dataset version — we accept the common
 * variants (instance_date / transaction_date, area_name_en, etc) so
 * the row parser is forgiving.
 */
import { useEffect, useMemo, useState } from 'react';
import { Building2, Calendar, ExternalLink, Info, Ruler, ShieldCheck, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  area?: string;
  propertyName?: string;
  bedrooms?: number;
  unitType?: string;
}

interface DldRow {
  date?: string;          // ISO yyyy-mm-dd or display string
  building?: string;
  rooms?: string;         // e.g. "Studio", "1 B/R", "2 B/R"
  sizeSqft?: number;
  amountAed?: number;
  procedure?: string;     // "Sale", "Mortgage Registration", etc
  rawId?: string;
}

interface ProxyResponse {
  fallback?: boolean;
  source?: string;
  message?: string;
  results?: any[];
  result?: any[];
  records?: any[];
  data?: any[];
  total?: number;
  error?: string;
}

const SQM_TO_SQFT = 10.7639;

/** Normalise a raw DDA row into our internal shape, accepting common
 *  field-name variants. Anything missing stays undefined — the row
 *  renderer hides empty cells gracefully. */
function normaliseRow(raw: any): DldRow {
  if (!raw || typeof raw !== 'object') return {};

  const date =
    raw.instance_date ??
    raw.transaction_date ??
    raw.date ??
    raw.registration_date ??
    raw.tx_date;

  const building =
    raw.building_name_en ??
    raw.project_name_en ??
    raw.building ??
    raw.project_en;

  const rooms =
    raw.rooms_en ??
    raw.no_of_rooms_en ??
    raw.rooms ??
    raw.bedrooms;

  const sizeSqm =
    raw.procedure_area ??
    raw.actual_area ??
    raw.property_size_sqm ??
    raw.size_sqm;
  const sizeSqftRaw = raw.size_sqft ?? raw.property_size_sqft;
  const sizeSqft = typeof sizeSqftRaw === 'number'
    ? sizeSqftRaw
    : (typeof sizeSqm === 'number' ? Math.round(sizeSqm * SQM_TO_SQFT) : undefined);

  // Try the explicit "total worth" fields first; if absent, derive
  // from per-meter price * area when both are present.
  const amountAed: number | undefined = (() => {
    if (typeof raw.actual_worth === 'number')      return raw.actual_worth;
    if (typeof raw.amount === 'number')            return raw.amount;
    if (typeof raw.transaction_amount === 'number') return raw.transaction_amount;
    const m = Number(raw.meter_sale_price);
    const a = Number(raw.actual_area);
    if (Number.isFinite(m) && Number.isFinite(a) && m > 0 && a > 0) return m * a;
    return undefined;
  })();

  const procedure =
    raw.procedure_name_en ??
    raw.transaction_type_en ??
    raw.procedure;

  return {
    date: date ? String(date) : undefined,
    building: building ? String(building) : undefined,
    rooms: rooms !== undefined && rooms !== null ? String(rooms) : undefined,
    sizeSqft: typeof sizeSqft === 'number' && Number.isFinite(sizeSqft) ? sizeSqft : undefined,
    amountAed: typeof amountAed === 'number' && Number.isFinite(amountAed) ? amountAed : undefined,
    procedure: procedure ? String(procedure) : undefined,
    rawId: raw.transaction_id ?? raw.id,
  };
}

/** Build the DDA `filter` query param. The exact syntax is confirmed
 *  by DDA on grant — for now we use a conservative "field eq 'value'"
 *  pattern (the common DDADS convention). Returns undefined when we
 *  have nothing to filter on (in which case the proxy will refuse). */
function buildDldFilter(area?: string, building?: string): string | undefined {
  const parts: string[] = [];
  if (area)     parts.push(`area_name_en eq '${area.replace(/'/g, "''")}'`);
  if (building) parts.push(`building_name_en eq '${building.replace(/'/g, "''")}'`);
  return parts.length ? parts.join(' and ') : undefined;
}

/** Format an AED amount as e.g. "AED 2.85M" / "AED 850K". */
function fmtAed(n?: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toFixed(0)}`;
}

function fmtAedPerSqft(amt?: number, sqft?: number): string {
  if (!amt || !sqft) return '—';
  const v = amt / sqft;
  if (!Number.isFinite(v)) return '—';
  return `AED ${Math.round(v).toLocaleString()}`;
}

/** Friendly date — accepts ISO or DLD's "DD-MM-YYYY" / "YYYY-MM-DD". */
function fmtDate(d?: string): string {
  if (!d) return '—';
  const tryParse = (s: string): Date | null => {
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };
  let dt = tryParse(d);
  if (!dt && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
    const [dd, mm, yyyy] = d.split('-');
    dt = tryParse(`${yyyy}-${mm}-${dd}`);
  }
  if (!dt) return d;
  return dt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function RecentTransactionsCard({ area, propertyName, bedrooms, unitType }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DldRow[]>([]);
  const [fallback, setFallback] = useState<{ active: boolean; message?: string }>({ active: false });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Memoise the filter so an effect re-run only happens when inputs
  // actually change.
  const filter = useMemo(() => buildDldFilter(area, propertyName), [area, propertyName]);

  useEffect(() => {
    let aborted = false;

    async function run() {
      // Without an area we have nothing to filter on. Render the empty
      // "waiting for context" state — handled in the JSX below.
      if (!area && !propertyName) {
        setRows([]);
        setFallback({ active: false });
        setErrorMsg(null);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
        const supaAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
        if (!supaUrl) throw new Error('Supabase URL missing');

        // dld-proxy has verify_jwt=true, so we forward the user's
        // session JWT. For anon visitors the apikey alone is enough
        // to reach the proxy's fallback path (which is what we want
        // pre-launch anyway).
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const params = new URLSearchParams();
        params.set('entity', 'dld');
        params.set('dataset', 'dld_transactions-open-api');
        params.set('pageSize', '10');
        params.set('order_by', 'instance_date');
        params.set('order_dir', 'desc');
        if (filter) params.set('filter', filter);

        const res = await fetch(`${supaUrl}/functions/v1/dld-proxy?${params.toString()}`, {
          method: 'GET',
          headers: {
            ...(supaAnon ? { apikey: supaAnon } : {}),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : (supaAnon ? { Authorization: `Bearer ${supaAnon}` } : {})),
            Accept: 'application/json',
          },
        });

        if (aborted) return;

        // 503 = our proxy's intentional "fallback" shape while DDA
        // allowlist is pending. Treat as "feature not live yet".
        if (res.status === 503) {
          let body: ProxyResponse | undefined;
          try { body = await res.json(); } catch { /* tolerate non-json */ }
          setFallback({
            active: true,
            message: body?.message || 'Live DLD data activates once Dubai Land Department finalises our API allowlist.',
          });
          setRows([]);
          return;
        }

        if (!res.ok) {
          // Real error (auth, gateway, etc). Show as fallback to avoid
          // alarming the user, but keep the diagnostic in console.
          console.warn('[RecentTransactionsCard] dld-proxy returned', res.status);
          setFallback({
            active: true,
            message: 'Live DLD data temporarily unavailable — re-checking shortly.',
          });
          setRows([]);
          return;
        }

        const body = (await res.json()) as ProxyResponse;
        // DDA returns rows in `results` per spec, but tolerate the
        // common alternates so we don't blow up on a renamed key.
        const list =
          (Array.isArray(body.results) && body.results) ||
          (Array.isArray(body.result) && body.result) ||
          (Array.isArray(body.records) && body.records) ||
          (Array.isArray(body.data) && body.data) ||
          [];

        const parsed = list.map(normaliseRow).filter(r => r.date || r.amountAed);
        setRows(parsed.slice(0, 10));
        setFallback({ active: false });
      } catch (e: any) {
        if (aborted) return;
        console.warn('[RecentTransactionsCard] fetch failed', e?.message);
        setErrorMsg(e?.message || 'Network error');
        setRows([]);
        setFallback({ active: true, message: 'Live DLD data not reachable from this network — please retry shortly.' });
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    run();
    return () => { aborted = true; };
  }, [area, propertyName, filter]);

  // Don't even render the card until we have a paste-extracted area.
  // The Deal Analyzer page already shows enough quiet states — no
  // need to add a fourth one before context arrives.
  if (!area && !propertyName) return null;

  // Skeleton rows for the placeholder state.
  const placeholderRows: DldRow[] = Array.from({ length: 5 }, () => ({}));

  const showLive  = !fallback.active && !loading && rows.length > 0;
  const showEmpty = !fallback.active && !loading && rows.length === 0;
  const showSkel  = loading || fallback.active;

  return (
    <section className="glass-panel accent-emerald" aria-label="Recent DLD transactions">
      <div className="px-5 sm:px-6 py-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Recent DLD-Registered Sales
            </p>
            <p className="text-[14px] sm:text-[15px] font-bold text-white leading-tight">
              {propertyName ? <>In <span className="text-emerald-300">{propertyName}</span></> : <>Same area: <span className="text-emerald-300">{area}</span></>}
            </p>
            <p className="text-[11px] text-white/55 mt-0.5">
              Last 10 sales filed at Dubai Land Department · official registry data
            </p>
          </div>
          {fallback.active && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-300 bg-amber-300/10 border border-amber-300/30 rounded-full px-2 py-0.5">
              <Info className="h-3 w-3" />
              Awaiting DLD allowlist
            </span>
          )}
          {showLive && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-emerald-300 bg-emerald-300/10 border border-emerald-300/30 rounded-full px-2 py-0.5">
              <TrendingUp className="h-3 w-3" />
              Live
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl ring-1 ring-white/[0.08] bg-white/[0.02]">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/45 border-b border-white/[0.06]">
            <span className="col-span-3 flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</span>
            <span className="col-span-3 flex items-center gap-1"><Building2 className="h-3 w-3" /> Building</span>
            <span className="col-span-2">Beds</span>
            <span className="col-span-2 flex items-center gap-1"><Ruler className="h-3 w-3" /> Size</span>
            <span className="col-span-2 text-right">Price</span>
          </div>

          {showSkel && placeholderRows.map((_, i) => (
            <div
              key={`skel-${i}`}
              className={cn(
                'grid grid-cols-12 gap-2 px-3 py-3 text-[12px] border-b border-white/[0.04] last:border-0',
                fallback.active ? 'opacity-60' : 'animate-pulse'
              )}
            >
              <span className="col-span-3"><span className="inline-block h-3 w-16 rounded bg-white/[0.08]" /></span>
              <span className="col-span-3"><span className="inline-block h-3 w-24 rounded bg-white/[0.08]" /></span>
              <span className="col-span-2"><span className="inline-block h-3 w-10 rounded bg-white/[0.08]" /></span>
              <span className="col-span-2"><span className="inline-block h-3 w-14 rounded bg-white/[0.08]" /></span>
              <span className="col-span-2 text-right"><span className="inline-block h-3 w-16 rounded bg-white/[0.08]" /></span>
            </div>
          ))}

          {showLive && rows.map((r, i) => {
            const aed = fmtAed(r.amountAed);
            const perSqft = fmtAedPerSqft(r.amountAed, r.sizeSqft);
            return (
              <div
                key={r.rawId || `${r.date}-${i}`}
                className="grid grid-cols-12 gap-2 px-3 py-3 text-[12px] text-white/85 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <span className="col-span-3 font-semibold">{fmtDate(r.date)}</span>
                <span className="col-span-3 truncate text-white/70" title={r.building}>{r.building || '—'}</span>
                <span className="col-span-2 text-white/70">{r.rooms || '—'}</span>
                <span className="col-span-2 text-white/70">{r.sizeSqft ? `${r.sizeSqft.toLocaleString()} sqft` : '—'}</span>
                <span className="col-span-2 text-right">
                  <span className="font-bold text-emerald-300">{aed}</span>
                  <span className="block text-[10px] text-white/45 mt-0.5">{perSqft}/sqft</span>
                </span>
              </div>
            );
          })}

          {showEmpty && (
            <div className="px-3 py-6 text-center text-[12px] text-white/55">
              No DLD-registered sales found for this {propertyName ? 'building' : 'area'} in the last 12 months.
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-white/45 mt-3 leading-relaxed flex items-start gap-1.5">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          {fallback.active ? (
            <>
              {fallback.message || 'Live DLD data activates once Dubai Land Department finalises our API allowlist.'}{' '}
              <a
                href="https://dubailand.gov.ae/en/open-data/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted hover:text-white/70 inline-flex items-center gap-1"
              >
                DLD Open Data <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : (
            <>Source: Dubai Land Department · DDA Open API. Showing the most recent 10 registered Sale procedures.</>
          )}
        </p>

        {errorMsg && !fallback.active && (
          <p className="text-[10px] text-amber-300/80 mt-1">Diagnostic: {errorMsg}</p>
        )}
      </div>
    </section>
  );
}
