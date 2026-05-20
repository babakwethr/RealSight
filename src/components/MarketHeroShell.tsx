/**
 * MarketHeroShell — the dark cinematic hero card used at the top of
 * every market page (UAE / UK / US). Keeps visual treatment consistent:
 *   - radial aurora background tinted to the market accent
 *   - centred eyebrow → headline → subtitle
 *   - filter bar slot
 *   - right-side live-metric slot
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const ACCENTS = {
  uae: 'from-[#18d6a4]/15 via-[#18d6a4]/5 to-transparent',
  uk:  'from-emerald-400/15 via-emerald-400/5 to-transparent',
  us:  'from-violet-400/15 via-violet-400/5 to-transparent',
} as const;

const EYEBROW_COLOR = {
  uae: 'text-primary',
  uk:  'text-emerald-300',
  us:  'text-violet-300',
} as const;

export interface MarketHeroShellProps {
  market: keyof typeof ACCENTS;
  eyebrow: string;
  title: ReactNode;
  subtitle: ReactNode;
  /** Filter bar slot — rendered below the subtitle. */
  filterBar?: ReactNode;
  /** Right-rail headline metric (e.g. UK avg). */
  metric?: ReactNode;
  /** Anything to render below the title block (e.g. macro tiles). */
  footer?: ReactNode;
}

export function MarketHeroShell({
  market, eyebrow, title, subtitle, filterBar, metric, footer,
}: MarketHeroShellProps) {
  return (
    <section
      className={cn(
        'relative rounded-3xl border border-white/[0.08] overflow-hidden',
        'bg-gradient-to-br',
        ACCENTS[market],
      )}
    >
      {/* Aurora accents */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[20rem] h-[20rem] rounded-full blur-[120px] opacity-40"
             style={{ background: market === 'uae' ? '#18d6a4' : market === 'uk' ? '#34d399' : '#a78bfa' }} />
        <div className="absolute -bottom-16 -right-12 w-[14rem] h-[14rem] rounded-full blur-[90px] opacity-25"
             style={{ background: market === 'uae' ? '#2d5cff' : market === 'uk' ? '#0ea5e9' : '#7c3aed' }} />
      </div>

      <div className="relative px-5 sm:px-8 py-7 sm:py-9 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <p className={cn('text-[10px] font-black uppercase tracking-[0.2em] mb-2', EYEBROW_COLOR[market])}>
              {eyebrow}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground" style={{ letterSpacing: '-0.02em' }}>
              {title}
            </h1>
            <p className="text-sm sm:text-base text-white/60 mt-2 max-w-xl">
              {subtitle}
            </p>
          </div>
          {metric && (
            <div className="shrink-0">{metric}</div>
          )}
        </div>

        {filterBar && (
          <div style={{ position: 'relative', zIndex: 50 }}>
            {filterBar}
          </div>
        )}

        {footer}
      </div>
    </section>
  );
}
