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
 *
 * Empty-field policy: when an adviser/tenant field is missing, the
 * placeholder is NOT hidden. Instead we show a low-contrast hint
 * (e.g. "Your RERA BRN") and add `data-adviser-empty="true"` so the
 * adviser sees exactly where their profile data will land. Hiding
 * them previously made the closing slide look broken when the adviser
 * hadn't finished onboarding.
 */
function SlideMount({ slide, adviser, branding, visuals }: SlideMountProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Substitution runs synchronously after the DOM mount so the
  // adviser's data is in place before the slide is visible.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Adviser text placeholders. Each field has a hint shown when the
    // adviser hasn't filled it in yet — keeps the closing slide visible.
    const adviserMap: Record<string, { value?: string; hint: string }> = {
      full_name:    { value: adviser?.full_name,    hint: 'Your name' },
      title:        { value: adviser?.title,        hint: 'Your title' },
      phone:        { value: adviser?.phone,        hint: 'Add your phone' },
      email:        { value: adviser?.email,        hint: 'Add your email' },
      whatsapp:     { value: adviser?.whatsapp,     hint: 'Add WhatsApp' },
      calendar_url: { value: adviser?.calendar_url, hint: 'Book a call' },
      rera_number:  { value: adviser?.rera_number,  hint: 'Add your RERA BRN' },
    };
    root.querySelectorAll<HTMLElement>('[data-adviser]').forEach((el) => {
      const key = el.getAttribute('data-adviser') ?? '';
      const slot = adviserMap[key];
      if (!slot) return;
      const { value, hint } = slot;

      if (el.tagName === 'A' && key === 'calendar_url') {
        const a = el as HTMLAnchorElement;
        if (value) {
          a.href = value;
          a.removeAttribute('data-adviser-empty');
          a.style.opacity = '';
          a.style.pointerEvents = '';
        } else {
          a.href = '#';
          a.setAttribute('data-adviser-empty', 'true');
          a.style.opacity = '0.55';
          a.style.pointerEvents = 'none';
          if (!a.textContent?.trim()) a.textContent = hint;
        }
        a.style.display = '';
      } else if (el.tagName === 'IMG' && key === 'avatar_url') {
        const img = el as HTMLImageElement;
        if (adviser?.avatar_url) {
          img.src = adviser.avatar_url;
          img.removeAttribute('data-adviser-empty');
          img.style.opacity = '';
        } else {
          // 1x1 transparent so layout reserves the space.
          img.src =
            'data:image/svg+xml;utf8,' +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
                '<rect width="120" height="120" rx="60" fill="rgba(255,255,255,0.04)"/>' +
                '<circle cx="60" cy="48" r="20" fill="rgba(255,255,255,0.20)"/>' +
                '<path d="M20 110c0-22 18-36 40-36s40 14 40 36" fill="rgba(255,255,255,0.20)"/>' +
              '</svg>',
            );
          img.setAttribute('data-adviser-empty', 'true');
          img.style.opacity = '0.85';
        }
        img.style.display = '';
      } else {
        if (value) {
          el.textContent = value;
          el.removeAttribute('data-adviser-empty');
          el.style.opacity = '';
        } else {
          el.textContent = hint;
          el.setAttribute('data-adviser-empty', 'true');
          el.style.opacity = '0.55';
        }
        el.style.display = '';
      }
    });

    // Agency logo + RERA QR (tenant-level)
    root.querySelectorAll<HTMLImageElement>('[data-deck="agency_logo"]').forEach((img) => {
      if (branding.logo_url) {
        img.src = branding.logo_url;
        img.removeAttribute('data-deck-empty');
        img.style.opacity = '';
      } else {
        img.src =
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 60">' +
              '<rect width="220" height="60" rx="8" fill="rgba(255,255,255,0.05)"/>' +
              '<text x="110" y="36" font-family="Inter, sans-serif" font-size="13" font-weight="700" ' +
              'fill="rgba(255,255,255,0.45)" text-anchor="middle">YOUR AGENCY LOGO</text>' +
            '</svg>',
          );
        img.setAttribute('data-deck-empty', 'true');
        img.style.opacity = '0.85';
      }
      img.style.display = '';
    });
    root.querySelectorAll<HTMLImageElement>('[data-deck="rera_qr"]').forEach((img) => {
      if (adviser?.rera_qr_url) {
        img.src = adviser.rera_qr_url;
        img.removeAttribute('data-deck-empty');
        img.style.opacity = '';
      } else {
        // Stylised QR placeholder so the closing slide still shows a
        // QR-shaped block where the adviser's real one will land.
        img.src =
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
              '<rect width="100" height="100" rx="6" fill="white"/>' +
              '<g fill="#0a0a0b">' +
                '<rect x="8" y="8" width="22" height="22"/>' +
                '<rect x="13" y="13" width="12" height="12" fill="white"/>' +
                '<rect x="17" y="17" width="4" height="4" fill="#0a0a0b"/>' +
                '<rect x="70" y="8" width="22" height="22"/>' +
                '<rect x="75" y="13" width="12" height="12" fill="white"/>' +
                '<rect x="79" y="17" width="4" height="4" fill="#0a0a0b"/>' +
                '<rect x="8" y="70" width="22" height="22"/>' +
                '<rect x="13" y="75" width="12" height="12" fill="white"/>' +
                '<rect x="17" y="79" width="4" height="4" fill="#0a0a0b"/>' +
                '<rect x="40" y="14" width="4" height="4"/>' +
                '<rect x="50" y="14" width="4" height="4"/>' +
                '<rect x="44" y="22" width="4" height="4"/>' +
                '<rect x="56" y="22" width="4" height="4"/>' +
                '<rect x="40" y="30" width="4" height="4"/>' +
                '<rect x="50" y="30" width="4" height="4"/>' +
                '<rect x="40" y="40" width="4" height="4"/>' +
                '<rect x="48" y="40" width="4" height="4"/>' +
                '<rect x="56" y="40" width="4" height="4"/>' +
                '<rect x="44" y="48" width="4" height="4"/>' +
                '<rect x="52" y="48" width="4" height="4"/>' +
                '<rect x="40" y="56" width="4" height="4"/>' +
                '<rect x="48" y="56" width="4" height="4"/>' +
                '<rect x="56" y="56" width="4" height="4"/>' +
                '<rect x="40" y="70" width="4" height="4"/>' +
                '<rect x="48" y="70" width="4" height="4"/>' +
                '<rect x="56" y="70" width="4" height="4"/>' +
                '<rect x="44" y="78" width="4" height="4"/>' +
                '<rect x="52" y="78" width="4" height="4"/>' +
                '<rect x="60" y="78" width="4" height="4"/>' +
              '</g>' +
            '</svg>',
          );
        img.setAttribute('data-deck-empty', 'true');
        img.style.opacity = '0.9';
      }
      img.style.display = '';
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

    // Downscale Unsplash CDN URLs at runtime. The LLM almost always
    // requests w=1920; we render at 1280×800 so anything wider is
    // wasted bytes — and on low-power tabs (Edge Dev on battery)
    // 10 full-res photos easily push the renderer to OOM. Cap at
    // w=1280 q=82.
    root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src || !src.includes('images.unsplash.com')) return;
      try {
        const u = new URL(src);
        u.searchParams.set('w', '1280');
        u.searchParams.set('q', '82');
        u.searchParams.set('auto', 'format');
        img.src = u.toString();
      } catch { /* ignore */ }
      // Defer image decoding off the main thread so first paint is fast.
      img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    });

    // RealSight branding strip. Full-width SOLID footer ~36px tall
    // at the bottom of every 1280×800 slide. Solid dark background
    // (no gradient — must be plainly visible, not subtle). Top hairline
    // border separates it from slide content. No backdrop-filter so
    // mobile webview / Edge Dev / iOS WKWebView render it identically.
    // Always cleared and re-injected so a slide HTML re-render can't
    // leave a stale strip behind.
    root.querySelectorAll('[data-rs-watermark]').forEach((el) => el.remove());
    {
      const isClosing = slide.type_hint === 'closing';
      const strip = document.createElement('div');
      strip.setAttribute('data-rs-watermark', 'true');
      strip.style.cssText = [
        'position:absolute',
        'left:0',
        'right:0',
        'bottom:0',
        'height:52px', // bigger so it's genuinely visible at scaled-down sizes
        'z-index:2147483647',
        'pointer-events:none',
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'padding:0 36px',
        'background:#07040F',
        // 3px bright MINT top border — the visual signature that
        // makes the strip read as branded chrome rather than slide bg.
        'border-top:3px solid #18d6a4',
        'box-shadow:0 -2px 22px -2px rgba(46, 255, 192, 0.45), 0 -10px 20px -8px rgba(0, 0, 0, 0.6)',
        'font-family:Inter, system-ui, sans-serif',
        'color:#FFFFFF',
        'font-size:13px',
        'font-weight:700',
        'letter-spacing:0.04em',
        'transform:none',
        'opacity:1',
        'visibility:visible',
      ].join(';');

      const glyphSvg =
        '<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="flex-shrink:0;display:block;">' +
          '<rect width="24" height="24" rx="6" fill="#18d6a4"/>' +
          '<path d="M7.6 17V7h4.7c1.5 0 2.65.36 3.46 1.07.81.7 1.22 1.7 1.22 2.96 0 .9-.22 1.66-.65 2.27-.43.6-1.05 1.06-1.86 1.36L17.4 17h-2.6l-2.55-2.94H10V17H7.6Zm2.4-4.9h2.05c.74 0 1.3-.16 1.69-.49.38-.33.57-.79.57-1.4 0-.6-.19-1.06-.57-1.39-.39-.32-.95-.49-1.69-.49H10v3.77Z" fill="#07040F"/>' +
        '</svg>';

      strip.innerHTML =
        // Left side — bigger brand mark with two-line wordmark
        '<span style="display:inline-flex;align-items:center;gap:12px;">' +
          glyphSvg +
          `<span style="display:inline-flex;flex-direction:column;line-height:1.1;">` +
            `<span style="font-size:14px;font-weight:700;color:#FFFFFF;letter-spacing:0.01em;">${isClosing ? 'Created with RealSight' : 'Made with RealSight'}</span>` +
            `<span style="font-size:9.5px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:rgba(46,255,192,0.85);">AI-built · realsight.app</span>` +
          '</span>' +
        '</span>' +
        // Right side — slim live status pill
        '<span style="display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.65);">' +
          '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#2effc0;box-shadow:0 0 8px #18d6a4;"></span>' +
          'Live deck' +
        '</span>';
      root.appendChild(strip);
    }
  }, [slide.id, slide.html, slide.type_hint, adviser, branding.logo_url, visuals]);

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

/**
 * True while the browser is actually rendering for print (so the
 * hidden 10-slide stack only mounts when it's about to be captured
 * by the print dialog). Without this, every preview load mounts all
 * N slides at once, fetches every photo, and OOMs the tab.
 */
function usePrintMode(): boolean {
  const [isPrint, setIsPrint] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.matchMedia('print').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('print');
    const handler = (e: MediaQueryListEvent) => setIsPrint(e.matches);
    const beforeprint = () => setIsPrint(true);
    const afterprint = () => setIsPrint(false);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    window.addEventListener('beforeprint', beforeprint);
    window.addEventListener('afterprint', afterprint);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
      window.removeEventListener('beforeprint', beforeprint);
      window.removeEventListener('afterprint', afterprint);
    };
  }, []);
  return isPrint;
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
  const isPrint = usePrintMode();

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

      {/* Print: stack all slides for PDF capture. ONLY mount when the
          browser is actually entering print mode — beforeprint fires
          early enough to populate the DOM before paper layout starts.
          Skipping this on normal page loads saves ~10× image fetches
          and prevents low-power renderer OOM crashes. */}
      {isPrint ? (
        <div className="hidden print:block">
          {slides.map((s) => (
            <div key={`print-${s.id}`} className="deck-html-slide-print" style={{ pageBreakAfter: 'always' }}>
              <SlideMount slide={s} adviser={adviser} branding={branding} visuals={visuals} />
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
