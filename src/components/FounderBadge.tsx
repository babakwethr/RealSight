/**
 * FounderBadge — visible signal that the user is one of the first 1,000.
 *
 * Per LAUNCH_PLAN.md §14 step 10. Surface in:
 *   • Account page header
 *   • Sidebar profile chip (when `inline`)
 *   • Sent PDFs — adviser version pulls this from data.isFounder
 *
 * Returns null for non-founders so callers can drop it in unconditionally.
 */
import { Crown } from 'lucide-react';
import { useFounder } from '@/hooks/useFounder';

interface Props {
  variant?: 'pill' | 'inline' | 'banner';
  className?: string;
}

export function FounderBadge({ variant = 'pill', className = '' }: Props) {
  const { isFounder, loading } = useFounder();
  if (loading || !isFounder) return null;

  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-300/15 text-amber-200 border border-amber-300/35 ${className}`}
        title="One of the first 1,000 signups — locked-in launch pricing forever"
      >
        <Crown className="h-2.5 w-2.5" />
        Founder
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-300/15 via-transparent to-transparent ${className}`}
      >
        <Crown className="h-4 w-4 text-amber-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">You're a RealSight Founder</p>
          <p className="text-[11px] text-muted-foreground/80">
            One of the first 1,000 — launch pricing locked in for life.
          </p>
        </div>
      </div>
    );
  }

  // Default: pill
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-gradient-to-r from-amber-300/25 to-amber-300/5 text-amber-200 border border-amber-300/40 ${className}`}
      title="One of the first 1,000 signups — locked-in launch pricing forever"
    >
      <Crown className="h-3 w-3" />
      Founder
    </span>
  );
}
