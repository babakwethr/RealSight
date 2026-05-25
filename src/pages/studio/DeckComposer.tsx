/**
 * DeckComposer — the Studio Deck Builder wizard.
 *
 * 5-step mobile-first wizard:
 *   1. Brief       — topic + audience + voice notes
 *   2. References  — YouTube + (Phase 1.5) PDF
 *   3. Template    — pick a deck style (Cinematic Gold live in V1)
 *   4. Outline     — generate via studio-deck-plan + edit + refine
 *   5. Publish     — gateway to /studio/decks/:id (preview + publish)
 *
 * Mobile-first design:
 *   - One full-screen step at a time, swipe-friendly transitions.
 *   - Sticky bottom CTA bar (Back + Next) with safe-area padding.
 *   - Sticky top header with step indicator + back-out link.
 *   - All inputs ≥ 44px tap target (Apple HIG).
 *   - Glass surfaces match the RealSight V3 design system.
 *
 * Replaces the stub PresentationGenerator.tsx as the body of
 * route `/studio/presentation` (wired in src/App.tsx).
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
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
import {
  EMPTY_DRAFT,
  WIZARD_STEPS,
  type DraftDeck,
  type ComposerContext,
} from '@/features/studio/deck-builder/composer/types';

const STEP_PANE_VARIANTS = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function DeckComposer() {
  const [draft, setDraft] = useState<DraftDeck>(() => EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Scroll the body to top whenever the step changes — feels more
  // app-like on mobile than carrying scroll position across steps.
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const canGoNext = (() => {
    switch (WIZARD_STEPS[step].id) {
      case 'brief':
        return draft.topic.trim().length >= 8;
      case 'references':
        return true;
      case 'template':
        return Boolean(draft.template_slug);
      case 'outline':
        return Array.isArray(draft.outline) && draft.outline.length >= 5;
      case 'publish':
        return false; // terminal
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
  const current = WIZARD_STEPS[step].id;

  return (
    <div className="relative -mx-4 flex h-full min-h-[100dvh] flex-col sm:-mx-6 sm:min-h-0">
      {/* ── Header (step indicator + back to Studio link) ── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07040F]/85 px-4 py-3 backdrop-blur-xl sm:rounded-t-3xl sm:px-6 sm:py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 rounded-full text-xs font-bold text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Studio
          </Link>
          <div className="flex items-center gap-1.5 rounded-full bg-[#18d6a4]/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#18d6a4]">
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

      {/* ── Step body ── */}
      <div
        ref={contentScrollRef}
        className="flex-1 overflow-y-auto px-4 pb-[140px] pt-6 sm:px-6 sm:pb-32"
      >
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              variants={STEP_PANE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {current === 'brief' && <StepBrief {...ctx} />}
              {current === 'references' && <StepReferences {...ctx} />}
              {current === 'template' && <StepTemplate {...ctx} />}
              {current === 'outline' && <StepOutline {...ctx} />}
              {current === 'publish' && <StepPublish {...ctx} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sticky footer (Back + Next) ──
          On mobile, fixed-bottom with safe-area inset.
          On desktop, sticky inside the page. */}
      <footer
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#07040F]/95 px-4 py-3 backdrop-blur-xl sm:sticky sm:bottom-0 sm:rounded-b-3xl sm:px-6 sm:py-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 12px)' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 0}
            className={cn(
              'h-12 rounded-full px-5 text-sm font-bold text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-30',
            )}
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
                'h-12 flex-1 max-w-[240px] rounded-full px-5 text-sm font-black transition-all',
                'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
                'disabled:opacity-40 disabled:translate-y-0',
              )}
            >
              {nextLabel(current)}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <div className="h-12 w-12" aria-hidden="true" />
          )}
        </div>
      </footer>
    </div>
  );
}

function nextLabel(currentStep: string): string {
  switch (currentStep) {
    case 'brief':      return 'Next: sources';
    case 'references': return 'Next: pick a style';
    case 'template':   return 'Next: outline';
    case 'outline':    return 'Next: publish';
    default:           return 'Next';
  }
}

// Default export for ease of route swap.
export default DeckComposer;
