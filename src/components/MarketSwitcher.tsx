/**
 * MarketSwitcher — top-nav dropdown with the 5 launch markets.
 *
 * Per LAUNCH_PLAN.md §17 polish item: signals to non-UAE visitors that
 * RealSight is a global platform — Dubai is just where we're live first.
 * Shows a flag + market name, opens a dropdown matching the landing-page
 * roster (Dubai live, others "Coming Q3/Q4 2026"). Clicking a non-live
 * market routes to /request-access with the market pre-selected so we
 * capture demand for waitlist sizing.
 *
 * COMPETITIVE-MOAT NOTE: this is intentionally roster-only. We do NOT
 * publish coverage detail (data sources, area counts, integration plans)
 * here — that would tip our hand. The dropdown is a positioning device,
 * not a feature reveal.
 */
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type MarketStatus = 'live' | 'q3-2026' | 'q4-2026';

interface Market {
  slug: string;
  name: string;
  flag: string;
  status: MarketStatus;
  /** Hint shown next to the entry — kept generic, not a feature spec. */
  hint: string;
}

const MARKETS: Market[] = [
  { slug: 'dubai',     name: 'Dubai',          flag: '🇦🇪', status: 'live',    hint: 'Live now'        },
  { slug: 'london',    name: 'United Kingdom', flag: '🇬🇧', status: 'q3-2026', hint: 'Coming Q3 2026'  },
  { slug: 'singapore', name: 'Singapore',      flag: '🇸🇬', status: 'q3-2026', hint: 'Coming Q3 2026'  },
  { slug: 'spain',     name: 'Spain',          flag: '🇪🇸', status: 'q4-2026', hint: 'Coming Q4 2026'  },
  { slug: 'us',        name: 'United States',  flag: '🇺🇸', status: 'q4-2026', hint: 'Coming Q4 2026'  },
];

interface MarketSwitcherProps {
  /** Compact mode = flag + chevron only, no name. Useful in tight nav bars. */
  compact?: boolean;
  className?: string;
}

export function MarketSwitcher({ compact = false, className }: MarketSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // We always anchor the trigger label to Dubai (only live market) — the
  // dropdown does the work of communicating the rest.
  const current = MARKETS[0];

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
              const isLive = m.status === 'live';
              const Inner = (
                <div
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 transition-colors',
                    isLive ? 'hover:bg-white/[0.05] cursor-pointer' : 'cursor-pointer hover:bg-white/[0.03] opacity-80',
                  )}
                >
                  <span className="text-xl leading-none">{m.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{m.name}</p>
                      {isLive && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />
                          Live
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      'text-[10px]',
                      isLive ? 'text-white/55' : 'text-amber-300/80',
                    )}>
                      {m.hint}
                    </p>
                  </div>
                  {isLive && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              );

              return (
                <li key={m.slug}>
                  {isLive ? (
                    <Link to="/" onClick={() => setOpen(false)}>
                      {Inner}
                    </Link>
                  ) : (
                    // Non-live markets capture demand for waitlist sizing —
                    // we do NOT redirect them anywhere that exposes feature
                    // detail. /request-access is form-only.
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
