interface NavDotsProps {
  total: number;
  current: number;
  onSelect: (i: number) => void;
}

/**
 * Right-rail vertical dot navigation. Lifted from the reference deck.
 */
export function NavDots({ total, current, onSelect }: NavDotsProps) {
  return (
    <nav
      aria-label="Slide navigation"
      className="print:hidden fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
    >
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          aria-label={`Go to slide ${i + 1}`}
          aria-current={current === i ? 'true' : 'false'}
          className={`block h-2 w-2 rounded-full transition-all duration-300 ${
            current === i
              ? 'h-2.5 w-2.5 bg-gold shadow-[0_0_12px_rgba(212,175,55,0.6)]'
              : 'bg-bone/25 hover:bg-bone/50'
          }`}
        />
      ))}
    </nav>
  );
}
