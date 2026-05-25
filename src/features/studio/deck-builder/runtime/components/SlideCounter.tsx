interface SlideCounterProps {
  current: number;
  total: number;
}

/**
 * Bottom-right "01 / 10" counter. Lifted from the reference deck.
 */
export function SlideCounter({ current, total }: SlideCounterProps) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="print:hidden fixed bottom-6 right-8 z-30 hidden font-sans text-xs tracking-widest text-bone/40 lg:block">
      <span className="text-gold">{pad(current + 1)}</span>
      <span className="mx-2">/</span>
      <span>{pad(total)}</span>
    </div>
  );
}
