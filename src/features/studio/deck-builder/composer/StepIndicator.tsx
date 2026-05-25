import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: { id: string; label: string }[];
  current: number;
  onJump?: (i: number) => void;
}

/**
 * Top-of-composer step indicator. Mobile shows pill dots only
 * (compact); desktop shows the dots + step labels.
 *
 * Tapping a completed step jumps back to it; future steps are
 * not tappable (must complete current first).
 */
export function StepIndicator({ steps, current, onJump }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Composer steps"
      className="flex items-center justify-center gap-1 sm:gap-2"
    >
      {steps.map((step, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        const canJump = isDone && onJump !== undefined;
        return (
          <button
            key={step.id}
            type="button"
            disabled={!canJump}
            onClick={canJump ? () => onJump?.(i) : undefined}
            className={cn(
              'group flex items-center gap-2 rounded-full transition-all',
              canJump ? 'cursor-pointer' : 'cursor-default',
            )}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`Step ${i + 1}: ${step.label}${isDone ? ' (done)' : ''}`}
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                isDone && 'bg-[#18d6a4] text-[#07040F]',
                isCurrent && 'bg-white/10 text-white ring-2 ring-[#18d6a4]/60',
                !isDone && !isCurrent && 'bg-white/[0.04] text-white/40',
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden text-xs font-semibold sm:inline',
                isCurrent ? 'text-white' : isDone ? 'text-white/70' : 'text-white/40',
              )}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
