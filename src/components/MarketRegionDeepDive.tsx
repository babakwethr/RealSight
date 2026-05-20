/**
 * MarketRegionDeepDive — the in-page "you searched this" panel rendered
 * at the top of the UK/US market homes once the user picks a
 * region/metro. Shows:
 *   - Big label of the picked region/metro
 *   - Headline price + YoY badge
 *   - 24-month price-history line chart (UK = UKHPI region; US =
 *     Case-Shiller per-metro)
 *   - Property-type breakdown (UK only — Detached/Semi/Terrace/Flat)
 *
 * Replaces the previous "scroll into view + ring highlight" behaviour
 * with an actual data drill-in, per Babak's QA 20 May.
 */
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, MapPin, X } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useUkRegion, useUkRegionHistory } from '@/hooks/useUkMarketData';
import { useFredSeries } from '@/hooks/useUsMarketData';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { UkRegionSlug } from '@/lib/ukApi';

interface UkProps {
  market: 'uk';
  regionSlug: UkRegionSlug;
  regionLabel: string;
  onClear: () => void;
}

interface UsProps {
  market: 'us';
  metroSlug: string;
  metroLabel: string;
  /** FRED series ID for this metro's Case-Shiller HPI. */
  fredSeriesId: string;
  onClear: () => void;
}

type Props = UkProps | UsProps;

const POUND = '£';
const DOLLAR = '$';

function fmtCurrency(value: number | null | undefined, symbol: string): string {
  if (value == null || !isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${symbol}${Math.round(value / 1_000)}K`;
  return `${symbol}${Math.round(value).toLocaleString()}`;
}

export function MarketRegionDeepDive(props: Props) {
  const accent = props.market === 'uk' ? 'emerald' : 'violet';
  return props.market === 'uk' ? <UkPanel {...props} /> : <UsPanel {...props} />;
}

/* ──────────────────────────── UK ──────────────────────────── */
function UkPanel({ regionSlug, regionLabel, onClear }: UkProps) {
  const region  = useUkRegion(regionSlug);
  const history = useUkRegionHistory(regionSlug, 24);

  const chartData = useMemo(() => {
    const series = history.data?.series ?? [];
    return [...series]
      .filter(p => p.averagePrice != null)
      .sort((a, b) => (a.refMonth || '').localeCompare(b.refMonth || ''))
      .map(p => ({
        month: (p.refMonth ?? '').slice(0, 7),
        price: Math.round(p.averagePrice ?? 0),
      }));
  }, [history.data]);

  const yoy = region.data?.percentageChangeYear ?? null;
  const isUp = yoy != null && yoy >= 0;

  return (
    <section className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.04] p-5 sm:p-6 space-y-5">
      <PanelHeader
        label="Selected region · live UKHPI"
        title={regionLabel}
        subtitle="HM Land Registry — published monthly under OGL v3.0"
        accent="emerald"
        metric={{
          label: 'Avg price',
          value: fmtCurrency(region.data?.averagePrice, POUND),
          yoy,
        }}
        onClear={onClear}
      />

      {history.isLoading ? (
        <Skeleton className="h-[180px] w-full" />
      ) : chartData.length >= 3 ? (
        <PriceTrend data={chartData} symbol={POUND} accent={isUp ? 'emerald' : 'rose'} />
      ) : (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-white/55">
          Trend chart not available for this region yet.
        </div>
      )}

      {/* Property-type breakdown */}
      {region.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <BreakdownTile label="Detached" value={fmtCurrency(region.data.averagePriceDetached, POUND)} />
          <BreakdownTile label="Semi-detached" value={fmtCurrency(region.data.averagePriceSemiDetached, POUND)} />
          <BreakdownTile label="Terrace" value={fmtCurrency(region.data.averagePriceTerraced, POUND)} />
          <BreakdownTile label="Flat / maisonette" value={fmtCurrency(region.data.averagePriceFlatMaisonette, POUND)} />
        </div>
      )}

      <p className="text-[10px] text-white/35">
        Showing 24-month price history for <strong className="text-white/65">{regionLabel}</strong>. Source · HM Land Registry UKHPI.
      </p>
    </section>
  );
}

/* ──────────────────────────── US ──────────────────────────── */
function UsPanel({ metroLabel, fredSeriesId, onClear }: UsProps) {
  // 24 months gives us enough for a sensible trend + YoY.
  const series = useFredSeries(fredSeriesId, 24);

  const chartData = useMemo(() => {
    const obs = series.data?.observations ?? [];
    return [...obs]
      .filter(o => o.value && o.value !== '.')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(o => ({ month: o.date.slice(0, 7), price: parseFloat(o.value) }));
  }, [series.data]);

  const latest = chartData[chartData.length - 1]?.price ?? null;
  const yearAgo = chartData.length >= 13 ? chartData[chartData.length - 13]?.price ?? null : null;
  const yoy = latest != null && yearAgo != null && yearAgo > 0
    ? ((latest - yearAgo) / yearAgo) * 100
    : null;
  const isUp = yoy != null && yoy >= 0;

  return (
    <section className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.04] p-5 sm:p-6 space-y-5">
      <PanelHeader
        label="Selected metro · Case-Shiller HPI"
        title={metroLabel}
        subtitle="S&P / Case-Shiller via FRED — monthly, seasonally adjusted"
        accent="violet"
        metric={{
          label: 'HPI',
          value: latest != null ? latest.toFixed(1) : '—',
          yoy,
        }}
        onClear={onClear}
      />

      {series.isLoading ? (
        <Skeleton className="h-[180px] w-full" />
      ) : chartData.length >= 3 ? (
        <PriceTrend data={chartData} symbol="" accent={isUp ? 'violet' : 'rose'} valueLabel="HPI" />
      ) : (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-white/55">
          Trend chart not available for this metro yet — FRED key may be missing.
        </div>
      )}

      <p className="text-[10px] text-white/35">
        Showing 24-month Case-Shiller HPI for <strong className="text-white/65">{metroLabel}</strong>. Series · {fredSeriesId} (FRED).
      </p>
    </section>
  );
}

/* ──────────────────── Shared subcomponents ──────────────────── */

function PanelHeader({
  label, title, subtitle, accent, metric, onClear,
}: {
  label: string;
  title: string;
  subtitle: string;
  accent: 'emerald' | 'violet';
  metric: { label: string; value: string; yoy: number | null };
  onClear: () => void;
}) {
  const yoy = metric.yoy;
  const isUp = yoy != null && yoy >= 0;
  const tone = accent === 'emerald' ? 'text-emerald-300' : 'text-violet-300';
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={cn('text-[10px] font-black uppercase tracking-[0.2em] mb-1', tone)}>
          {label}
        </p>
        <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
          <MapPin className={cn('h-5 w-5', tone)} />
          {title}
        </h2>
        <p className="text-xs text-white/55 mt-1">{subtitle}</p>
      </div>
      <div className="flex items-start gap-2">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/40">{metric.label}</p>
          <p className="text-2xl font-black text-foreground tabular-nums" style={{ letterSpacing: '-0.02em' }}>
            {metric.value}
          </p>
          {yoy != null && (
            <span className={cn(
              'inline-flex items-center gap-1 text-[10px] font-bold mt-0.5',
              isUp ? 'text-emerald-400' : 'text-amber-400',
            )}>
              <Icon className="h-3 w-3" />
              {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}% YoY
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          aria-label="Clear selection"
          className="h-7 w-7 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] flex items-center justify-center text-white/55 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}

function PriceTrend({
  data, symbol, accent, valueLabel = 'avg',
}: {
  data: { month: string; price: number }[];
  symbol: string;
  accent: 'emerald' | 'violet' | 'rose';
  valueLabel?: string;
}) {
  const color = accent === 'emerald' ? '#18D6A4'
    : accent === 'violet' ? '#A78BFA'
    : '#F87171';
  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`trend-${accent}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Tooltip
            contentStyle={{ background: 'rgba(10,15,30,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
            itemStyle={{ color: '#fff' }}
            formatter={(value: number) => [
              symbol
                ? `${symbol}${Math.round(value).toLocaleString()}`
                : value.toFixed(1),
              valueLabel,
            ]}
          />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill={`url(#trend-${accent})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BreakdownTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-base font-black text-foreground tabular-nums" style={{ letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  );
}
