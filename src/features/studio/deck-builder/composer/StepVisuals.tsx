import { Image as ImageIcon, Upload as UploadIcon } from 'lucide-react';
import { CINEMATIC_GOLD_DEFAULT_PHOTOS } from '../runtime/templates/cinematic-gold/stock';
import type { ComposerContext } from './types';
import type { SlideType } from '../runtime/types';

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
 * Step 4 — Choose visuals. Per-slide 3-source picker matching the
 * userflow.html reference layout (Slide row · AI / Stock / Upload).
 *
 * V1 status: shows the current default Pexels photo for each slide
 * + an Upload placeholder. Real upload + curated stock library land
 * in the next round — keeping the visual layout faithful to the
 * reference now so when the picker lights up, no UI restructuring
 * is needed.
 */
export function StepVisuals({ draft }: ComposerContext) {
  const outline = draft.outline ?? [];

  if (outline.length === 0) {
    return (
      <div className="rounded-md border border-bone/10 bg-ink-900/40 p-10 text-center text-bone/55">
        Generate an outline in Step 3 first.
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold">
        04 — Choose your visuals
      </div>
      <h2 className="mt-2 font-serif text-4xl leading-tight text-bone">
        A photo for every slide.
      </h2>
      <p className="mt-2 max-w-xl text-sm text-bone/60">
        Each deck ships with cinematic golden-hour defaults. Upload your own
        portrait + property shots in the next build. Closing slide pulls its
        photo from your profile.
      </p>

      <div className="mt-6 space-y-5">
        {outline.map((entry, i) => {
          const label = SLIDE_LABELS[entry.slide_type] ?? entry.slide_type;
          const overrideUrl = draft.visuals[String(i)] ?? draft.visuals[entry.slide_type];
          const defaultUrl =
            CINEMATIC_GOLD_DEFAULT_PHOTOS[entry.slide_type as SlideType] ?? null;
          const photo = overrideUrl ?? defaultUrl;

          return (
            <article
              key={`${entry.slide_type}-${i}`}
              className="rounded-md border border-bone/10 bg-ink-900/40 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-bone/55">
                    Slide {String(i + 1).padStart(2, '0')} · {label}
                  </div>
                  <div className="font-serif text-xl text-bone truncate">
                    {entry.headline ?? '(headline pending)'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Default / current photo */}
                <div className="relative overflow-hidden rounded-sm border border-bone/10 ring-2 ring-gold/60">
                  <div className="aspect-[16/10] w-full bg-ink-800">
                    {photo ? (
                      <img
                        src={photo}
                        alt={`${label} background`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-bone/35">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <span className="absolute left-2 top-2 rounded-sm bg-ink-900/75 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-gold">
                    Selected
                  </span>
                </div>

                {/* Stock placeholder */}
                <div className="relative overflow-hidden rounded-sm border border-bone/10">
                  <div
                    className="aspect-[16/10] w-full"
                    style={{ background: 'linear-gradient(135deg, #1a1f29 0%, #352a18 60%, #0a0a0b 100%)' }}
                    aria-label="Curated stock — coming soon"
                  />
                  <span className="absolute left-2 top-2 rounded-sm bg-ink-900/75 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-bone/65">
                    Stock · Soon
                  </span>
                </div>

                {/* Upload placeholder */}
                <div className="flex aspect-[16/10] items-center justify-center rounded-sm border border-dashed border-bone/20 text-center">
                  <div>
                    <UploadIcon className="mx-auto h-4 w-4 text-bone/35" />
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-bone/40">
                      Upload · Soon
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        <div className="rounded-md border border-bone/10 bg-ink-800/40 p-4 text-xs text-bone/55">
          <span className="inline-block rounded-sm border border-gold/30 bg-gold/[0.06] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-gold mr-2">
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
