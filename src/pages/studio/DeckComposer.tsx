/**
 * DeckComposer — Studio Deck Builder wizard.
 *
 * Reference: /Users/babak/Projects/propsight/docs/studio-deck-builder/userflow.html
 *
 * Cinematic Gold aesthetic throughout — ink-900 bg, bone foreground,
 * gold accents, Cormorant serif headlines, Inter body, sharp
 * corners. The composer LOOKS like the thing it creates.
 *
 * Layout (desktop):
 *   - Page header with eyebrow + serif h1 + caption.
 *   - Sticky pill stepper with numbered serif numerals + Back/Next
 *     buttons on the right (gold-filled rectangle for Next).
 *   - App-frame card hosting the current step's content.
 *   - Each step uses its own grid (Brief = 2-col form+chat,
 *     Outline = single column list, Publish = 1.3fr/1fr preview +
 *     actions).
 *
 * Layout (mobile):
 *   - Same vertical flow.
 *   - Step pills scroll horizontally.
 *   - Step content stacks into single column.
 *   - Back/Next remain in the sticky top bar.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';

import {
  StepBrief,
  StepTemplate,
  StepOutline,
  StepVisuals,
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
  enter:  { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0 },
  exit:   { opacity: 0, y: -6 },
};

export function DeckComposer() {
  const [draft, setDraft] = useState<DraftDeck>(() => EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset scroll-to-top on step change.
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const canGoNext = (() => {
    switch (WIZARD_STEPS[step].id) {
      case 'brief':    return draft.topic.trim().length >= 8;
      case 'template': return Boolean(draft.template_slug);
      case 'outline':  return Array.isArray(draft.outline) && draft.outline.length >= 5;
      case 'visuals':  return Array.isArray(draft.outline) && draft.outline.length >= 5;
      case 'publish':  return false;
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

  // Keyboard arrows — desktop nicety, matches the reference behaviour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Avoid swallowing typing in inputs / textareas.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' && step > 0) {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGoNext, step]);

  const ctx: ComposerContext = { draft, setDraft, branding: {} };
  const currentId = WIZARD_STEPS[step].id;
  const isLast = step === WIZARD_STEPS.length - 1;

  return (
    // The Cinematic Gold aesthetic — ink-900 surface, sharp corners,
    // serif headlines. Break out of AppLayout's content-area padding
    // so the composer card has full width to itself.
    <div className="-mx-4 -my-4 min-h-[calc(100dvh-2rem)] bg-ink-900 text-bone sm:-mx-6 sm:-my-6">
      {/* Page header */}
      <header className="mx-auto max-w-7xl px-4 pb-5 pt-7 sm:px-8 sm:pb-6 sm:pt-10">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.32em] text-gold">
            RealSight · Studio
          </div>
          <Link
            to="/studio"
            className="rounded-sm border border-bone/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-bone/60 transition hover:border-gold/40 hover:text-gold"
          >
            ← Studio
          </Link>
        </div>
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-5xl">
          Deck Builder
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-bone/65 sm:text-base">
          From a topic to a published, fullscreen-ready, data-backed
          presentation hosted on{' '}
          <span className="text-gold">realsight.app</span>. Five steps.
        </p>
      </header>

      {/* Sticky step indicator + Back/Next */}
      <nav
        className="sticky top-0 z-30 border-b border-bone/10 bg-ink-900/85 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-8 sm:py-4">
          <div className="flex-1 min-w-0">
            <StepIndicator
              steps={WIZARD_STEPS.map((s) => ({ id: s.id, label: s.label }))}
              current={step}
              onJump={(i) => {
                void lightTap();
                setStep(i);
              }}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className={cn(
                'rounded-sm border border-bone/15 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-bone/70 transition hover:border-gold/40 hover:text-gold sm:px-4',
                step === 0 && 'opacity-40 cursor-not-allowed',
              )}
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext || isLast}
              className={cn(
                'rounded-sm border border-gold bg-gold px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-ink-900 transition hover:bg-gold-light sm:px-4',
                (!canGoNext || isLast) && 'opacity-40 cursor-not-allowed hover:bg-gold',
              )}
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </nav>

      {/* App-frame card with current step */}
      <main className="mx-auto mb-12 max-w-7xl px-4 sm:px-8" ref={contentRef}>
        <div className="overflow-hidden rounded-md border border-bone/10 bg-ink-800/40 shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.section
              key={currentId}
              variants={STEP_PANE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
              className="p-6 sm:p-8"
            >
              {currentId === 'brief'    && <StepBrief    {...ctx} />}
              {currentId === 'template' && <StepTemplate {...ctx} />}
              {currentId === 'outline'  && <StepOutline  {...ctx} />}
              {currentId === 'visuals'  && <StepVisuals  {...ctx} />}
              {currentId === 'publish'  && <StepPublish  {...ctx} />}
            </motion.section>
          </AnimatePresence>
        </div>

        {/* Trust / Time / Reuse strip — matches reference */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <TrustCard
            label="Trust"
            body="Every number on the deck traces to a live DLD query. The AI has no freedom to invent figures — only to phrase them."
          />
          <TrustCard
            label="Time"
            body={
              <>
                From "I want a deck on X" to a published, branded presentation —{' '}
                <span className="text-bone">under 5 minutes</span> for the pilot.
              </>
            }
          />
          <TrustCard
            label="Reuse"
            body="The rendering layer ports verbatim from the proven secondary-market deck — not a rewrite."
          />
        </div>
      </main>
    </div>
  );
}

function TrustCard({ label, body }: { label: string; body: React.ReactNode }) {
  return (
    <div className="rounded-md border border-bone/10 bg-ink-800/40 p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-gold">{label}</div>
      <p className="mt-2 text-sm leading-relaxed text-bone/75">{body}</p>
    </div>
  );
}

export default DeckComposer;
