import { useState } from 'react';
import { Lightbulb, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * GuidanceCard — plain-language explainer shown on top of feature pages.
 *
 * Goal: investor users (often non-technical, often non-native English) should
 * be able to read a 1-line title + 2-3 bullets and immediately understand
 * (a) what this page does for them, and (b) how to use it. Used across
 * Portfolio, Deal Analyzer, Markets, Compare, Watchlist, etc.
 *
 * Behaviour:
 *   • Collapsible — clicking the header toggles details on small screens.
 *   • Dismissible — once dismissed, persists per `storageKey` in localStorage
 *     so users don't see the same explainer every visit.
 *   • Always available — even after dismissal, a small "?" pill in the
 *     parent page can re-open it (parent owns the show/hide state).
 */
export interface GuidanceCardProps {
  title: string;
  /** 1-2 sentence subtitle / lead. Plain language. */
  description?: string;
  /** Optional bullet points — keep short, action-oriented. */
  bullets?: string[];
  /** localStorage key — when set, dismissal persists. */
  storageKey?: string;
  /** Tone — affects accent color. */
  tone?: 'info' | 'success' | 'warn';
  /** Visual density. compact = no expansion, no bullets visible by default. */
  defaultOpen?: boolean;
  className?: string;
}

const TONE_MAP = {
  info:    { ring: 'ring-[#2d5cff]/35', icon: 'text-[#7aa6ff]', bg: 'from-[#2d5cff]/14 via-transparent to-transparent' },
  success: { ring: 'ring-[#18d6a4]/35', icon: 'text-[#2effc0]', bg: 'from-[#18d6a4]/14 via-transparent to-transparent' },
  warn:    { ring: 'ring-amber-400/35', icon: 'text-amber-300',  bg: 'from-amber-400/14 via-transparent to-transparent' },
};

export function GuidanceCard({
  title,
  description,
  bullets,
  storageKey,
  tone = 'info',
  defaultOpen = true,
  className,
}: GuidanceCardProps) {
  const dismissed = typeof window !== 'undefined' && storageKey
    ? localStorage.getItem(`guidance:${storageKey}`) === 'dismissed'
    : false;

  const [open, setOpen] = useState(defaultOpen);
  const [hidden, setHidden] = useState(dismissed);

  if (hidden) return null;

  const toneCls = TONE_MAP[tone];

  const dismiss = () => {
    setHidden(true);
    if (storageKey) {
      try { localStorage.setItem(`guidance:${storageKey}`, 'dismissed'); } catch {}
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl ring-1 overflow-hidden',
        toneCls.ring,
        className,
      )}
      style={{
        background: 'rgba(7, 4, 15, 0.55)',
        backdropFilter: 'blur(22px) saturate(170%)',
        WebkitBackdropFilter: 'blur(22px) saturate(170%)',
      }}
    >
      <div className={cn('absolute inset-0 pointer-events-none bg-gradient-to-br', toneCls.bg)} />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className={cn(
            'shrink-0 mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.06] border border-white/10',
            toneCls.icon,
          )}>
            <Lightbulb className="h-[18px] w-[18px]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] sm:text-[14px] font-bold text-white leading-tight">
                  {title}
                </p>
                {description && (
                  <p className="text-[12px] sm:text-[13px] text-white/70 mt-1 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {bullets && bullets.length > 0 && (
                  <button
                    onClick={() => setOpen(o => !o)}
                    aria-label={open ? 'Collapse details' : 'Expand details'}
                    className="w-7 h-7 rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors sm:hidden"
                  >
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                  </button>
                )}
                {storageKey && (
                  <button
                    onClick={dismiss}
                    aria-label="Dismiss"
                    className="w-7 h-7 rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {bullets && bullets.length > 0 && (
              <ul className={cn(
                'mt-3 space-y-1.5 text-[12px] sm:text-[13px] text-white/75',
                'sm:block',
                open ? 'block' : 'hidden',
              )}>
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className={cn('mt-1.5 w-1 h-1 rounded-full shrink-0', toneCls.icon, 'bg-current')} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
