/**
 * UsMarketHome — US market dashboard, backed by free public-data sources.
 *
 * Visually mirrors the UAE market home: same hero shell + filter bar
 * shape. Filter semantics adjusted to US public-records reality:
 *   - Search: metros + NYC boroughs + ZIP codes
 *   - Beds, Sales/Rental, Type — Status is hidden (Case-Shiller / NYC
 *     OpenData have no off-plan concept).
 *
 * Data sources (all free):
 *   - NYC OpenData (no key)
 *   - Cook County (no key)
 *   - FRED (key-gated): mortgage + Case-Shiller HPI
 */
import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, MapPin, Building2, ArrowUpRight } from 'lucide-react';
import { useNycSales, useChicagoSales, useFredSeries, useUsMetrosSnapshot } from '@/hooks/useUsMarketData';
import { Skeleton } from '@/components/ui/skeleton';
import type { UsMetroSnapshot } from '@/lib/usApi';
import { MarketHeroShell } from '@/components/MarketHeroShell';
import {
  MarketHeroFilterBar,
  type MarketHeroSuggestionGroup,
  type MarketHeroFilters,
} from '@/components/MarketHeroFilterBar';
import { MarketRegionDeepDive } from '@/components/MarketRegionDeepDive';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const US_METROS: Array<{ slug: string; label: string; series: string; aliases: string[] }> = [
  { slug: 'new-york',      label: 'New York City',  series: 'NYXRSA', aliases: ['NYC', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', '10001', '10011', '11201'] },
  { slug: 'los-angeles',   label: 'Los Angeles',    series: 'LXXRSA', aliases: ['LA', '90001', '90210', '90028'] },
  { slug: 'chicago',       label: 'Chicago',        series: 'CHXRSA', aliases: ['Cook County', '60601', '60614'] },
  { slug: 'miami',         label: 'Miami',          series: 'MIXRSA', aliases: ['33101', '33139', 'Miami Beach'] },
  { slug: 'san-francisco', label: 'San Francisco',  series: 'SFXRSA', aliases: ['SF', '94102', '94110'] },
  { slug: 'boston',        label: 'Boston',         series: 'BOXRSA', aliases: ['02108', '02115'] },
  { slug: 'washington-dc', label: 'Washington DC',  series: 'WDXRSA', aliases: ['DC', '20001', '20002'] },
  { slug: 'seattle',       label: 'Seattle',        series: 'SEXRSA', aliases: ['98101', '98109'] },
  { slug: 'denver',        label: 'Denver',         series: 'DNXRSA', aliases: ['80202', '80203'] },
  { slug: 'phoenix',       label: 'Phoenix',        series: 'PHXRSA', aliases: ['85001', '85003'] },
  { slug: 'dallas',        label: 'Dallas',         series: 'DAXRSA', aliases: ['75201', '75202'] },
  { slug: 'san-diego',     label: 'San Diego',      series: 'SDXRSA', aliases: ['92101', '92103'] },
  { slug: 'portland',      label: 'Portland',       series: 'POXRSA', aliases: ['97201', '97204'] },
  { slug: 'charlotte',     label: 'Charlotte',      series: 'CRXRSA', aliases: ['28202', '28203'] },
  { slug: 'detroit',       label: 'Detroit',        series: 'DEXRSA', aliases: ['48201', '48226'] },
  { slug: 'las-vegas',     label: 'Las Vegas',      series: 'LVXRSA', aliases: ['89101', '89109'] },
  { slug: 'minneapolis',   label: 'Minneapolis',    series: 'MNXRSA', aliases: ['55401', '55402'] },
  { slug: 'cleveland',     label: 'Cleveland',      series: 'CEXRSA', aliases: ['44101', '44113'] },
  { slug: 'tampa',         label: 'Tampa',          series: 'TPXRSA', aliases: ['33602', '33606'] },
  { slug: 'atlanta',       label: 'Atlanta',        series: 'ATXRSA', aliases: ['30301', '30303'] },
];

const DOLLAR = '$';

function fmtUsd(value: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (value == null || !isFinite(value)) return '—';
  const compact = opts.compact ?? true;
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${DOLLAR}${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return `${DOLLAR}${Math.round(value / 1_000)}K`;
    return `${DOLLAR}${Math.round(value).toLocaleString()}`;
  }
  return `${DOLLAR}${Math.round(value).toLocaleString()}`;
}

function fmtDate(iso: string): string { return iso ? iso.slice(0, 10) : '—'; }

function scrollMetroIntoView(slug: string) {
  const el = document.getElementById(`us-metro-${slug}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-violet-400/60');
    setTimeout(() => el.classList.remove('ring-2', 'ring-violet-400/60'), 2000);
  }
}

export default function UsMarketHome() {
  const manhattanSales = useNycSales({ borough: 'manhattan', limit: 8, minPrice: 1_000_000 });
  const brooklynSales  = useNycSales({ borough: 'brooklyn',  limit: 6, minPrice: 500_000 });
  const queensSales    = useNycSales({ borough: 'queens',    limit: 6, minPrice: 500_000 });
  const bronxSales     = useNycSales({ borough: 'bronx',     limit: 6, minPrice: 350_000 });
  const chicagoSales   = useChicagoSales({ limit: 6, minPrice: 500_000 });
  const mortgage30     = useFredSeries('MORTGAGE30US', 1);
  const mortgage30Hist = useFredSeries('MORTGAGE30US', 60);
  const caseShiller    = useFredSeries('CSUSHPINSA', 13);
  const caseShillerHist = useFredSeries('CSUSHPINSA', 60); // 5y trend
  const housingStarts  = useFredSeries('HOUST', 1);
  const buildingPermits = useFredSeries('PERMIT', 1);
  const existingSales  = useFredSeries('EXHOSLUSM495S', 1);
  const metros         = useUsMetrosSnapshot();

  const hpiTrend = computeYoY(caseShiller.data?.observations);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ slug: string; label: string; series: string } | null>(null);

  // National HPI 60-month trend
  const hpiTrendData = useMemo(() => {
    const obs = caseShillerHist.data?.observations ?? [];
    return [...obs]
      .filter(o => o.value && o.value !== '.')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(o => ({ month: o.date.slice(0, 7), v: parseFloat(o.value) }));
  }, [caseShillerHist.data]);

  // 30-yr mortgage 60-month trend
  const mortgageTrendData = useMemo(() => {
    const obs = mortgage30Hist.data?.observations ?? [];
    return [...obs]
      .filter(o => o.value && o.value !== '.')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(o => ({ month: o.date.slice(0, 7), v: parseFloat(o.value) }));
  }, [mortgage30Hist.data]);

  const suggestions: MarketHeroSuggestionGroup[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matched = US_METROS
      .filter(m => [m.label, ...m.aliases].join(' ').toLowerCase().includes(q))
      .slice(0, 8)
      .map(m => ({
        id: m.slug,
        primary: m.label,
        secondary: m.aliases?.length ? `e.g. ${m.aliases.slice(0, 3).join(' · ')}` : undefined,
        payload: m.slug,
      }));
    return [{ label: 'Metros, boroughs & ZIPs', icon: '🇺🇸', items: matched }];
  }, [query]);

  const openMetro = (slug: string) => {
    const entry = US_METROS.find(m => m.slug === slug);
    if (!entry) return;
    setSelected({ slug, label: entry.label, series: entry.series });
    setTimeout(() => {
      const el = document.getElementById('us-deep-dive');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleSelectSuggestion = (_g: MarketHeroSuggestionGroup, item: { payload?: unknown }) => {
    openMetro(item.payload as string);
  };

  const handleSubmit = (_filters: MarketHeroFilters) => {
    if (suggestions[0]?.items[0]) {
      openMetro(suggestions[0].items[0].payload as string);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <MarketHeroShell
        market="us"
        eyebrow="United States · Public Records"
        title="US property intelligence"
        subtitle="Backed by NYC OpenData and Cook County public records — every property sale, plus national mortgage and price-index trends from FRED."
        filterBar={
          <MarketHeroFilterBar
            market="us"
            placeholder="Search metro, borough or ZIP (Brooklyn, 90210, Miami…)"
            query={query}
            onQueryChange={setQuery}
            suggestions={suggestions}
            onSelectSuggestion={handleSelectSuggestion}
            onSubmit={handleSubmit}
            filterOptions={{
              types: ['Any', 'Single-family', 'Condo', 'Co-op', 'Multi-family'],
              statuses: [],
            }}
          />
        }
        footer={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MacroTile
              label="30-yr mortgage"
              value={mortgage30.data?.observations?.[0]?.value ? `${parseFloat(mortgage30.data.observations[0].value).toFixed(2)}%` : null}
              hint={mortgage30.data?.observations?.[0]?.date ? `as of ${mortgage30.data.observations[0].date}` : 'FRED key needed'}
            />
            <MacroTile
              label="Case-Shiller HPI"
              value={caseShiller.data?.observations?.[0]?.value ? parseFloat(caseShiller.data.observations[0].value).toFixed(1) : null}
              hint={caseShiller.data?.observations?.[0]?.date ? `as of ${caseShiller.data.observations[0].date}` : 'FRED key needed'}
            />
            <MacroTile
              label="HPI YoY"
              value={hpiTrend != null ? `${hpiTrend >= 0 ? '+' : ''}${hpiTrend.toFixed(1)}%` : null}
              hint="12-month change"
              positive={hpiTrend == null ? undefined : hpiTrend >= 0}
            />
            <MacroTile
              label="Metros tracked"
              value={metros.data?.metros ? `${metros.data.metros.filter((m) => !m.missing && m.slug !== 'us-composite').length}` : null}
              hint="Case-Shiller HPI"
            />
          </div>
        }
      />

      {/* ─── Selected-metro deep dive (rendered when user picks one) ─── */}
      {selected && (
        <div id="us-deep-dive">
          <MarketRegionDeepDive
            market="us"
            metroSlug={selected.slug}
            metroLabel={selected.label}
            fredSeriesId={selected.series}
            onClear={() => setSelected(null)}
          />
        </div>
      )}

      {/* ─── National macro trends (5-year) ─── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MacroChartCard
          title="Case-Shiller National HPI"
          subtitle="60-month index trend"
          data={hpiTrendData}
          color="#a78bfa"
          formatter={(v) => v.toFixed(1)}
          loading={caseShillerHist.isLoading}
        />
        <MacroChartCard
          title="30-yr mortgage rate"
          subtitle="60-month FRED series"
          data={mortgageTrendData}
          color="#34d399"
          formatter={(v) => `${v.toFixed(2)}%`}
          loading={mortgage30Hist.isLoading}
        />
      </section>

      {/* ─── Supply-side tiles ─── */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-foreground">National supply & demand</h2>
            <p className="text-sm text-white/55">Latest FRED indicators driving the market.</p>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">Source · FRED (Federal Reserve)</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MacroTile
            label="Housing starts"
            value={housingStarts.data?.observations?.[0]?.value
              ? `${Number(housingStarts.data.observations[0].value).toLocaleString()}K`
              : null}
            hint={housingStarts.data?.observations?.[0]?.date ? `as of ${housingStarts.data.observations[0].date}` : 'monthly · annualised'}
          />
          <MacroTile
            label="Building permits"
            value={buildingPermits.data?.observations?.[0]?.value
              ? `${Number(buildingPermits.data.observations[0].value).toLocaleString()}K`
              : null}
            hint={buildingPermits.data?.observations?.[0]?.date ? `as of ${buildingPermits.data.observations[0].date}` : 'monthly · annualised'}
          />
          <MacroTile
            label="Existing home sales"
            value={existingSales.data?.observations?.[0]?.value
              ? `${Number(existingSales.data.observations[0].value).toLocaleString()}K`
              : null}
            hint={existingSales.data?.observations?.[0]?.date ? `as of ${existingSales.data.observations[0].date}` : 'monthly · annualised'}
          />
        </div>
      </section>

      {/* ─── 20-metro Case-Shiller grid ─── */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-400" />
              US metros — Case-Shiller HPI
            </h2>
            <p className="text-sm text-white/55">
              Latest published value + 12-month YoY change. Monthly, seasonally adjusted.
            </p>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            Source · S&amp;P Case-Shiller via FRED
          </p>
        </div>
        {metros.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : metros.data?.metros && metros.data.metros.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {metros.data.metros
              .filter((m) => m.slug !== 'us-composite')
              .sort((a, b) => (b.latestValue ?? 0) - (a.latestValue ?? 0))
              .map((m) => (
                <MetroTile key={m.slug} metro={m} />
              ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center">
            <ArrowUpRight className="h-6 w-6 text-white/30 mx-auto mb-2" />
            <p className="text-sm text-white/55">FRED metro snapshot not yet available.</p>
            <p className="text-[11px] text-white/35 mt-1">
              Make sure FRED_API_KEY is set in Supabase secrets and us-proxy is deployed.
            </p>
          </div>
        )}
      </section>

      <MetroSection
        title="Manhattan, NYC"
        subtitle="Recent sales over $1M — NYC OpenData"
        isLoading={manhattanSales.isLoading}
        empty={!manhattanSales.data?.sales || manhattanSales.data.sales.length === 0}
      >
        {manhattanSales.data?.sales.map((s, i) => (
          <SaleCard
            key={`${s.address}-${s.apartment_number}-${i}`}
            price={Number(s.sale_price)}
            date={fmtDate(s.sale_date)}
            address={`${s.address}${s.apartment_number ? ` ${s.apartment_number}` : ''}`}
            area={s.neighborhood}
            zip={s.zip_code}
          />
        ))}
      </MetroSection>

      <MetroSection
        title="Brooklyn, NYC"
        subtitle="Recent sales over $500K"
        isLoading={brooklynSales.isLoading}
        empty={!brooklynSales.data?.sales || brooklynSales.data.sales.length === 0}
      >
        {brooklynSales.data?.sales.map((s, i) => (
          <SaleCard
            key={`${s.address}-${s.apartment_number}-${i}`}
            price={Number(s.sale_price)}
            date={fmtDate(s.sale_date)}
            address={`${s.address}${s.apartment_number ? ` ${s.apartment_number}` : ''}`}
            area={s.neighborhood}
            zip={s.zip_code}
          />
        ))}
      </MetroSection>

      <MetroSection
        title="Queens, NYC"
        subtitle="Recent sales over $500K"
        isLoading={queensSales.isLoading}
        empty={!queensSales.data?.sales || queensSales.data.sales.length === 0}
      >
        {queensSales.data?.sales.map((s, i) => (
          <SaleCard
            key={`${s.address}-${s.apartment_number}-${i}`}
            price={Number(s.sale_price)}
            date={fmtDate(s.sale_date)}
            address={`${s.address}${s.apartment_number ? ` ${s.apartment_number}` : ''}`}
            area={s.neighborhood}
            zip={s.zip_code}
          />
        ))}
      </MetroSection>

      <MetroSection
        title="Bronx, NYC"
        subtitle="Recent sales over $350K"
        isLoading={bronxSales.isLoading}
        empty={!bronxSales.data?.sales || bronxSales.data.sales.length === 0}
      >
        {bronxSales.data?.sales.map((s, i) => (
          <SaleCard
            key={`${s.address}-${s.apartment_number}-${i}`}
            price={Number(s.sale_price)}
            date={fmtDate(s.sale_date)}
            address={`${s.address}${s.apartment_number ? ` ${s.apartment_number}` : ''}`}
            area={s.neighborhood}
            zip={s.zip_code}
          />
        ))}
      </MetroSection>

      <MetroSection
        title="Chicago, IL"
        subtitle="Recent sales over $500K — Cook County records"
        isLoading={chicagoSales.isLoading}
        empty={!chicagoSales.data?.sales || chicagoSales.data.sales.length === 0}
      >
        {chicagoSales.data?.sales.map((s, i) => (
          <SaleCard
            key={`${s.pin}-${i}`}
            price={Number(s.sale_price)}
            date={fmtDate(s.sale_date)}
            address={`Parcel ${s.pin}`}
            area={s.nbhd ?? '—'}
            zip={s.deed_type ?? '—'}
          />
        ))}
      </MetroSection>

      <section className="text-center text-[11px] text-white/35 pt-4 border-t border-white/[0.05]">
        Data sourced from{' '}
        <a href="https://data.cityofnewyork.us" target="_blank" rel="noreferrer" className="underline hover:text-white/55">NYC OpenData</a>,{' '}
        <a href="https://datacatalog.cookcountyil.gov" target="_blank" rel="noreferrer" className="underline hover:text-white/55">Cook County Open Data</a>, and{' '}
        <a href="https://fred.stlouisfed.org" target="_blank" rel="noreferrer" className="underline hover:text-white/55">FRED (Federal Reserve)</a>.
        {' '}All US public records.
      </section>
    </div>
  );
}

/* ─── Subcomponents ─── */

function MacroChartCard({
  title, subtitle, data, color, formatter, loading,
}: {
  title: string;
  subtitle: string;
  data: { month: string; v: number }[];
  color: string;
  formatter: (v: number) => string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4">
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-xs font-black text-foreground">{title}</p>
          <p className="text-[10px] text-white/45">{subtitle}</p>
        </div>
        {data.length > 0 && (
          <p className="text-base font-black text-foreground tabular-nums" style={{ letterSpacing: '-0.02em' }}>
            {formatter(data[data.length - 1].v)}
          </p>
        )}
      </div>
      <div className="h-[130px]">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length >= 3 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Tooltip
                contentStyle={{ background: 'rgba(10,15,30,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                itemStyle={{ color: '#fff' }}
                formatter={(v: number) => [formatter(v), '']}
              />
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#grad-${color})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[11px] text-white/45 italic">
            FRED key needed for historical series.
          </div>
        )}
      </div>
    </div>
  );
}

function MacroTile({ label, value, hint, positive }: { label: string; value: string | null; hint?: string; positive?: boolean }) {
  const color = positive === undefined ? 'text-foreground' : positive ? 'text-emerald-400' : 'text-amber-400';
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className={`text-lg font-black tabular-nums ${color}`} style={{ letterSpacing: '-0.02em' }}>{value ?? '—'}</p>
      {hint && <p className="text-[10px] text-white/40 mt-0.5">{hint}</p>}
    </div>
  );
}

function MetroSection({ title, subtitle, isLoading, empty, children }: { title: string; subtitle: string; isLoading: boolean; empty: boolean; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-violet-400" />
            {title}
          </h2>
          <p className="text-sm text-white/55">{subtitle}</p>
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : empty ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center">
          <ArrowUpRight className="h-6 w-6 text-white/30 mx-auto mb-2" />
          <p className="text-sm text-white/55">Data not yet available.</p>
          <p className="text-[11px] text-white/35 mt-1">The us-proxy edge function may not be deployed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
      )}
    </section>
  );
}

function MetroTile({ metro }: { metro: UsMetroSnapshot }) {
  if (metro.missing || metro.latestValue == null) {
    return (
      <div id={`us-metro-${metro.slug}`} className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.05] p-4 opacity-60 transition-all">
        <p className="text-xs font-semibold text-white/55">{metro.name}</p>
        <p className="text-[10px] text-white/35 mt-1">No data</p>
      </div>
    );
  }
  const yoy = metro.yoyPct;
  const positive = yoy != null && yoy >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = yoy == null ? 'text-white/40' : positive ? 'text-emerald-400' : 'text-amber-400';
  return (
    <div id={`us-metro-${metro.slug}`} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 hover:bg-white/[0.06] transition-all">
      <p className="text-xs font-semibold text-white/80 leading-tight">{metro.name}</p>
      <p className="text-xl font-black text-foreground tabular-nums mt-1" style={{ letterSpacing: '-0.02em' }}>
        {metro.latestValue?.toFixed(1)}
      </p>
      <div className="flex items-center justify-between mt-2">
        {yoy != null ? (
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${color}`}>
            <Icon className="h-3 w-3" />
            <span className="tabular-nums">{yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%</span>
            <span className="text-white/50 font-normal">YoY</span>
          </span>
        ) : (
          <span className="text-[10px] text-white/35">—</span>
        )}
        <p className="text-[10px] text-white/40">{metro.latestDate?.slice(0, 7)}</p>
      </div>
    </div>
  );
}

function SaleCard({ price, date, address, area, zip }: { price: number; date: string; address: string; area: string; zip: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Building2 className="h-3 w-3 text-violet-400/60 shrink-0 mt-1" />
        <p className="text-xl font-black text-foreground tabular-nums ml-auto" style={{ letterSpacing: '-0.02em' }}>
          {fmtUsd(price)}
        </p>
      </div>
      <p className="text-xs font-semibold text-white/80 leading-tight">{address}</p>
      <p className="text-[10px] text-white/40 mt-1">{area} · {zip}</p>
      <p className="text-[10px] text-white/30 mt-1">{date}</p>
    </div>
  );
}

function computeYoY(observations?: Array<{ date: string; value: string }>): number | null {
  if (!observations || observations.length < 13) return null;
  const latest = parseFloat(observations[0].value);
  const yearAgo = parseFloat(observations[12].value);
  if (!isFinite(latest) || !isFinite(yearAgo) || yearAgo === 0) return null;
  return ((latest - yearAgo) / yearAgo) * 100;
}
