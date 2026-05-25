import { SlideShell } from '../../../components/SlideShell';
import type { SlideProps, StrategyData } from '../../../types';

/**
 * Strategy / tiers / "what to do Monday" slide — 1-3 tier cards.
 * Lifted from `09-Focus.tsx`. Not data-bearing — no citation chip.
 */
export function StrategySlide({
  isMobile,
  entry,
  branding,
  visual,
}: SlideProps<StrategyData>) {
  const data = entry.data ?? { tiers: [] };
  const tiers = data.tiers.slice(0, 3);

  return (
    <SlideShell
      isMobile={isMobile}
      photo={visual}
      scrim="medium"
      logo={branding.logo_url}
      agencyName={branding.agency_name}
    >
      <div className="absolute left-12 top-10 z-10 text-xs uppercase tracking-[0.3em] text-gold">
        The strategy
      </div>

      <div className="absolute left-12 right-12 top-24 z-10">
        <h2 className="max-w-3xl font-serif text-5xl leading-[1.05] text-bone">
          {entry.headline ?? ''}
        </h2>
        {(data.intro ?? entry.body) ? (
          <p className="mt-3 max-w-2xl text-base text-bone/75">{data.intro ?? entry.body}</p>
        ) : null}
      </div>

      <div className="absolute inset-x-12 top-[262px] z-10 grid grid-cols-3 gap-5">
        {tiers.map((f, i) => (
          <div
            key={f.tier}
            className={`flex min-h-[316px] flex-col rounded-sm border p-5 backdrop-blur-md ${
              i === 0
                ? 'border-gold/45 bg-gold/[0.09]'
                : 'border-bone/15 bg-ink-900/75'
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span
                className={`text-xs uppercase tracking-[0.24em] ${
                  i === 0 ? 'text-gold' : 'text-bone/55'
                }`}
              >
                {f.tier}
              </span>
              <span className="font-serif text-3xl text-bone/30">{i + 1}</span>
            </div>
            <span
              className={`mt-2 font-serif text-[27px] leading-tight ${
                i === 0 ? 'text-gold' : 'text-bone'
              }`}
            >
              {f.label}
            </span>
            <div className="mt-4 space-y-1.5 border-t border-bone/15 pt-3">
              {f.items.map((a) => (
                <div key={a} className="text-base text-bone/90">
                  {a}
                </div>
              ))}
            </div>
            {f.why ? (
              <p className="mt-auto pt-4 text-sm leading-relaxed text-bone/70">{f.why}</p>
            ) : null}
          </div>
        ))}
      </div>
    </SlideShell>
  );
}
