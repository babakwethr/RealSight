/**
 * Step 3 — Review the script (V3, Mobbin-grounded).
 *
 * Mobbin grounding:
 *   - Gamma outline with numbered cards + bullets
 *     https://mobbin.com/screens/9c722748-1af1-4cab-a352-c8706aad29d2
 *   - Gamma Agent right-rail with Original vs Modified previews
 *     https://mobbin.com/screens/aa564aa8-83bc-44d0-9f54-f6df923c87be
 *
 * Behaviour:
 *   - Each slide is a numbered card with a title + 2-3 outline bullets
 *     extracted from the HTML (h-tags and lead paragraphs).
 *   - Tapping Re-write on a card kicks off a refine call but DOES NOT
 *     overwrite the deck. The result lands as a pendingCandidate that
 *     opens a right-rail panel showing Original vs Rewritten outlines
 *     side-by-side. Accept commits; Reject discards.
 *   - The bottom Refine bar still does global rewrites for things like
 *     "drop the word 'opportunity' everywhere" — those apply directly
 *     (no diff) because they touch every slide.
 *
 * CI: RealSight V3 navy/mint glass. Loading Re-write keeps the
 * rotating gradient halo from the previous build.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Info,
  Loader2,
  Plus,
  RotateCw,
  Send,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
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

interface PendingCandidate {
  /** The slide id that's being rewritten. */
  slideId: string;
  /** The slide index in the outline (used for the diff column ordinal). */
  index: number;
  /** The pre-rewrite version of the slide (for the "Original" column). */
  original: HtmlSlide;
  /** The full new html_slides array returned by the API. We commit the
   *  whole thing on accept so non-target slides remain consistent. */
  candidateDeck: HtmlSlide[];
  candidateTheme: DeckTheme | null;
}

export function StepOutline({ draft, setDraft }: ComposerContext) {
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [rewriteIndex, setRewriteIndex] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingCandidate | null>(null);
  const slides = draft.html_slides;

  const callPlan = async (
    mode: 'plan' | 'refine',
    refineInstruction?: string,
  ) => {
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

  const onGlobalRefine = async () => {
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

  /** Per-slide Re-write — opens diff panel, doesn't commit immediately. */
  const onRePromptSlide = async (slideIdx: number, slide: HtmlSlide) => {
    if (refining) return;
    setRefining(true);
    setRewriteIndex(slideIdx);
    try {
      const instruction = `Re-write slide ${slideIdx + 1} (id "${slide.id}", type "${slide.type_hint}") ONLY. Preserve the rest of the deck. Invent a new layout for this slide that's more visually striking and punchier than the previous version.`;
      const { html_slides, theme } = await callPlan('refine', instruction);
      setPending({
        slideId: slide.id,
        index: slideIdx,
        original: slide,
        candidateDeck: html_slides,
        candidateTheme: theme,
      });
      void mediumTap();
    } catch (err) {
      toast.error('Re-write failed', { description: (err as Error).message });
    } finally {
      setRefining(false);
      setRewriteIndex(null);
    }
  };

  const acceptPending = () => {
    if (!pending) return;
    void mediumTap();
    setDraft((d) => ({ ...d, html_slides: pending.candidateDeck, theme: pending.candidateTheme }));
    toast.success(`Slide ${pending.index + 1} updated`);
    setPending(null);
  };

  const rejectPending = () => {
    if (!pending) return;
    void lightTap();
    setPending(null);
    toast('Kept the original', { description: 'No changes applied.' });
  };

  // ── Empty state ──────────────────────────────────────────────────
  if (!slides || slides.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#18d6a4]/25 bg-[#18d6a4]/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#2effc0]">
            <Wand2 className="h-3 w-3" />
            Step 3 of 5 — Draft the script
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Ready when you are.
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
            The AI will design and write a unique 5–10 slide deck from your
            brief, pulling live numbers from the DLD and any references you
            attached.
          </p>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || draft.topic.trim().length < 8}
            className={cn(
              'mt-7 inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-black uppercase tracking-[0.14em] transition-all',
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
            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
              Designing layouts · calling DLD · 40–90 seconds
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Populated state ──────────────────────────────────────────────
  return (
    <>
      <div className="mx-auto max-w-4xl">
        {/* Hero + Re-draft action */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#18d6a4]/25 bg-[#18d6a4]/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#2effc0]">
              <Wand2 className="h-3 w-3" />
              Step 3 of 5 — Review the script
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
              {slides.length} slides, ready to tweak.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/55">
              Each card shows the AI's outline for that slide. Tap{' '}
              <span className="inline-flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
                <Sparkles className="h-2.5 w-2.5" /> Re-write
              </span>{' '}
              to redesign just that one and review the change before applying.
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.04] px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/75 transition hover:border-white/[0.24] hover:text-white disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
            Re-draft all
          </button>
        </div>

        {/* Numbered cards */}
        <div className="mt-6 space-y-2.5">
          {slides.map((slide, i) => (
            <SlideOutlineCard
              key={slide.id}
              index={i}
              slide={slide}
              total={slides.length}
              disabled={refining || generating}
              isRewriting={rewriteIndex === i}
              onRePrompt={() => onRePromptSlide(i, slide)}
            />
          ))}

          {/* "+ Add slide" floater — placeholder for next build */}
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.02] p-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45 transition hover:border-white/[0.18]"
            title="Manual add coming next — use the refine box for now"
          >
            <Plus className="h-3.5 w-3.5" />
            Add a slide
            <span className="rounded-full border border-white/[0.10] bg-white/[0.04] px-1.5 text-[9px] font-bold tracking-[0.14em] text-white/55">
              Soon
            </span>
          </button>
        </div>

        {/* Global refine bar */}
        <div className="sticky bottom-3 z-20 mt-6 sm:bottom-6">
          <div className="rounded-2xl border border-white/[0.10] bg-[#07040F]/85 p-3 backdrop-blur-xl shadow-2xl">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
              Refine the whole deck
            </label>
            <div className="mt-1.5 flex items-end gap-2">
              <input
                type="text"
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                placeholder='e.g. "Drop the word opportunity everywhere" or "Make slide 4 less salesy"'
                disabled={refining}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onGlobalRefine();
                  }
                }}
                className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#18d6a4]/45 focus:ring-2 focus:ring-[#18d6a4]/20"
              />
              <button
                type="button"
                onClick={onGlobalRefine}
                disabled={!refineText.trim() || refining}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[11px] font-black uppercase tracking-[0.14em] transition-all',
                  'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
                  'disabled:opacity-40 disabled:translate-y-0',
                )}
              >
                {refining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rotating glow keyframes for Re-write loader */}
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

      {/* ── Diff drawer — Original vs Rewritten ────────────────────── */}
      <AnimatePresence>
        {pending ? (
          <>
            <motion.div
              key="diff-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
              onClick={rejectPending}
            />
            <motion.div
              key="diff-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
              className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-white/[0.10] bg-[#0c0a1a]/95 backdrop-blur-2xl sm:w-[min(720px,90vw)]"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0)',
                paddingBottom: 'env(safe-area-inset-bottom, 0)',
              }}
            >
              <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2effc0]">
                    Review the rewrite
                  </div>
                  <h2 className="mt-0.5 text-lg font-bold text-white">
                    Slide {pending.index + 1} ·{' '}
                    {SLIDE_LABELS[pending.original.type_hint] ?? pending.original.type_hint}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={rejectPending}
                  aria-label="Close"
                  className="rounded-full border border-white/[0.10] bg-white/[0.04] p-1.5 text-white/75 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DiffColumn
                    label="Original"
                    tone="muted"
                    slide={pending.original}
                  />
                  <DiffColumn
                    label="Rewritten"
                    tone="mint"
                    slide={
                      pending.candidateDeck.find((s) => s.id === pending.slideId) ?? pending.original
                    }
                  />
                </div>
              </div>

              <footer className="flex items-center gap-2 border-t border-white/[0.08] px-5 py-4">
                <button
                  type="button"
                  onClick={rejectPending}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.04] text-[11px] font-bold uppercase tracking-[0.14em] text-white/75 transition hover:border-white/[0.24] hover:text-white"
                >
                  Keep original
                </button>
                <button
                  type="button"
                  onClick={acceptPending}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[11px] font-black uppercase tracking-[0.14em] text-[#0a0814] transition-all hover:-translate-y-[1px]"
                >
                  <Check className="h-3.5 w-3.5" />
                  Use rewrite
                </button>
              </footer>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

// ─── Slide outline card ────────────────────────────────────────────

interface SlideOutlineCardProps {
  index: number;
  slide: HtmlSlide;
  total: number;
  disabled: boolean;
  isRewriting: boolean;
  onRePrompt: () => void;
}

function SlideOutlineCard({
  index,
  slide,
  total,
  disabled,
  isRewriting,
  onRePrompt,
}: SlideOutlineCardProps) {
  const label = SLIDE_LABELS[slide.type_hint] ?? slide.type_hint;
  const outline = useMemo(() => extractOutline(slide.html), [slide.html]);
  const hasCitation = Boolean(slide.citation);
  const isCover = slide.type_hint === 'cover' || index === 0;
  const isClosing = slide.type_hint === 'closing' || index === total - 1;

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white/[0.03] backdrop-blur-md transition-colors',
        isRewriting
          ? 'border-[#18d6a4]/45 bg-[#18d6a4]/[0.04]'
          : 'border-white/[0.08] hover:border-white/[0.18]',
      )}
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4">
        {/* Number tile */}
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-[#18d6a4]">
          {String(index + 1).padStart(2, '0')}
          {isCover ? (
            <span className="absolute -top-1 -right-1 rounded-full bg-[#18d6a4]/90 px-1 text-[8px] font-black text-[#0a0814]">
              C
            </span>
          ) : null}
          {isClosing ? (
            <span className="absolute -top-1 -right-1 rounded-full bg-white/[0.20] px-1 text-[8px] font-black text-white">
              END
            </span>
          ) : null}
        </span>

        {/* Outline body */}
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
          {/* Headline */}
          <div className="mt-1 text-base font-bold leading-snug text-white sm:text-lg">
            {outline.title || '(visual layout — open the preview)'}
          </div>
          {/* Bullets */}
          {outline.bullets.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {outline.bullets.slice(0, 3).map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                  <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-white/[0.35]" />
                  <span className="line-clamp-2">{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-white/40">
              Visual-only slide — no outline text.
            </p>
          )}
        </div>

        {/* Re-write CTA */}
        <button
          type="button"
          onClick={() => {
            void lightTap();
            onRePrompt();
          }}
          disabled={disabled}
          className={cn(
            'relative inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition',
            isRewriting
              ? 'rs-glow-btn border-transparent bg-[#07040F] text-white'
              : 'border-white/[0.10] bg-white/[0.04] text-white/75 hover:border-[#18d6a4]/35 hover:text-white disabled:opacity-40',
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

// ─── Diff column ───────────────────────────────────────────────────

function DiffColumn({
  label,
  tone,
  slide,
}: {
  label: string;
  tone: 'mint' | 'muted';
  slide: HtmlSlide;
}) {
  const outline = useMemo(() => extractOutline(slide.html), [slide.html]);
  const isMint = tone === 'mint';
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        isMint
          ? 'border-[#18d6a4]/35 bg-[#18d6a4]/[0.04]'
          : 'border-white/[0.08] bg-white/[0.03]',
      )}
    >
      <div
        className={cn(
          'text-[10px] font-bold uppercase tracking-[0.24em]',
          isMint ? 'text-[#2effc0]' : 'text-white/45',
        )}
      >
        {label}
      </div>
      <div className="mt-2 text-base font-bold leading-snug text-white">
        {outline.title || '(no headline)'}
      </div>
      {outline.bullets.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {outline.bullets.slice(0, 4).map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/75">
              <span
                className={cn(
                  'mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full',
                  isMint ? 'bg-[#18d6a4]' : 'bg-white/[0.35]',
                )}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/40">No outline text.</p>
      )}
    </div>
  );
}

// ─── Outline extraction helpers ────────────────────────────────────

function extractOutline(html: string): { title: string; bullets: string[] } {
  if (!html) return { title: '', bullets: [] };
  const stripped = html
    // Drop <style> blocks so their CSS doesn't leak into the text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Title: first h1/h2/h3 content
  const titleMatch = stripped.match(/<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/i);
  const title = titleMatch
    ? cleanText(titleMatch[2]).slice(0, 140)
    : '';

  // Bullets: try <li> first; fall back to <p> with reasonable length.
  const bullets: string[] = [];
  const liMatches = stripped.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  for (const m of liMatches) {
    const t = cleanText(m[1]);
    if (t.length >= 4) bullets.push(t.slice(0, 180));
    if (bullets.length >= 5) break;
  }
  if (bullets.length === 0) {
    const pMatches = stripped.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) {
      const t = cleanText(m[1]);
      if (t.length >= 18 && t.length <= 220) bullets.push(t);
      if (bullets.length >= 4) break;
    }
  }
  // Drop bullets that just repeat the title.
  const filtered = bullets.filter((b) => b.toLowerCase() !== title.toLowerCase());
  return { title, bullets: filtered };
}

function cleanText(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
