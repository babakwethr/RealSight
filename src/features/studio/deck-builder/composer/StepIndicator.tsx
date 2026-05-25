import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: { id: string; label: string }[];
  current: number;
  onJump?: (i: number) => void;
}

/**
 * Numbered step pills — RealSight V3 CI (mint accent, glass surfaces,
 * Inter type, rounded-full). Same UX layout as the reference
 * (numbered, with labels visible on desktop), but the brand language
 * matches the rest of the app.
 *
 * Mobile: pills scroll horizontally if needed.
 */
export function StepIndicator({ steps, current, onJump }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Composer steps"
      className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
    >
      <ol className="flex flex-1 min-w-0 items-center gap-1.5 sm:gap-2">
        {steps.map((step, i) => {
          const isDone = i < current;
          const isCurrent = i === current;
          const canJump = isDone && onJump !== undefined;
          return (
            <li key={step.id} className="shrink-0">
              <button
                type="button"
                disabled={!canJump}
                onClick={canJump ? () => onJump?.(i) : undefined}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${step.label}${isDone ? ' (done)' : ''}`}
                className={cn(
                  'group inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all whitespace-nowrap',
                  canJump ? 'cursor-pointer' : 'cursor-default',
                  isCurrent && 'border-[#18d6a4]/55 bg-[#18d6a4]/10 text-white ring-2 ring-[#18d6a4]/25',
                  isDone && !isCurrent && 'border-[#18d6a4]/30 bg-white/[0.02] text-white/75 hover:border-[#18d6a4]/55 hover:text-white',
                  !isDone && !isCurrent && 'border-white/[0.08] bg-white/[0.02] text-white/45',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black',
                    isCurrent && 'bg-[#18d6a4] text-[#07040F]',
                    isDone && !isCurrent && 'bg-[#18d6a4]/20 text-[#18d6a4]',
                    !isDone && !isCurrent && 'bg-white/[0.06] text-white/55',
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
