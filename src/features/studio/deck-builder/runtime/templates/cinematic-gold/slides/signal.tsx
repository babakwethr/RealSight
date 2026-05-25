import { SlideShell } from '../../../components/SlideShell';
import { BarSeries } from '../../../components/BarSeries';
import { StatCard } from '../../../primitives/StatCard';
import { CitationChip } from '../../../components/CitationChip';
import type { SlideProps, SignalData } from '../../../types';

/**
 * Cooling-signal slide — bars showing a secondary indicator (price
 * per sqft over time) with the "signal" emphasized via a highlight.
 * Lifted from `04-Signal.tsx`.
 *
 * Data-bearing — citation chip renders next to the chart caption.
 */
export function SignalSlide({
  isMobile,
  entry,
  branding,
  visual,
}: SlideProps<SignalData>) {
  const data = (entry.data ?? {}) as Partial<SignalData>;
  const bars = Array.isArray(data.bars) ? data.bars : [];

  return (
    <SlideShell
      isMobile={isMobile}
      photo={visual}
      scrim="heavy"
      logo={branding.logo_url}
      agencyName={branding.agency_name}
    >
      <div className="absolute left-12 top-10 z-10 text-xs uppercase tracking-[0.3em] text-gold">
        Signal
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

      <div className="absolute inset-x-12 top-[272px] z-10">
        <div className="mb-2.5 flex items-baseline justify-between text-xs uppercase tracking-[0.2em] text-bone/60">
          <span className="inline-flex items-center gap-2">
            {data.caption ?? 'Price index'}
            <CitationChip citation={entry.citation} />
          </span>
          {data.signal_text ? (
            <span className="text-gold/90">{data.signal_text}</span>
          ) : null}
        </div>
        <BarSeries data={bars} baseline={inferBaseline(bars.map((b) => b.value))} height={158} labelEvery={3} />
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

// Pick a baseline ~80% of the min so bars visually exaggerate the
// narrow band without crushing the smallest value to zero.
function inferBaseline(values: number[]): number {
  if (values.length === 0) return 0;
  const min = Math.min(...values);
  return Math.max(0, Math.round(min * 0.8));
}
