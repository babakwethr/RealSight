/**
 * DeckComposer — the Studio Deck Builder wizard.
 *
 * 5-step composer that adapts shape per viewport:
 *   - Mobile (< lg): one full-screen step at a time, sticky bottom
 *     Back / Next bar with safe-area inset, single-column body.
 *   - Desktop (lg+): contained "tool card" up to max-w-7xl, inline
 *     header + body + footer (no fixed/sticky), multi-column body
 *     where the step benefits from it (Brief = form left + live
 *     cover preview right; Outline = list left + refinement chat
 *     right).
 *
 * Both layouts share the same step components and state — the
 * only differences are container width, footer position, and
 * whether the right-rail preview is mounted.
 *
 * Replaces the stub PresentationGenerator.tsx as the body of
 * route /studio/presentation.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';

import {
  StepBrief,
  StepReferences,
  StepTemplate,
  StepOutline,
  StepPublish,
  StepIndicator,
} from './deck-composer-imports';
import { CoverPreviewCard } from '@/features/studio/deck-builder/composer/CoverPreviewCard';
import {
  EMPTY_DRAFT,
  WIZARD_STEPS,
  type DraftDeck,
  type ComposerContext,
} from '@/features/studio/deck-builder/composer/types';

const STEP_PANE_VARIANTS = {
  enter:  { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit:   { opacity: 0, y: -8 },
};

/** Steps where the desktop layout shows a right-rail Cover preview. */
const STEPS_WITH_COVER_RAIL = new Set(['brief', 'references', 'template']);

export function DeckComposer() {
  const [draft, setDraft] = useState<DraftDeck>(() => EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Scroll the body to top whenever the step changes — feels more
  // app-like on mobile, also resets focus on desktop.
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const canGoNext = (() => {
    switch (WIZARD_STEPS[step].id) {
      case 'brief':      return draft.topic.trim().length >= 8;
      case 'references': return true;
      case 'template':   return Boolean(draft.template_slug);
      case 'outline':    return Array.isArray(draft.outline) && draft.outline.length >= 5;
      case 'publish':    return false;
    }
  })();

  const goNext = () => {
    if (!canGoNext) return;
    void mediumTap();
    setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1));
  };
  const goBack = () => {
    if (step === 0) return;
    void lightTap();
    setStep((s) => Math.max(0, s - 1));
  };

  const ctx: ComposerContext = { draft, setDraft, branding: {} };
  const currentId = WIZARD_STEPS[step].id;
  const showCoverRail = STEPS_WITH_COVER_RAIL.has(currentId);

  return (
    <div className="relative -mx-4 flex min-h-[calc(100dvh-2rem)] flex-col lg:mx-auto lg:my-0 lg:min-h-0 lg:max-w-7xl">
      {/* ── Header ── */}
      <header
        className={cn(
          // Mobile: sticky to viewport top, dark backdrop.
          'sticky top-0 z-20 border-b border-white/[0.06] bg-[#07040F]/85 px-4 py-3 backdrop-blur-xl',
          // Desktop: part of the card chrome, not sticky.
          'lg:rounded-t-3xl lg:border lg:border-b-white/[0.06] lg:border-white/[0.06] lg:bg-white/[0.02] lg:px-7 lg:py-5 lg:backdrop-blur-none',
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-3 lg:mb-4">
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 rounded-full text-xs font-bold text-white/55 transition-colors hover:text-white lg:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            <span>Studio</span>
          </Link>
          <div className="hidden text-base font-bold text-white lg:flex lg:items-center lg:gap-2">
            <Layers className="h-4 w-4 text-[#18d6a4]/80" />
            Deck Builder
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#18d6a4]/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#18d6a4] lg:hidden">
            <Sparkles className="h-3 w-3" />
            Deck Builder
          </div>
        </div>
        <StepIndicator
          steps={WIZARD_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          current={step}
          onJump={(i) => {
            void lightTap();
            setStep(i);
          }}
        />
      </header>

      {/* ── Body: single-column on mobile, 2-col on desktop when rail is shown ── */}
      <div
        ref={contentScrollRef}
        className={cn(
          'flex-1 overflow-y-auto px-4 pb-[140px] pt-6',
          // Desktop: card chrome edges + extra horizontal padding;
          // no fixed-footer padding because the footer is in-flow.
          'lg:rounded-none lg:border-x lg:border-white/[0.06] lg:bg-[#07040F]/55 lg:px-8 lg:pb-10 lg:pt-8 lg:backdrop-blur-sm',
        )}
      >
        <div
          className={cn(
            'mx-auto max-w-2xl',
            // Desktop: when the rail is visible, switch to a 12-col grid.
            showCoverRail && 'lg:grid lg:max-w-none lg:grid-cols-12 lg:gap-8',
            // When no rail (outline / publish), still widen the column.
            !showCoverRail && 'lg:max-w-4xl',
          )}
        >
          <div className={cn(showCoverRail && 'lg:col-span-7 xl:col-span-7')}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentId}
                variants={STEP_PANE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
              >
                {currentId === 'brief' && <StepBrief {...ctx} />}
                {currentId === 'references' && <StepReferences {...ctx} />}
                {currentId === 'template' && <StepTemplate {...ctx} />}
                {currentId === 'outline' && <StepOutline {...ctx} />}
                {currentId === 'publish' && <StepPublish {...ctx} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Desktop right rail — live cover preview (only steps where it makes sense) */}
          {showCoverRail ? (
            <aside className="hidden lg:col-span-5 lg:block xl:col-span-5">
              <div className="sticky top-6 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                    Live preview
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                    Cover · updates as you type
                  </div>
                </div>
                <CoverPreviewCard draft={draft} />
                <p className="px-1 text-[11px] leading-relaxed text-white/45">
                  This is the first slide of your deck. The full {draft.outline?.length ?? '5–10'} slides
                  render after you tap Generate.
                </p>
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      {/* ── Footer (Back + Next) ──
          Mobile: fixed-bottom + safe-area inset.
          Desktop: inline below body, part of the card chrome. */}
      <footer
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#07040F]/95 px-4 py-3 backdrop-blur-xl',
          'lg:relative lg:inset-x-auto lg:bottom-auto lg:z-auto lg:rounded-b-3xl lg:border lg:border-t-white/[0.06] lg:border-white/[0.06] lg:bg-white/[0.02] lg:px-7 lg:py-5 lg:backdrop-blur-none',
        )}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 12px)' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 lg:max-w-none">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 0}
            className="h-12 rounded-full px-5 text-sm font-bold text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-30 lg:h-11"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>

          {step < WIZARD_STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className={cn(
                'h-12 flex-1 max-w-[260px] rounded-full px-5 text-sm font-black transition-all lg:h-11 lg:flex-none lg:px-6',
                'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
                'disabled:opacity-40 disabled:translate-y-0',
              )}
            >
              {nextLabel(currentId)}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <div className="h-12 w-12 lg:hidden" aria-hidden="true" />
          )}
        </div>
      </footer>
    </div>
  );
}

function nextLabel(currentStep: string): string {
  switch (currentStep) {
    case 'brief':      return 'Sources';
    case 'references': return 'Pick style';
    case 'template':   return 'Outline';
    case 'outline':    return 'Publish';
    default:           return 'Next';
  }
}

export default DeckComposer;
