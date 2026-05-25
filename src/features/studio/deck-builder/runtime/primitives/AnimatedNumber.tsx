import { useEffect, useState } from 'react';
import { useStaticMode } from '../static-mode';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Counts up from zero to `value` over `duration` ms when the slide
 * mounts. In static mode (print / PDF / mobile-stacked) renders the
 * final value immediately so PDF export captures finished counters.
 *
 * Lifted verbatim from the reference deck (import path adjusted).
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 800,
  format,
  className,
}: AnimatedNumberProps) {
  const isStatic = useStaticMode();
  const [display, setDisplay] = useState(isStatic ? value : 0);

  useEffect(() => {
    if (isStatic) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const delta = value;
    let raf = 0;

    const tick = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, isStatic]);

  const text = format
    ? format(display)
    : display.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return <span className={className}>{text}</span>;
}
