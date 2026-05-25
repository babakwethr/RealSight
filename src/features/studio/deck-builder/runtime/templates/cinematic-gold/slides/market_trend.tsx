import { SlideShell } from '../../../components/SlideShell';
import { BarSeries } from '../../../components/BarSeries';
import { StatCard } from '../../../primitives/StatCard';
import { CitationChip } from '../../../components/CitationChip';
import type { SlideProps, MarketTrendData } from '../../../types';

/**
 * Market trend slide — animated bars of a monthly series + optional
 * 3-up StatCard row. Lifted from `03-Market.tsx`.
 *
 * Data-bearing — citation chip renders next to the chart caption so
 * advisers can hover and see exactly which tool-call produced the
 * bars.
 *
 * `entry.data.bars` = the bar data (label/value/highlight);
 * `entry.data.pivot_index` = optional index to mark all bars after
 * it as `highlight`;
 * `entry.data.stats` = optional 3-up footer row.
 */
export function MarketTrendSlide({
  isMobile,
  entry,
  branding,
  visual,
}: SlideProps<MarketTrendData>) {
  const data = entry.data ?? { bars: [] };
  const bars = data.bars.map((b, i) => ({
    ...b,
    highlight:
      b.highlight ??
      (data.pivot_index !== undefined ? i > data.pivot_index : undefined),
  }));

  return (
    <SlideShell
      isMobile={isMobile}
      photo={visual}
      scrim="heavy"
      logo={branding.logo_url}
      agencyName={branding.agency_name}
    >
      <div className="absolute left-12 top-10 z-10 text-xs uppercase tracking-[0.3em] text-gold">
        Market trend
      </div>

      <div className="absolute left-12 right-12 top-24 z-10">
        <h2 className="max-w-3xl font-serif text-5xl leading-[1.05] text-bone">
          {entry.headline ?? ''}
        </h2>
        {entry.body ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-bone/75">
            {entry.body}
          </p>
        ) : null}
      </div>

      <div className="absolute inset-x-12 top-[230px] z-10">
        <div className="mb-2.5 flex items-baseline justify-between text-xs uppercase tracking-[0.2em] text-bone/60">
          <span className="inline-flex items-center gap-2">
            {data.caption ?? 'Homes sold each month'}
            <CitationChip citation={entry.citation} />
          </span>
        </div>
        <BarSeries data={bars} height={244} labelEvery={3} />
      </div>

      {data.stats && data.stats.length ? (
        <div className="absolute bottom-9 left-12 right-12 z-10 grid grid-cols-3 gap-x-10 border-t border-bone/15 pt-5">
          {data.stats.slice(0, 3).map((s, i) => (
            <StatCard key={i} label={s.label} value={s.value} sub={s.sub} accent={s.accent} />
          ))}
        </div>
      ) : null}
    </SlideShell>
  );
}
