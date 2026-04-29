/**
 * useGlowOnView — IntersectionObserver hook that triggers the
 * `.is-visible` class once a card scrolls into view.
 *
 * Pair with the `.glow-on-view` modifier from `src/index.css`:
 *
 *   const cardRef = useGlowOnView();
 *   <div ref={cardRef} className="glass-panel accent-emerald glow-on-view">…</div>
 *
 * Behaviour:
 *   - Fires once per element (observer disconnects after first hit)
 *   - `rootMargin: -10% 0px` so the trigger only happens on actual
 *     scroll, not on initial render of cards already in viewport
 *   - SSR / no-IntersectionObserver fallback: instantly adds the
 *     class so cards never get stuck invisible
 */
import { useEffect, useRef } from 'react';

export function useGlowOnView<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Older browsers / SSR — just mark visible and bail.
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      {
        // Negative root margin keeps the entrance glow tied to actual
        // scroll motion. With 0px margin, every card visible at page
        // load would animate at once — visually noisy.
        rootMargin: '-10% 0px',
        threshold: 0.1,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
