import { Image as ImageIcon, Upload as UploadIcon, Check } from 'lucide-react';
import { CINEMATIC_GOLD_DEFAULT_PHOTOS } from '../runtime/templates/cinematic-gold/stock';
import type { ComposerContext } from './types';
import type { SlideType } from '../runtime/types';

function extractFirstHeading(html: string): string {
  if (!html) return '';
  const m = html.match(/<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/i);
  if (!m) return '';
  return m[2]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

const SLIDE_LABELS: Record<string, string> = {
  cover:          'Cover',
  why_now:        'Why now',
  market_trend:   'Market trend',
  signal:         'Signal',
  offplan_split:  'Off-plan vs Secondary',
  buyer:          'Know your buyer',
  top_volume:     'Top sale areas',
  top_yield:      'Top rental areas',
  strategy:       'Strategy',
  closing:        'Closing',
};

/**
 * Step 4 — Choose visuals.
 *
 * UX matches reference (per-slide 3-source row). CI is RealSight V3:
 * glass card chrome, mint accent on selection, Inter type, rounded-2xl.
 */
export function StepVisuals({ draft }: ComposerContext) {
  // V2 — iterate over html_slides when present; fall back to legacy
  // outline for decks generated before the HTML rewrite.
  const slides: Array<{ id?: string; slide_type?: string; type_hint?: string; headline?: string; html?: string }> =
    draft.html_slides && draft.html_slides.length > 0
      ? draft.html_slides
      : (draft.outline ?? []);

  if (slides.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center text-white/55 backdrop-blur-md">
        Generate a deck in Step 3 first.
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#18d6a4]">
        04 — Choose your visuals
      </div>
      <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
        A photo for every slide.
      </h2>
      <p className="mt-2 max-w-xl text-sm text-white/60">
        Each deck ships with cinematic golden-hour defaults. Upload your own
        portrait + property shots in the next build. Closing slide pulls its
        photo from your profile.
      </p>

      <div className="mt-6 space-y-3">
        {slides.map((entry, i) => {
          const typeKey = entry.type_hint ?? entry.slide_type ?? 'generic';
          const slideId = entry.id ?? String(i);
          const label = SLIDE_LABELS[typeKey] ?? typeKey;
          const overrideUrl = draft.visuals[slideId] ?? draft.visuals[String(i)] ?? draft.visuals[typeKey];
          const defaultUrl =
            CINEMATIC_GOLD_DEFAULT_PHOTOS[typeKey as SlideType] ?? null;
          const photo = overrideUrl ?? defaultUrl;
          const headlinePreview =
            entry.headline ?? extractFirstHeading(entry.html ?? '');

          return (
            <article
              key={slideId}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#18d6a4]">
                    Slide {String(i + 1).padStart(2, '0')} · {label}
                  </div>
                  <div className="truncate text-base font-bold text-white">
                    {headlinePreview || '(visual layout — open preview)'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Current / Selected photo */}
                <div className="relative overflow-hidden rounded-xl border border-[#18d6a4]/45 ring-2 ring-[#18d6a4]/30">
                  <div className="aspect-[16/10] w-full bg-[#0a0a0b]">
                    {photo ? (
                      <img
                        src={photo}
                        alt={`${label} background`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/35">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#18d6a4]/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#0a0814]">
                    <Check className="h-2.5 w-2.5" />
                    Selected
                  </span>
                </div>

                {/* Stock placeholder */}
                <div className="relative overflow-hidden rounded-xl border border-white/[0.08]">
                  <div
                    className="aspect-[16/10] w-full"
                    style={{ background: 'linear-gradient(135deg, #0f1a30 0%, #122443 60%, #07040F 100%)' }}
                    aria-label="Curated stock — coming soon"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-white/[0.10] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/70 backdrop-blur">
                    Stock · Soon
                  </span>
                </div>

                {/* Upload placeholder */}
                <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-white/[0.16] text-center">
                  <div>
                    <UploadIcon className="mx-auto h-4 w-4 text-white/35" />
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                      Upload · Soon
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs text-white/55 backdrop-blur-md">
          <span className="mr-2 inline-flex items-center gap-1 rounded-full border border-[#18d6a4]/35 bg-[#18d6a4]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2effc0]">
            Coming
          </span>
          Photo upload + curated cinematic stock library — next build. The
          closing slide already auto-fills from your profile (avatar, RERA QR,
          contact details).
        </div>
      </div>
    </div>
  );
}
