import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: { id: string; label: string }[];
  current: number;
  onJump?: (i: number) => void;
}

/**
 * Linear-style slim step rail. Inspired by Mobbin reference
 * https://mobbin.com/screens/65efebb0... (Chronicle / Linear-import).
 *
 * Visual language:
 *   - A single thin track with numbered dots; the active dot is filled
 *     mint, prior dots are mint-outline + check, future dots are muted.
 *   - The current step's LABEL renders alongside its dot in mint; the
 *     other labels appear in muted text only on desktop, and stay
 *     hidden on mobile so the rail fits in the sticky header.
 *   - No glass card chrome — this is a horizontal sub-line under the
 *     page title, not a standalone surface.
 */
export function StepIndicator({ steps, current, onJump }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Composer steps"
      className="flex items-center gap-1 sm:gap-1.5"
    >
      {steps.map((step, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        const canJump = isDone && onJump !== undefined;
        const isLast = i === steps.length - 1;

        return (
          <div key={step.id} className="flex min-w-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              disabled={!canJump}
              onClick={canJump ? () => onJump?.(i) : undefined}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Step ${i + 1}: ${step.label}${isDone ? ' (done)' : ''}`}
              className={cn(
                'group inline-flex items-center gap-2 rounded-full transition-all',
                'min-h-[28px] shrink-0 whitespace-nowrap',
                canJump ? 'cursor-pointer' : 'cursor-default',
                isCurrent
                  ? 'pl-1 pr-3 bg-[#18d6a4]/12 ring-1 ring-inset ring-[#18d6a4]/40'
                  : 'pl-1 pr-1 sm:pr-2',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-all',
                  isCurrent && 'bg-[#18d6a4] text-[#07040F] shadow-[0_0_0_3px_rgba(46,255,192,0.18)]',
                  isDone && !isCurrent && 'bg-[#18d6a4]/15 text-[#2effc0]',
                  !isDone && !isCurrent && 'bg-white/[0.05] text-white/45',
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[11px] font-bold uppercase tracking-[0.16em] transition-colors',
                  isCurrent ? 'text-[#2effc0]' : 'hidden md:inline',
                  isDone && !isCurrent && 'md:text-white/65 md:group-hover:text-white',
                  !isDone && !isCurrent && 'md:text-white/35',
                )}
              >
                {step.label}
              </span>
            </button>
            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn(
                  'h-px w-3 shrink-0 transition-colors sm:w-5 md:w-6',
                  isDone ? 'bg-[#18d6a4]/35' : 'bg-white/[0.10]',
                )}
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
