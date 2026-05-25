interface ProgressBarProps {
  current: number;
  total: number;
}

/**
 * Hairline gradient progress bar pinned to the top edge of the
 * canvas. Lifted from the reference deck.
 */
export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="print:hidden fixed left-0 right-0 top-0 z-30 hidden h-px bg-bone/10 lg:block">
      <div
        className="h-full bg-gradient-to-r from-gold-deep via-gold to-gold-light transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
