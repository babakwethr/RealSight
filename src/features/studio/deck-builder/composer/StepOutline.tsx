import { useState } from 'react';
import { Sparkles, Loader2, RotateCw, Send, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';
import type { ComposerContext, DeckTheme } from './types';
import type { HtmlSlide } from '../runtime/HtmlStage';

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
  generic:        'Slide',
};

/**
 * Step 3 — Review script. V2 (generative HTML).
 *
 * Empty state: mint CTA → calls studio-deck-plan which now emits
 * full HTML+CSS for each slide.
 *
 * Populated state: vertical tile list. Each tile shows the slide
 * number, type_hint, an extracted heading preview, and a citation
 * badge if the slide had a data source. Inline edit isn't shown —
 * the HTML is too rich to type into a textarea. Instead the bottom
 * "Refine with AI" input lets the adviser say "make slide 3
 * punchier" or "replace the cover background with a marina shot"
 * and the AI rewrites that slide's HTML.
 */
export function StepOutline({ draft, setDraft }: ComposerContext) {
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineText, setRefineText] = useState('');
  /** index of the slide currently being re-written (so only its
   *  button shows the rotating gradient halo — like Google "AI loading"). */
  const [rewriteIndex, setRewriteIndex] = useState<number | null>(null);
  const slides = draft.html_slides;

  const callPlan = async (mode: 'plan' | 'refine', refineInstruction?: string) => {
    const body = {
      topic: draft.topic,
      audience: draft.audience,
      voice_notes: draft.voice_notes || undefined,
      contact_bg_prompt: draft.contact_bg_prompt || undefined,
      reference_asset_ids: draft.reference_assets.map((r) => r.asset_id),
      template_slug: draft.template_slug,
      deck_id: draft.id ?? undefined,
      mode,
      refine_instruction: refineInstruction,
    };
    const { data, error } = await supabase.functions.invoke('studio-deck-plan', { body });
    if (error) {
      let detail = '';
      try {
        const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
        const raw = ctx?.json ? await ctx.json() : null;
        const r = raw as { error?: string; details?: string } | null;
        detail = r?.error || r?.details || '';
      } catch { /* ignore */ }
      throw new Error(detail || error.message || 'AI service error');
    }
    const payload = data as {
      deck_id?: string;
      html_slides?: HtmlSlide[];
      theme?: DeckTheme;
      error?: string;
      details?: string;
    };
    if (payload.error || !payload.html_slides) {
      const tail = payload.details ? ` — ${payload.details.slice(0, 200)}` : '';
      throw new Error(`${payload.error || 'No slides returned'}${tail}`);
    }
    return {
      deckId: payload.deck_id ?? draft.id,
      html_slides: payload.html_slides,
      theme: payload.theme ?? null,
    };
  };

  const onGenerate = async () => {
    setGenerating(true);
    try {
      const { deckId, html_slides, theme } = await callPlan('plan');
      setDraft((d) => ({ ...d, id: deckId ?? d.id, html_slides, theme, outline: null }));
      void mediumTap();
      toast.success(`Deck ready · ${html_slides.length} slides`);
    } catch (err) {
      toast.error('Could not draft the deck', { description: (err as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  const onRefineAll = async () => {
    const instruction = refineText.trim();
    if (!instruction || refining) return;
    setRefining(true);
    try {
      const { deckId, html_slides, theme } = await callPlan('refine', instruction);
      setDraft((d) => ({ ...d, id: deckId ?? d.id, html_slides, theme }));
      setRefineText('');
      void mediumTap();
      toast.success('Deck refined');
    } catch (err) {
      toast.error('Could not refine', { description: (err as Error).message });
    } finally {
      setRefining(false);
    }
  };

  const onRePromptSlide = async (slideIdx: number, slide: HtmlSlide) => {
    setRefining(true);
    setRewriteIndex(slideIdx);
    try {
      const instruction = `Re-write slide ${slideIdx + 1} (id "${slide.id}", type "${slide.type_hint}") ONLY. Preserve the rest of the deck. Invent a new layout for this slide that's more visually striking and punchier than the previous version.`;
      const { deckId, html_slides, theme } = await callPlan('refine', instruction);
      setDraft((d) => ({ ...d, id: deckId ?? d.id, html_slides, theme }));
      void mediumTap();
      toast.success('Slide rewritten');
    } catch (err) {
      toast.error('Re-write failed', { description: (err as Error).message });
    } finally {
      setRefining(false);
      setRewriteIndex(null);
    }
  };

  // Empty state
  if (!slides || slides.length === 0) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center backdrop-blur-md">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2effc0]/30 via-[#18d6a4]/20 to-transparent">
          <Sparkles className="h-7 w-7 text-[#18d6a4]" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#18d6a4]">
          03 — Review the script
        </div>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Ready to draft.</h2>
        <p className="mt-2 max-w-md text-sm text-white/60">
          The AI will design and write a unique 4–10 slide HTML deck based on
          your brief, pulling live numbers from the Dubai Land Department and
          your references.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || draft.topic.trim().length < 8}
          className={cn(
            'mt-7 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-black transition-all min-w-[220px] justify-center',
            'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
            'disabled:opacity-40 disabled:translate-y-0',
          )}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Drafting your deck…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Draft the deck
            </>
          )}
        </button>
        {generating ? (
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/40">
            Designing layouts · calling DLD · 40–90 seconds
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#18d6a4]">
            03 — Review the script
          </div>
          <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
            {slides.length} slides, ready to tweak.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/60">
            The AI invented a unique layout per slide using your template's
            palette. Tap "Re-write" to redesign a single slide, or use the
            refine box below for global changes.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 text-xs font-bold uppercase tracking-[0.14em] text-white/75 transition hover:border-white/[0.24] hover:text-white disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}
          Re-draft all
        </button>
      </div>

      <div className="mt-6 space-y-2.5">
        {slides.map((slide, i) => (
          <SlideTile
            key={slide.id}
            index={i}
            slide={slide}
            disabled={refining || generating}
            isRewriting={rewriteIndex === i}
            onRePrompt={() => onRePromptSlide(i, slide)}
          />
        ))}
      </div>

      {/* Scoped glow animation used by the "Re-write" button on the
          slide that's currently rewriting. Mirrors the Google "AI
          loading" gradient halo — only the clicked button animates. */}
      <style>{`
        @property --rs-glow-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes rs-glow-rotate {
          to { --rs-glow-angle: 360deg; }
        }
        .rs-glow-btn {
          position: relative;
          z-index: 0;
          isolation: isolate;
          --rs-glow-angle: 0deg;
          animation: rs-glow-rotate 1.8s linear infinite;
        }
        .rs-glow-btn::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 9999px;
          padding: 2px;
          background: conic-gradient(
            from var(--rs-glow-angle),
            #2effc0, #18d6a4, #6a5cff, #ff6ad9, #ffb86b, #2effc0
          );
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          z-index: -1;
        }
        .rs-glow-btn::after {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: 9999px;
          background: conic-gradient(
            from var(--rs-glow-angle),
            #2effc0, #18d6a4, #6a5cff, #ff6ad9, #ffb86b, #2effc0
          );
          filter: blur(14px);
          opacity: 0.55;
          z-index: -2;
        }
        @supports not (background: conic-gradient(from var(--rs-glow-angle), #000, #fff)) {
          .rs-glow-btn {
            box-shadow:
              0 0 0 2px rgba(46, 255, 192, 0.7),
              0 0 18px 4px rgba(46, 255, 192, 0.55),
              0 0 32px 8px rgba(106, 92, 255, 0.45);
          }
        }
      `}</style>

      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md">
        <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
          Refine the whole deck with AI
        </label>
        <div className="mt-2 flex items-end gap-2">
          <input
            type="text"
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            placeholder="e.g. Make the cover more cinematic. Drop slide 4. Add a stat-grid slide."
            disabled={refining}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onRefineAll();
              }
            }}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none backdrop-blur-md transition focus:border-[#18d6a4]/45 focus:ring-2 focus:ring-[#18d6a4]/20"
          />
          <button
            type="button"
            onClick={onRefineAll}
            disabled={!refineText.trim() || refining}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[11px] font-bold uppercase tracking-[0.14em] transition-all',
              'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
              'disabled:opacity-40 disabled:translate-y-0',
            )}
          >
            {refining ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

interface SlideTileProps {
  index: number;
  slide: HtmlSlide;
  disabled: boolean;
  isRewriting: boolean;
  onRePrompt: () => void;
}

function SlideTile({ index, slide, disabled, isRewriting, onRePrompt }: SlideTileProps) {
  const label = SLIDE_LABELS[slide.type_hint] ?? slide.type_hint;
  const headingPreview = extractFirstHeading(slide.html);
  const hasCitation = Boolean(slide.citation);
  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md transition-colors hover:border-white/[0.16]">
      <div className="flex items-start gap-3 p-4 sm:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-[#18d6a4]">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#18d6a4]">
              {label}
            </span>
            {hasCitation ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-[#18d6a4]/35 bg-[#18d6a4]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#2effc0]"
                title={`Sourced via ${slide.citation?.tool}`}
              >
                <Info className="h-2.5 w-2.5" />
                Data-backed
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-base font-bold leading-snug text-white sm:text-lg">
            {headingPreview || '(visual layout — open the preview)'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void lightTap();
            onRePrompt();
          }}
          disabled={disabled}
          className={cn(
            'relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition',
            isRewriting
              ? 'rs-glow-btn border-transparent bg-[#07040F] text-white'
              : 'border-white/[0.12] bg-white/[0.04] text-white/75 hover:border-[#18d6a4]/35 hover:text-white disabled:opacity-40',
          )}
        >
          {isRewriting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Re-writing
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Re-write
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function extractFirstHeading(html: string): string {
  if (!html) return '';
  const m = html.match(/<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/i);
  if (!m) return '';
  return m[2]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}
