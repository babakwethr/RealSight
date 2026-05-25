/**
 * Stage — the deck render canvas.
 *
 * Two layouts, driven by the viewport:
 *   - Desktop (≥1024px): a fixed 1280×800 canvas, scaled-to-fit and
 *     centred. One slide at a time with cross-dissolve transitions.
 *     Keyboard / wheel nav. Chrome overlays (progress bar, dots,
 *     counter, print + fullscreen buttons).
 *   - Mobile / iPad portrait: all slides stacked vertically,
 *     StaticMode forced so animations skip and PDF print captures
 *     final frames.
 *
 * Source-agnostic: the same Stage renders an editor preview, a
 * public deck via the share link, and the print/PDF stacked layout.
 *
 * Lifted from the reference deck's App.tsx desktop branch, adapted
 * so the slide list is a prop (`outline`) and the slide components
 * are resolved through the active template registry.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StaticModeProvider } from './static-mode';
import { useIsDesktop } from './hooks/useMediaQuery';
import { useSlideNav } from './hooks/useSlideNav';
import { NavDots } from './components/NavDots';
import { ProgressBar } from './components/ProgressBar';
import { SlideCounter } from './components/SlideCounter';
import { PrintButton } from './components/PrintButton';
import { FullscreenButton } from './components/FullscreenButton';
import type {
  OutlineEntry,
  Branding,
  AdviserContact,
  SlideProps,
  SlideType,
} from './types';
import { CINEMATIC_GOLD } from './templates/cinematic-gold';
import './runtime.css';

import type { ComponentType } from 'react';

// Template registry — Phase 1 ships Cinematic Gold; task #17 adds
// the other three (architectural-bold, editorial-light, investor-brief).
const TEMPLATES: Record<string, Record<SlideType, ComponentType<SlideProps>>> = {
  'cinematic-gold': CINEMATIC_GOLD,
};

const CANVAS_W = 1280;
const CANVAS_H = 800;

/** Scale the fixed 1280×800 canvas to fit any screen, letterboxed. */
function useFitScale() {
  const [scale, setScale] = useState(() =>
    typeof window === 'undefined'
      ? 1
      : Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H),
  );
  useEffect(() => {
    const update = () =>
      setScale(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('fullscreenchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('fullscreenchange', update);
    };
  }, []);
  return scale;
}

/**
 * Browsers require a user gesture to enter fullscreen on load.
 * When enabled (public share view), enter fullscreen on the viewer's
 * first tap / key press.
 */
function useEnterFullscreenOnce(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const go = () => {
      document.documentElement.requestFullscreen?.().catch(() => {});
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
    };
    window.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
    return cleanup;
  }, [enabled]);
}

export interface StageProps {
  /** Which template to render (e.g. 'cinematic-gold'). */
  templateSlug: string;
  /** The deck outline (5–10 entries). Cover first, closing last. */
  outline: OutlineEntry[];
  /**
   * Per-slide image URLs, keyed by slide index OR slide_type.
   * Looked up as visuals[index] first, then visuals[slide_type].
   */
  visuals?: Record<string, string>;
  /** Tenant + adviser branding overlay. */
  branding: Branding;
  /** Adviser contact — required for the closing slide. */
  adviser?: AdviserContact;
  /** Auto-enter fullscreen on first user gesture. Use only for the
   *  public share view, not the editor preview. */
  enableFullscreenOnFirstTap?: boolean;
  /** Hide chrome overlays (progress bar, nav dots, counter,
   *  buttons). Use for embedded preview tiles. Defaults to true. */
  showChrome?: boolean;
}

export function Stage({
  templateSlug,
  outline,
  visuals = {},
  branding,
  adviser,
  enableFullscreenOnFirstTap = false,
  showChrome = true,
}: StageProps) {
  const isDesktop = useIsDesktop();
  const [current, setCurrent] = useState(0);
  const total = outline.length;
  const scale = useFitScale();
  const templateMap = TEMPLATES[templateSlug] ?? TEMPLATES['cinematic-gold'];

  useSlideNav({ current, total, setCurrent, enabled: isDesktop && total > 1 });
  useEnterFullscreenOnce(enableFullscreenOnFirstTap);

  // Clamp current if outline length shrank (e.g. user removed slides
  // in the editor).
  useEffect(() => {
    if (current >= total && total > 0) setCurrent(total - 1);
  }, [current, total]);

  if (total === 0) {
    return (
      <div className="deck-runtime flex h-full min-h-[320px] w-full items-center justify-center bg-ink-900 text-bone/55">
        <div className="text-center">
          <div className="mb-2 text-sm uppercase tracking-[0.3em] text-gold/70">
            Empty deck
          </div>
          <p className="text-base">Generate an outline to preview slides here.</p>
        </div>
      </div>
    );
  }

  const resolveVisual = (entry: OutlineEntry, idx: number): string | undefined =>
    visuals[String(idx)] ?? visuals[entry.slide_type];

  // Small screens / iPad portrait: render all slides stacked.
  if (!isDesktop) {
    return (
      <StaticModeProvider value={true}>
        <main className="deck-runtime min-h-screen w-full bg-ink-900 text-bone">
          {outline.map((entry, i) => {
            const SlideComp = templateMap[entry.slide_type];
            return (
              <SlideComp
                key={`m-${i}`}
                index={i}
                isMobile
                entry={entry}
                branding={branding}
                adviser={adviser}
                visual={resolveVisual(entry, i)}
              />
            );
          })}
          {showChrome ? <PrintButton /> : null}
        </main>
      </StaticModeProvider>
    );
  }

  const ActiveEntry = outline[current];
  const ActiveSlide = templateMap[ActiveEntry.slide_type];

  return (
    <main className="deck-runtime bg-ink-900 text-bone">
      {/* Screen: the 1280×800 canvas, scaled to fit and centred. */}
      <div className="print:hidden fixed inset-0 flex items-center justify-center overflow-hidden bg-ink-900">
        <div
          className="relative shrink-0"
          style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})` }}
        >
          {showChrome ? (
            <>
              <ProgressBar current={current} total={total} />
              <NavDots total={total} current={current} onSelect={setCurrent} />
              <SlideCounter current={current} total={total} />
              <PrintButton />
              <FullscreenButton />
            </>
          ) : null}
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.045 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.992 }}
                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
              >
                <ActiveSlide
                  index={current}
                  entry={ActiveEntry}
                  branding={branding}
                  adviser={adviser}
                  visual={resolveVisual(ActiveEntry, current)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Print: render all slides stacked so PDF export captures every page. */}
      <div className="hidden print:block">
        <StaticModeProvider value={true}>
          {outline.map((entry, i) => {
            const SlideComp = templateMap[entry.slide_type];
            return (
              <SlideComp
                key={`print-${i}`}
                index={i}
                isMobile
                entry={entry}
                branding={branding}
                adviser={adviser}
                visual={resolveVisual(entry, i)}
              />
            );
          })}
        </StaticModeProvider>
      </div>
    </main>
  );
}
