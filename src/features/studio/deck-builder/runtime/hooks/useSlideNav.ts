import { useEffect, useRef } from 'react';

interface UseSlideNavArgs {
  current: number;
  total: number;
  setCurrent: (n: number) => void;
  enabled: boolean;
}

const NAV_LOCK_MS = 650;

/**
 * Keyboard + scroll navigation between slides. Locked for
 * NAV_LOCK_MS after each transition to debounce rapid input.
 *
 * Keys: ArrowRight / PageDown / Space → next
 *       ArrowLeft  / PageUp           → prev
 *       Home                          → first
 *       End                           → last
 * Wheel: |deltaY| ≥ 24                → step
 *
 * Lifted verbatim from the reference deck.
 */
export function useSlideNav({ current, total, setCurrent, enabled }: UseSlideNavArgs) {
  const lockedUntil = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const tryGo = (delta: number) => {
      const now = performance.now();
      if (now < lockedUntil.current) return;
      const next = Math.max(0, Math.min(total - 1, current + delta));
      if (next === current) return;
      lockedUntil.current = now + NAV_LOCK_MS;
      setCurrent(next);
    };

    const tryJump = (target: number) => {
      const now = performance.now();
      if (now < lockedUntil.current) return;
      if (target === current) return;
      lockedUntil.current = now + NAV_LOCK_MS;
      setCurrent(target);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        tryGo(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        tryGo(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        tryJump(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        tryJump(total - 1);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 24) return;
      tryGo(e.deltaY > 0 ? 1 : -1);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
    };
  }, [current, total, setCurrent, enabled]);
}
