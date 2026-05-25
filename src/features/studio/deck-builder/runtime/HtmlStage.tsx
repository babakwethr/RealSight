/**
 * HtmlStage — renders AI-generated HTML slides.
 *
 * Each slide is a self-contained 1280×800 HTML fragment emitted by
 * Gemini, server-side sanitised before persisting. The stage mounts
 * each slide via dangerouslySetInnerHTML against pre-cleaned text
 * (no XSS surface — see supabase/functions/_shared/htmlSanitize.ts).
 *
 * After mount, a post-process walk replaces:
 *   - [data-adviser="full_name|title|phone|email|whatsapp|calendar_url|rera_number"]
 *     → adviser contact text values (or empty if missing).
 *   - [data-adviser="avatar_url"] (img)
 *     → adviser portrait URL.
 *   - [data-deck="agency_logo"] (img)
 *     → tenant logo URL.
 *   - [data-deck="rera_qr"] (img)
 *     → tenant RERA QR URL.
 *   - [data-deck-image="..."] (img)
 *     → user-uploaded override from deck.visuals (when set).
 *
 * Two layouts, driven by the viewport (same as old Stage.tsx):
 *   - Desktop ≥1024px: fixed 1280×800 canvas, scale-to-fit, centred,
 *     one slide at a time with cross-dissolve.
 *   - Mobile / iPad portrait: all slides stacked vertically.
 *
 * Theming: the resolved palette is applied as CSS variables on the
 * `.deck-html-stage` wrapper. Slide HTML uses only those vars, so
 * the same html_slides[] reads differently per template.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsDesktop } from './hooks/useMediaQuery';
import { useSlideNav } from './hooks/useSlideNav';
import { NavDots } from './components/NavDots';
import { ProgressBar } from './components/ProgressBar';
import { SlideCounter } from './components/SlideCounter';
import { PrintButton } from './components/PrintButton';
import { FullscreenButton } from './components/FullscreenButton';
import { resolveTheme, buildThemeStyle } from './themes';
import type { AdviserContact, Branding } from './types';

export interface HtmlSlide {
  id: string;
  type_hint: string;
  html: string;
  citation?: {
    tool: string;
    params: Record<string, unknown>;
    rows: number;
    fetched_at: string;
    source: string;
    window?: string;
  };
}

const CANVAS_W = 1280;
const CANVAS_H = 800;

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

interface SlideMountProps {
  slide: HtmlSlide;
  adviser?: AdviserContact;
  branding: Branding;
  visuals?: Record<string, string>;
}

/**
 * Renders one HTML slide and post-processes its DOM to substitute
 * adviser placeholders, agency logo, RERA QR, and per-slide image
 * overrides.
 */
function SlideMount({ slide, adviser, branding, visuals }: SlideMountProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Substitution runs synchronously after the DOM mount so the
  // adviser's data is in place before the slide is visible.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Adviser text placeholders
    const adviserMap: Record<string, string | undefined> = {
      full_name:    adviser?.full_name,
      title:        adviser?.title,
      phone:        adviser?.phone,
      email:        adviser?.email,
      whatsapp:     adviser?.whatsapp,
      calendar_url: adviser?.calendar_url,
      rera_number:  adviser?.rera_number,
    };
    root.querySelectorAll<HTMLElement>('[data-adviser]').forEach((el) => {
      const key = el.getAttribute('data-adviser') ?? '';
      const value = adviserMap[key];
      if (el.tagName === 'A' && key === 'calendar_url') {
        if (value) {
          (el as HTMLAnchorElement).href = value;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      } else if (el.tagName === 'IMG' && key === 'avatar_url') {
        if (adviser?.avatar_url) {
          (el as HTMLImageElement).src = adviser.avatar_url;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      } else {
        if (value) {
          el.textContent = value;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      }
    });

    // Agency logo + RERA QR (tenant-level)
    root.querySelectorAll<HTMLImageElement>('[data-deck="agency_logo"]').forEach((img) => {
      if (branding.logo_url) {
        img.src = branding.logo_url;
        img.style.display = '';
      } else {
        img.style.display = 'none';
      }
    });
    root.querySelectorAll<HTMLImageElement>('[data-deck="rera_qr"]').forEach((img) => {
      if (adviser?.rera_qr_url) {
        img.src = adviser.rera_qr_url;
        img.style.display = '';
      } else {
        img.style.display = 'none';
      }
    });

    // Per-slide user-uploaded image overrides
    if (visuals) {
      const override = visuals[slide.id] ?? visuals[slide.type_hint];
      if (override) {
        root.querySelectorAll<HTMLImageElement>('[data-deck-image]').forEach((img) => {
          img.src = override;
        });
      }
    }
  }, [slide.id, slide.html, adviser, branding.logo_url, visuals]);

  return (
    <div
      ref={ref}
      className="deck-html-slide"
      style={{
        position: 'relative',
        width: CANVAS_W,
        height: CANVAS_H,
        overflow: 'hidden',
      }}
      dangerouslySetInnerHTML={{ __html: slide.html }}
    />
  );
}

export interface HtmlStageProps {
  templateSlug: string;
  accentVariant?: string | null;
  slides: HtmlSlide[];
  branding: Branding;
  adviser?: AdviserContact;
  /** Per-slide image overrides keyed by slide id OR type_hint. */
  visuals?: Record<string, string>;
  /** Auto-enter fullscreen on first user gesture (public viewer). */
  enableFullscreenOnFirstTap?: boolean;
  /** Hide nav chrome (for embedded thumbnails). */
  showChrome?: boolean;
}

export function HtmlStage({
  templateSlug,
  accentVariant,
  slides,
  branding,
  adviser,
  visuals,
  enableFullscreenOnFirstTap = false,
  showChrome = true,
}: HtmlStageProps) {
  const isDesktop = useIsDesktop();
  const [current, setCurrent] = useState(0);
  const total = slides.length;
  const scale = useFitScale();

  // Resolve palette + apply via CSS variables. If the LLM picked an
  // accent variant inside the template family, the resolver layers
  // that override on top of the base.
  const theme = resolveTheme(templateSlug, accentVariant);
  const themeStyle = buildThemeStyle(theme);

  useSlideNav({ current, total, setCurrent, enabled: isDesktop && total > 1 });
  useEnterFullscreenOnce(enableFullscreenOnFirstTap);

  useEffect(() => {
    if (current >= total && total > 0) setCurrent(total - 1);
  }, [current, total]);

  if (total === 0) {
    return (
      <div
        className="deck-html-stage flex h-full min-h-[320px] w-full items-center justify-center"
        style={themeStyle}
      >
        <div className="text-center" style={{ color: 'var(--deck-muted)' }}>
          <div className="mb-2 text-sm uppercase tracking-[0.3em]" style={{ color: 'var(--deck-accent)' }}>
            Empty deck
          </div>
          <p>Generate slides to preview them here.</p>
        </div>
      </div>
    );
  }

  // Mobile / iPad portrait: stacked.
  if (!isDesktop) {
    return (
      <main className="deck-html-stage min-h-screen w-full" style={themeStyle}>
        {slides.map((s) => (
          <div
            key={s.id}
            className="deck-html-slide-wrap relative w-full"
            style={{ aspectRatio: '1280 / 800' }}
          >
            <div
              className="absolute left-0 top-0"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transformOrigin: 'top left',
                transform: 'scale(var(--mobile-scale))',
              }}
            >
              <SlideMount slide={s} adviser={adviser} branding={branding} visuals={visuals} />
            </div>
          </div>
        ))}
        {showChrome ? <PrintButton /> : null}
        <style>{`
          .deck-html-stage .deck-html-slide-wrap {
            --mobile-scale: calc(100vw / ${CANVAS_W});
          }
        `}</style>
      </main>
    );
  }

  // Desktop: 1280x800 canvas centred, scale-to-fit, cross-dissolve.
  const activeSlide = slides[current];

  return (
    <main className="deck-html-stage" style={themeStyle}>
      <div
        className="print:hidden fixed inset-0 flex items-center justify-center overflow-hidden"
        style={{ background: 'var(--deck-bg)' }}
      >
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
                key={activeSlide.id}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.045 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.992 }}
                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
              >
                <SlideMount
                  slide={activeSlide}
                  adviser={adviser}
                  branding={branding}
                  visuals={visuals}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Print: stack all slides for PDF capture. */}
      <div className="hidden print:block">
        {slides.map((s) => (
          <div key={`print-${s.id}`} className="deck-html-slide-print" style={{ pageBreakAfter: 'always' }}>
            <SlideMount slide={s} adviser={adviser} branding={branding} visuals={visuals} />
          </div>
        ))}
      </div>
    </main>
  );
}
