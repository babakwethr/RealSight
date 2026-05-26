/**
 * Step 4 — Choose visuals (V3, Mobbin-grounded).
 *
 * Mobbin grounding:
 *   - Pitch media picker — left rail source switch + filter chips
 *     https://mobbin.com/screens/e0b2c3cf-921d-4b0c-bc78-41eea0399e37
 *   - Pitch stock search with aesthetic category chips
 *     https://mobbin.com/screens/6b1ea67d-e98d-46f8-9823-c5b900eb9fc5
 *   - Adobe Express all-in-one photos panel
 *     https://mobbin.com/screens/ba880785-ca2e-4e42-96ec-8705d2fee37f
 *
 * Behaviour: per-slide row with internal tabs Current / Upload / Stock.
 * Topic chips above the stock grid (Skyline / Interior / Construction /
 * Marina / Aerial). Live Unsplash search is deferred to a follow-up —
 * stock + upload sit as functional-but-disabled affordances so the
 * adviser sees the future shape now.
 *
 * The "Current" tab shows whatever the AI/template baked in (Unsplash
 * image already in the slide HTML, or a gradient fallback). That's the
 * default state and matches the V2 behaviour shipped previously.
 */

import { useState } from 'react';
import { Check, Image as ImageIcon, Sparkles, Upload as UploadIcon, Wand2 } from 'lucide-react';
import { CINEMATIC_GOLD_DEFAULT_PHOTOS } from '../runtime/templates/cinematic-gold/stock';
import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/capacitor';
import type { ComposerContext } from './types';
import type { SlideType } from '../runtime/types';

type Source = 'current' | 'upload' | 'stock';

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

const TOPIC_CHIPS = [
  'Skyline',
  'Interior',
  'Construction',
  'Marina',
  'Aerial',
  'Lifestyle',
  'Abstract',
];

export function StepVisuals({ draft }: ComposerContext) {
  const slides: Array<{
    id?: string;
    slide_type?: string;
    type_hint?: string;
    headline?: string;
    html?: string;
  }> =
    draft.html_slides && draft.html_slides.length > 0
      ? draft.html_slides
      : (draft.outline ?? []);

  if (slides.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center text-white/55 backdrop-blur-md">
        <Wand2 className="mx-auto mb-3 h-6 w-6 text-[#18d6a4]/65" />
        Generate a deck in Step 3 first.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#18d6a4]/25 bg-[#18d6a4]/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#2effc0]">
            <ImageIcon className="h-3 w-3" />
            Step 4 of 5 — Choose visuals
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
            A photo for every slide.
          </h1>
          <p className="mt-2 max-w-lg text-sm text-white/55">
            Every slide already ships with a cinematic AI-picked photo. Swap
            any one with an upload or a curated stock pick.
          </p>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 backdrop-blur-md">
          {slides.length} slides
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {slides.map((entry, i) => {
          const typeKey = entry.type_hint ?? entry.slide_type ?? 'generic';
          const slideId = entry.id ?? String(i);
          const label = SLIDE_LABELS[typeKey] ?? typeKey;
          const overrideUrl =
            draft.visuals[slideId] ?? draft.visuals[String(i)] ?? draft.visuals[typeKey];
          const extractedImage = extractFirstImage(entry.html ?? '');
          const extractedGradient = extractFirstGradient(entry.html ?? '');
          const defaultUrl =
            CINEMATIC_GOLD_DEFAULT_PHOTOS[typeKey as SlideType] ?? null;
          const photo = overrideUrl ?? extractedImage ?? defaultUrl;
          const gradient = !photo && extractedGradient ? extractedGradient : null;
          const headlinePreview =
            entry.headline ?? extractFirstHeading(entry.html ?? '');

          return (
            <SlideVisualRow
              key={slideId}
              index={i}
              label={label}
              headline={headlinePreview}
              photo={photo}
              gradient={gradient}
              isOverride={Boolean(overrideUrl)}
            />
          );
        })}
      </div>

      {/* Soon-to-ship note */}
      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs text-white/55 backdrop-blur-md">
        <span className="mr-2 inline-flex items-center gap-1 rounded-full border border-[#18d6a4]/35 bg-[#18d6a4]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2effc0]">
          <Sparkles className="h-2.5 w-2.5" />
          Coming
        </span>
        Live Unsplash search + photo upload land in the next build. For now,
        every slide auto-picks a cinematic photo from the AI's chosen library.
        Your closing slide still pulls portrait + QR + agency logo from your
        profile.
      </div>
    </div>
  );
}

// ─── Per-slide row ─────────────────────────────────────────────────

interface SlideVisualRowProps {
  index: number;
  label: string;
  headline: string;
  photo: string | null;
  gradient: string | null;
  isOverride: boolean;
}

function SlideVisualRow({
  index,
  label,
  headline,
  photo,
  gradient,
  isOverride,
}: SlideVisualRowProps) {
  const [source, setSource] = useState<Source>('current');
  const [topic, setTopic] = useState<string | null>(null);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs font-bold text-[#18d6a4]">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#18d6a4]">
              {label}
            </div>
            <div className="truncate text-sm font-bold text-white">
              {headline || '(visual layout — open preview)'}
            </div>
          </div>
        </div>

        {/* Source tabs (Pitch pattern) */}
        <div className="hidden shrink-0 items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1 sm:flex">
          <Tab active={source === 'current'} label="Current" onClick={() => setSource('current')} />
          <Tab active={source === 'upload'}  label="Upload"  onClick={() => setSource('upload')}  soon />
          <Tab active={source === 'stock'}   label="Stock"   onClick={() => setSource('stock')}   soon />
        </div>
      </div>

      {/* Mobile tabs (full-width, second row) */}
      <div className="flex items-center justify-center gap-1 border-b border-white/[0.04] bg-white/[0.02] px-3 py-2 sm:hidden">
        <Tab active={source === 'current'} label="Current" onClick={() => setSource('current')} />
        <Tab active={source === 'upload'}  label="Upload"  onClick={() => setSource('upload')}  soon />
        <Tab active={source === 'stock'}   label="Stock"   onClick={() => setSource('stock')}   soon />
      </div>

      {/* Body */}
      <div className="p-4">
        {source === 'current' ? (
          <CurrentPanel photo={photo} gradient={gradient} isOverride={isOverride} label={label} />
        ) : source === 'upload' ? (
          <UploadPanel />
        ) : (
          <StockPanel topic={topic} onTopic={setTopic} />
        )}
      </div>
    </article>
  );
}

function Tab({
  active,
  label,
  onClick,
  soon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  soon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void lightTap();
        onClick();
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors',
        active
          ? 'bg-[#18d6a4]/15 text-[#2effc0] ring-1 ring-inset ring-[#18d6a4]/40'
          : 'text-white/55 hover:text-white',
      )}
    >
      {label}
      {soon ? (
        <span className="rounded-full border border-white/[0.10] bg-white/[0.04] px-1 text-[8px] font-bold tracking-[0.14em] text-white/55">
          Soon
        </span>
      ) : null}
    </button>
  );
}

// ── Panels ─────────────────────────────────────────────────────────

/**
 * Shrink Unsplash CDN URLs to a thumbnail size so the Step 4 grid
 * doesn't OOM the browser tab. Slide HTML usually embeds the full
 * w=1920 hero, which is 5× heavier than we need for a 260px preview.
 * Other hosts pass through unchanged.
 */
function thumbify(url: string | null, width = 400): string | null {
  if (!url) return null;
  if (!url.includes('images.unsplash.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('w', String(width));
    u.searchParams.set('q', '70');
    u.searchParams.set('auto', 'format');
    return u.toString();
  } catch {
    return url;
  }
}

function CurrentPanel({
  photo,
  gradient,
  isOverride,
  label,
}: {
  photo: string | null;
  gradient: string | null;
  isOverride: boolean;
  label: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[260px_1fr]">
      <div className="relative overflow-hidden rounded-xl border border-[#18d6a4]/45 ring-2 ring-[#18d6a4]/30">
        <div className="aspect-[16/10] w-full bg-[#0a0a0b]">
          {photo ? (
            <img
              src={thumbify(photo, 520) ?? photo}
              alt={`${label} background`}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : gradient ? (
            <div className="h-full w-full" style={{ background: gradient }} aria-hidden="true" />
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
      <div className="flex flex-col justify-center gap-2 text-sm text-white/75">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
          Current photo
        </div>
        <p>
          {isOverride
            ? 'A photo you picked is showing here.'
            : photo
              ? 'The AI baked this Unsplash photo into the slide. Looks good? Leave it.'
              : gradient
                ? 'This slide uses a gradient background — no photo.'
                : 'No photo on this slide yet.'}
        </p>
        <p className="text-xs text-white/45">
          Use Upload to put your own portrait or property shot here. Stock will
          pull from a curated Pexels + Unsplash library.
        </p>
      </div>
    </div>
  );
}

function UploadPanel() {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.14] bg-white/[0.02] px-5 py-8 text-center">
      <UploadIcon className="mx-auto h-6 w-6 text-white/45" />
      <div className="mt-2 text-sm font-bold text-white">Upload your own photo</div>
      <p className="mx-auto mt-1 max-w-xs text-xs text-white/55">
        Drag-and-drop or pick a file. JPG / PNG up to 12 MB. Saved to your
        Studio assets so you can reuse across decks.
      </p>
      <button
        type="button"
        disabled
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/55"
      >
        Pick a file
        <span className="rounded-full border border-white/[0.10] bg-white/[0.04] px-1.5 text-[9px] font-bold tracking-[0.14em] text-white/65">
          Soon
        </span>
      </button>
    </div>
  );
}

function StockPanel({
  topic,
  onTopic,
}: {
  topic: string | null;
  onTopic: (t: string | null) => void;
}) {
  return (
    <div>
      {/* Topic chips (Pitch pattern) */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            void lightTap();
            onTopic(null);
          }}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors',
            topic === null
              ? 'border-[#18d6a4]/55 bg-[#18d6a4]/10 text-[#2effc0]'
              : 'border-white/[0.08] bg-white/[0.02] text-white/55 hover:border-white/[0.18] hover:text-white',
          )}
        >
          All
        </button>
        {TOPIC_CHIPS.map((t) => {
          const active = t === topic;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                void lightTap();
                onTopic(t);
              }}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors',
                active
                  ? 'border-[#18d6a4]/55 bg-[#18d6a4]/10 text-[#2effc0]'
                  : 'border-white/[0.08] bg-white/[0.02] text-white/55 hover:border-white/[0.18] hover:text-white',
              )}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Placeholder grid — 6 tiles */}
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="relative aspect-[16/10] overflow-hidden rounded-lg border border-white/[0.06]"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  i % 2 === 0
                    ? 'linear-gradient(135deg, #1a1410 0%, #0a0a0b 60%, #060606 100%)'
                    : 'linear-gradient(135deg, #0f1a30 0%, #122443 60%, #07040F 100%)',
              }}
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/65">
              Stock · Soon
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-white/40">
        A curated stock library lands next — chosen so non-designers don't have
        to invent search terms.
      </p>
    </div>
  );
}

// ─── Extractors ────────────────────────────────────────────────────

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

function extractFirstImage(html: string): string | null {
  if (!html) return null;
  const matches = html.matchAll(/<img[^>]+src\s*=\s*["']([^"']+)["']/gi);
  for (const m of matches) {
    const src = m[1];
    if (!src) continue;
    if (src.startsWith('data:') || src.startsWith('blob:') || src === '') continue;
    return src;
  }
  return null;
}

function extractFirstGradient(html: string): string | null {
  if (!html) return null;
  const m = html.match(/background(?:-image)?\s*:\s*((?:linear|radial|conic)-gradient\([^;"]+\))/i);
  if (!m) return null;
  return m[1];
}
