/**
 * UkMarketHome — UK market dashboard, backed by HM Land Registry UKHPI.
 *
 * Phase 2 of the global-launch plan. Self-contained page (does not yet
 * unify with the UAE MarketHome — that refactor happens in Phase 4).
 * Renders:
 *   - Hero: UK national average + last-month HPI + YoY change
 *   - Region grid: 10 major regions side-by-side
 *   - Property-type breakdown for London (detached / semi / terrace / flat)
 *
 * Data source: free, OGL v3.0 licensed, redistributable. Backed by
 * `supabase/functions/uk-proxy/index.ts`. If the proxy is disabled
 * (UK_ENABLED=false) or returns 503, hooks return `null` and the
 * component renders a graceful empty state.
 */
import { ArrowUpRight, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { useUkRegion, useUkRegionsSnapshot } from '@/hooks/useUkMarketData';
import { Skeleton } from '@/components/ui/skeleton';

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
  return {
    text: `${sign}${value.toFixed(1)}%`,
    positive: value >= 0,
  };
}

function regionLabel(slug: string): string {
  return slug
    .split('-')
    .map((p) => (p.length <= 2 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
    .replace('Yorkshire And The Humber', 'Yorkshire & Humber');
}

export default function UkMarketHome() {
  const ukAggregate = useUkRegion('united-kingdom');
  const london = useUkRegion('london');
  const snapshot = useUkRegionsSnapshot();

  // Renders inside <AppLayout /> — the sidebar + cinematic-bg + chrome
  // are provided by the layout. This page only owns its body content.
  return (
    <div className="space-y-10 animate-fade-in">
        {/* ─── Hero ─── */}
        <section className="glass-card p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80 mb-2">
                United Kingdom · HM Land Registry
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2" style={{ letterSpacing: '-0.02em' }}>
                UK property intelligence
              </h1>
              <p className="text-sm text-white/55 max-w-lg">
                Backed by HM Land Registry's UK House Price Index — 24M+ residential transactions,
                published monthly under OGL v3.0.
              </p>
            </div>
            {ukAggregate.data && (
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                  {ukAggregate.data.refMonth} · UK avg
                </p>
                <p className="text-3xl font-black text-foreground" style={{ letterSpacing: '-0.02em' }}>
                  {fmtGbp(ukAggregate.data.averagePrice)}
                </p>
                <ChangeBadge value={ukAggregate.data.percentageChangeYear} suffix="YoY" />
              </div>
            )}
          </div>

          {/* London close-up */}
          {london.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : london.data ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <HeroMetric
                label="London avg"
                value={fmtGbp(london.data.averagePrice)}
                hint={`HPI ${london.data.housePriceIndex?.toFixed(1) ?? '—'}`}
              />
              <HeroMetric
                label="Detached"
                value={fmtGbp(london.data.averagePriceDetached)}
                hint="London"
              />
              <HeroMetric
                label="Semi"
                value={fmtGbp(london.data.averagePriceSemiDetached)}
                hint="London"
              />
              <HeroMetric
                label="Terrace"
                value={fmtGbp(london.data.averagePriceTerraced)}
                hint="London"
              />
              <HeroMetric
                label="Flat"
                value={fmtGbp(london.data.averagePriceFlatMaisonette)}
                hint="London"
              />
            </div>
          ) : (
            <EmptyState reason="London data not yet available — proxy may need deploying." />
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

      {/* ─── Source footer ─── */}
      <section className="text-center text-[11px] text-white/35 pt-4 border-t border-white/[0.05]">
        Data sourced from HM Land Registry under the
        {' '}<a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noreferrer" className="underline hover:text-white/55">Open Government Licence v3.0</a>.
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
      <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.05] p-4 opacity-60">
        <p className="text-xs font-semibold text-white/55">{regionLabel(entry.region)}</p>
        <p className="text-[10px] text-white/35 mt-1">Data not yet published</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 hover:bg-white/[0.06] transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-white/80 leading-tight">{regionLabel(entry.region)}</p>
        <Building2 className="h-3 w-3 text-emerald-400/60 shrink-0" />
      </div>
      <p className="text-xl font-black text-foreground tabular-nums" style={{ letterSpacing: '-0.02em' }}>
        {fmtGbp(entry.averagePrice)}
      </p>
      <div className="flex items-center justify-between mt-2">
        <ChangeBadge value={entry.percentageChangeYear} suffix="YoY" compact />
        <p className="text-[10px] text-white/40">{entry.refMonth}</p>
      </div>
    </div>
  );
}

function ChangeBadge({
  value,
  suffix,
  compact = false,
}: {
  value: number | null | undefined;
  suffix?: string;
  compact?: boolean;
}) {
  const { text, positive } = fmtPct(value);
  if (positive === null) {
    return <span className="text-[10px] text-white/35">{text}{suffix ? ` ${suffix}` : ''}</span>;
  }
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
