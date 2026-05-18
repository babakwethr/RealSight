/**
 * MarketSwitcher — top-nav dropdown with the launch markets.
 *
 * Per the global-launch plan, RealSight is a product of ADRO LAB Inc.
 * (Delaware) and launches across the US, UK, and UAE with Spain on the
 * horizon. Order matters: US first, UK second, UAE third — reflecting
 * the corporate origin story (founded US + UK, expanding to UAE).
 *
 * Today: UAE has full data flowing (DDA + Reelly). US and UK are wired
 * with first-cohort access — the dropdown reflects this honestly by
 * tagging them as Live but routing to /request-access for cohort signup
 * until the per-market home pages fully populate (Phases 2 + 3 of the
 * global-launch plan). Spain is the only "Coming Soon" market.
 *
 * COMPETITIVE-MOAT NOTE: this is intentionally roster-only. We do NOT
 * publish coverage detail (data sources, area counts, integration plans)
 * here — the dropdown is a positioning device, not a feature reveal.
 */
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type MarketStatus = 'live' | 'live-cohort' | 'coming-soon';

interface Market {
  slug: string;
  name: string;
  flag: string;
  status: MarketStatus;
  /** Hint shown next to the entry — kept generic, not a feature spec. */
  hint: string;
}

// US first → UK → UAE → Spain. ADRO LAB is a US/UK-founded company; UAE
// is the international expansion. Spain is the only "Coming Soon".
const MARKETS: Market[] = [
  { slug: 'us',     name: 'United States',  flag: '🇺🇸', status: 'live-cohort', hint: 'First cohort access'  },
  { slug: 'uk',     name: 'United Kingdom', flag: '🇬🇧', status: 'live-cohort', hint: 'First cohort access'  },
  { slug: 'uae',    name: 'United Arab Emirates', flag: '🇦🇪', status: 'live', hint: 'Live now'              },
  { slug: 'spain',  name: 'Spain',          flag: '🇪🇸', status: 'coming-soon', hint: 'Coming soon'          },
];

interface MarketSwitcherProps {
  /** Compact mode = flag + chevron only, no name. Useful in tight nav bars. */
  compact?: boolean;
  className?: string;
}

export function MarketSwitcher({ compact = false, className }: MarketSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Anchor the trigger label to UAE — the only market with full data
  // flowing today. The dropdown shows the rest of the live-cohort markets.
  const current = MARKETS.find(m => m.status === 'live') ?? MARKETS[0];

  // Close on outside click — standard dropdown discipline.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{current.flag}</span>
        {!compact && (
          <>
            <span>{current.name}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/90 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              Live
            </span>
          </>
        )}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-background/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
              Markets
            </p>
          </div>

          <ul className="py-1.5">
            {MARKETS.map(m => {
              const isFullyLive = m.status === 'live';
              const isCohort = m.status === 'live-cohort';
              const isSoon = m.status === 'coming-soon';
              const Inner = (
                <div
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 transition-colors',
                    isSoon
                      ? 'cursor-pointer hover:bg-white/[0.03] opacity-70'
                      : 'hover:bg-white/[0.05] cursor-pointer',
                  )}
                >
                  <span className="text-xl leading-none">{m.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{m.name}</p>
                      {isFullyLive && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />
                          Live
                        </span>
                      )}
                      {isCohort && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Live
                        </span>
                      )}
                      {isSoon && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-300">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      'text-[10px]',
                      isSoon ? 'text-amber-300/80' : 'text-white/55',
                    )}>
                      {m.hint}
                    </p>
                  </div>
                  {(isFullyLive || isCohort) && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              );

              return (
                <li key={m.slug}>
                  {isFullyLive ? (
                    <Link to="/" onClick={() => setOpen(false)}>
                      {Inner}
                    </Link>
                  ) : (
                    // Live-cohort (US, UK) and Coming-Soon (Spain) markets route
                    // to /request-access for cohort sizing until the per-market
                    // dashboards fully populate (Phases 2 + 3 of the global plan).
                    <Link
                      to={`/request-access?market=${m.slug}`}
                      onClick={() => setOpen(false)}
                    >
                      {Inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="px-4 py-2.5 border-t border-white/5 bg-white/[0.02]">
            <p className="text-[10px] text-white/40 leading-relaxed">
              Each plan covers one market. Add more as you grow.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
