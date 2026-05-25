import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: { id: string; label: string }[];
  current: number;
  onJump?: (i: number) => void;
}

/**
 * Numbered step pills with serif numerals — the reference look
 * from userflow.html. Active = gold bg + gold text + gold ring.
 * Done = gold border tinted, bone text. Pending = bone/15 border,
 * muted text.
 *
 * Mobile: scrolls horizontally; the active pill scrolls itself
 * into view via scrollIntoView.
 */
export function StepIndicator({ steps, current, onJump }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Composer steps"
      className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
    >
      <ol className="flex flex-1 min-w-0 items-center gap-2">
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
                  'group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition-colors whitespace-nowrap',
                  canJump ? 'cursor-pointer' : 'cursor-default',
                  isCurrent && 'border-gold bg-gold/[0.08] text-gold-light',
                  isDone && !isCurrent && 'border-gold/35 text-bone/70 hover:border-gold hover:text-gold-light',
                  !isDone && !isCurrent && 'border-bone/15 text-bone/55',
                )}
              >
                <span
                  className={cn(
                    'font-serif text-[15px] leading-none',
                    isCurrent && 'text-gold',
                    isDone && !isCurrent && 'text-gold/70',
                    !isDone && !isCurrent && 'text-bone/45',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="hidden font-sans sm:inline">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
