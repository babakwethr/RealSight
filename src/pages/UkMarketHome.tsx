/**
 * UkMarketHome — UK market dashboard, backed by HM Land Registry UKHPI.
 *
 * Visually mirrors the UAE market home: same hero shell, same filter
 * bar shape. Filter semantics adjusted to UK reality:
 *   - Search: regions + outer postcodes (SW1, M1, EH3…)
 *   - Beds, Sales/Rental, Status, Type — Status is hidden (UKHPI has
 *     no off-plan concept), Type maps to UK categories
 *     (Detached / Semi / Terrace / Flat).
 *
 * Submitting a search scrolls the matching region tile into view.
 * Picking a suggestion from the dropdown does the same.
 *
 * Data source: free, OGL v3.0 licensed, redistributable. Backed by
 * `supabase/functions/uk-proxy/index.ts`.
 */
import { useMemo, useState } from 'react';
import { ArrowUpRight, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { useUkRegion, useUkRegionHistory, useUkRegionsSnapshot } from '@/hooks/useUkMarketData';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketHeroShell } from '@/components/MarketHeroShell';
import {
  MarketHeroFilterBar,
  type MarketHeroSuggestionGroup,
  type MarketHeroFilters,
} from '@/components/MarketHeroFilterBar';
import { MarketRegionDeepDive } from '@/components/MarketRegionDeepDive';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { fmtMonthString } from '@/lib/dateFormat';
import type { UkRegionSlug } from '@/lib/ukApi';

const POSTCODE_TO_REGION: Record<string, UkRegionSlug> = {
  E: 'london', EC: 'london', N: 'london', NW: 'london',
  SE: 'london', SW: 'london', W: 'london', WC: 'london',
  M: 'manchester', B: 'birmingham', EH: 'edinburgh', BS: 'bristol',
  L: 'north-west', LS: 'yorkshire-and-the-humber',
  S: 'yorkshire-and-the-humber', HU: 'yorkshire-and-the-humber',
  NE: 'north-east', SR: 'north-east',
  CF: 'wales', SA: 'wales', LL: 'wales', NP: 'wales',
  G: 'scotland', AB: 'scotland', DD: 'scotland', PA: 'scotland',
  BT: 'northern-ireland',
};

const UK_REGIONS: Array<{ slug: UkRegionSlug; label: string; aliases: string[] }> = [
  { slug: 'london',                   label: 'London',                   aliases: ['SW1', 'E14', 'NW1', 'EC1'] },
  { slug: 'manchester',               label: 'Manchester',               aliases: ['M1', 'M2', 'M3'] },
  { slug: 'birmingham',               label: 'Birmingham',               aliases: ['B1', 'B2'] },
  { slug: 'edinburgh',                label: 'Edinburgh',                aliases: ['EH1', 'EH2'] },
  { slug: 'bristol',                  label: 'Bristol',                  aliases: ['BS1', 'BS2'] },
  { slug: 'north-east',               label: 'North East England',       aliases: ['NE', 'Newcastle'] },
  { slug: 'north-west',               label: 'North West England',       aliases: ['Liverpool', 'L1'] },
  { slug: 'yorkshire-and-the-humber', label: 'Yorkshire & Humber',       aliases: ['Leeds', 'Sheffield'] },
  { slug: 'east-midlands',            label: 'East Midlands',            aliases: ['Nottingham', 'Leicester'] },
  { slug: 'west-midlands',            label: 'West Midlands',            aliases: ['Coventry', 'Wolverhampton'] },
  { slug: 'east',                     label: 'East of England',          aliases: ['Cambridge', 'Norwich'] },
  { slug: 'south-east',               label: 'South East England',       aliases: ['Brighton', 'Oxford'] },
  { slug: 'south-west',               label: 'South West England',       aliases: ['Plymouth', 'Exeter'] },
  { slug: 'scotland',                 label: 'Scotland',                 aliases: ['Glasgow', 'Aberdeen'] },
  { slug: 'wales',                    label: 'Wales',                    aliases: ['Cardiff', 'Swansea'] },
  { slug: 'northern-ireland',         label: 'Northern Ireland',         aliases: ['Belfast'] },
  { slug: 'england',                  label: 'England (national)',       aliases: [] },
  { slug: 'united-kingdom',           label: 'United Kingdom (national)',aliases: [] },
];

const POUND = '£';

function fmtGbp(value: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (value == null || !isFinite(value)) return '—';
  const compact = opts.compact ?? true;
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${POUND}${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return `${POUND}${Math.round(value / 1_000)}K`;
    return `${POUND}${Math.round(value).toLocaleString()}`;
  }
  return `${POUND}${Math.round(value).toLocaleString()}`;
}

function fmtPct(value: number | null | undefined): { text: string; positive: boolean | null } {
  if (value == null || !isFinite(value)) return { text: '—', positive: null };
  const sign = value >= 0 ? '+' : '';
  return { text: `${sign}${value.toFixed(1)}%`, positive: value >= 0 };
}

function regionLabel(slug: string): string {
  return slug
    .split('-')
    .map((p) => (p.length <= 2 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
    .replace('Yorkshire And The Humber', 'Yorkshire & Humber');
}

function postcodeToRegion(postcode: string): UkRegionSlug | null {
  const match = postcode.trim().toUpperCase().match(/^([A-Z]{1,2})\d/);
  if (!match) return null;
  return POSTCODE_TO_REGION[match[1]] ?? null;
}

function scrollRegionIntoView(slug: string) {
  const el = document.getElementById(`uk-region-${slug}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-emerald-400/60');
    setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400/60'), 2000);
  }
}

export default function UkMarketHome() {
  const ukAggregate = useUkRegion('united-kingdom');
  const ukHistory   = useUkRegionHistory('united-kingdom', 24);
  const london      = useUkRegion('london');
  const snapshot    = useUkRegionsSnapshot();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ slug: UkRegionSlug; label: string } | null>(null);

  // National 24-month trend chart data.
  const ukTrendData = useMemo(() => {
    const series = ukHistory.data?.series ?? [];
    return [...series]
      .filter(p => p.averagePrice != null)
      .sort((a, b) => (a.refMonth || '').localeCompare(b.refMonth || ''))
      .map(p => ({
        month: fmtMonthString((p.refMonth ?? '').slice(0, 7)),
        price: Math.round(p.averagePrice ?? 0),
      }));
  }, [ukHistory.data]);

  // Build a single suggestion group from the regions list + postcode prefix.
  const suggestions: MarketHeroSuggestionGroup[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // Match against label + aliases.
    const matched = UK_REGIONS
      .map(r => {
        const hay = [r.label, ...(r.aliases || [])].join(' ').toLowerCase();
        const score = hay.includes(q) ? 1 : 0;
        return { r, score };
      })
      .filter(x => x.score > 0)
      .slice(0, 8)
      .map(({ r }) => ({
        id: r.slug,
        primary: r.label,
        secondary: r.aliases?.length ? `e.g. ${r.aliases.slice(0, 3).join(' · ')}` : undefined,
        payload: r.slug,
      }));
    return [
      { label: 'Regions & postcodes', icon: '🇬🇧', items: matched },
    ];
  }, [query]);

  const openRegion = (slug: UkRegionSlug) => {
    const entry = UK_REGIONS.find(r => r.slug === slug);
    setSelected({ slug, label: entry?.label ?? regionLabel(slug) });
    // Scroll the deep-dive into view smoothly after it renders.
    setTimeout(() => {
      const el = document.getElementById('uk-deep-dive');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleSelectSuggestion = (_g: MarketHeroSuggestionGroup, item: { payload?: unknown }) => {
    openRegion(item.payload as UkRegionSlug);
  };

  const handleSubmit = (filters: MarketHeroFilters) => {
    const direct = postcodeToRegion(filters.query);
    if (direct) {
      openRegion(direct);
      return;
    }
    if (suggestions[0]?.items[0]) {
      openRegion(suggestions[0].items[0].payload as UkRegionSlug);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* ─── Hero (UAE-style shell) ─── */}
      <MarketHeroShell
        market="uk"
        eyebrow="United Kingdom · HM Land Registry"
        title="UK property intelligence"
        subtitle="Backed by HM Land Registry's UK House Price Index — 24M+ residential transactions, published monthly under OGL v3.0."
        metric={
          ukAggregate.data ? (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                {fmtMonthString(ukAggregate.data.refMonth)} · UK avg
              </p>
              <p className="text-3xl font-black text-foreground" style={{ letterSpacing: '-0.02em' }}>
                {fmtGbp(ukAggregate.data.averagePrice)}
              </p>
              <ChangeBadge value={ukAggregate.data.percentageChangeYear} suffix="YoY" />
            </div>
          ) : null
        }
        filterBar={
          <MarketHeroFilterBar
            market="uk"
            placeholder="Search postcode or region (SW1, M1, EH3, London…)"
            query={query}
            onQueryChange={setQuery}
            suggestions={suggestions}
            onSelectSuggestion={handleSelectSuggestion}
            onSubmit={handleSubmit}
            filterOptions={{
              types: ['Any', 'Detached', 'Semi-detached', 'Terrace', 'Flat'],
              statuses: [], // UKHPI has no off-plan/ready concept
            }}
          />
        }
        footer={
          /* London close-up tiles */
          london.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : london.data ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <HeroMetric label="London avg" value={fmtGbp(london.data.averagePrice)} hint={`HPI ${london.data.housePriceIndex?.toFixed(1) ?? '—'}`} />
              <HeroMetric label="Detached" value={fmtGbp(london.data.averagePriceDetached)} hint="London" />
              <HeroMetric label="Semi" value={fmtGbp(london.data.averagePriceSemiDetached)} hint="London" />
              <HeroMetric label="Terrace" value={fmtGbp(london.data.averagePriceTerraced)} hint="London" />
              <HeroMetric label="Flat" value={fmtGbp(london.data.averagePriceFlatMaisonette)} hint="London" />
            </div>
          ) : null
        }
      />

      {/* ─── Selected-region deep dive (rendered when user picks one) ─── */}
      {selected && (
        <div id="uk-deep-dive">
          <MarketRegionDeepDive
            market="uk"
            regionSlug={selected.slug}
            regionLabel={selected.label}
            onClear={() => setSelected(null)}
          />
        </div>
      )}

      {/* ─── UK national 24-month trend ─── */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-foreground">UK 24-month price trend</h2>
            <p className="text-sm text-white/55">Average residential price across the UK, by month.</p>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">Source · HM Land Registry</p>
        </div>
        {ukHistory.isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : ukTrendData.length >= 3 ? (
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ukTrendData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="uk-trend-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18d6a4" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#18d6a4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,15,30,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(v: number) => [`£${Math.round(v).toLocaleString()}`, 'Avg price']}
                />
                <Area type="monotone" dataKey="price" stroke="#18d6a4" strokeWidth={2} fill="url(#uk-trend-grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState reason="National trend not yet available." />
        )}
      </section>

      {/* ─── Regions snapshot ─── */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-foreground">Regions</h2>
            <p className="text-sm text-white/55">
              Most-recent published month. Tap any region for the trend chart.
            </p>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            Source · HM Land Registry
          </p>
        </div>

        {snapshot.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : snapshot.data?.regions && snapshot.data.regions.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {snapshot.data.regions.map((r) => (
              <RegionCard key={r.region} entry={r} />
            ))}
          </div>
        ) : (
          <EmptyState reason="Regions snapshot not yet available — proxy may need deploying." />
        )}
      </section>

      <section className="text-center text-[11px] text-white/35 pt-4 border-t border-white/[0.05]">
        Data sourced from HM Land Registry under the{' '}
        <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noreferrer" className="underline hover:text-white/55">Open Government Licence v3.0</a>.
        Contains public sector information licensed under the OGL v3.0.
      </section>
    </div>
  );
}

/* ─── Subcomponents ─── */

function HeroMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-lg font-black text-foreground tabular-nums" style={{ letterSpacing: '-0.02em' }}>{value}</p>
      {hint && <p className="text-[10px] text-white/40">{hint}</p>}
    </div>
  );
}

function RegionCard({ entry }: { entry: import('@/lib/ukApi').UkhpiSnapshotEntry }) {
  if (entry.missing || entry.averagePrice == null) {
    return (
      <div id={`uk-region-${entry.region}`} className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.05] p-4 opacity-60 transition-all">
        <p className="text-xs font-semibold text-white/55">{regionLabel(entry.region)}</p>
        <p className="text-[10px] text-white/35 mt-1">Data not yet published</p>
      </div>
    );
  }
  return (
    <div id={`uk-region-${entry.region}`} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 hover:bg-white/[0.06] transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-white/80 leading-tight">{regionLabel(entry.region)}</p>
        <Building2 className="h-3 w-3 text-emerald-400/60 shrink-0" />
      </div>
      <p className="text-xl font-black text-foreground tabular-nums" style={{ letterSpacing: '-0.02em' }}>
        {fmtGbp(entry.averagePrice)}
      </p>
      <div className="flex items-center justify-between mt-2">
        <ChangeBadge value={entry.percentageChangeYear} suffix="YoY" compact />
        <p className="text-[10px] text-white/40">{fmtMonthString(entry.refMonth)}</p>
      </div>
    </div>
  );
}

function ChangeBadge({
  value, suffix, compact = false,
}: { value: number | null | undefined; suffix?: string; compact?: boolean }) {
  const { text, positive } = fmtPct(value);
  if (positive === null) return <span className="text-[10px] text-white/35">{text}{suffix ? ` ${suffix}` : ''}</span>;
  const color = positive ? 'text-emerald-400' : 'text-amber-400';
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${color}`}>
      <Icon className="h-3 w-3" />
      <span className="tabular-nums">{text}</span>
      {!compact && suffix && <span className="text-white/50 font-normal">{suffix}</span>}
    </span>
  );
}

function EmptyState({ reason }: { reason: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center">
      <ArrowUpRight className="h-6 w-6 text-white/30 mx-auto mb-2" />
      <p className="text-sm text-white/55">{reason}</p>
      <p className="text-[11px] text-white/35 mt-1">
        The uk-proxy edge function may not be deployed yet. Once live this
        section will populate automatically with HM Land Registry data.
      </p>
    </div>
  );
}
