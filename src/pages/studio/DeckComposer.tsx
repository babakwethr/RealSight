/**
 * DeckComposer — Studio Deck Builder wizard. V3 redesign grounded in
 * Mobbin references:
 *   - Wizard chrome → Chronicle / Linear-style slim rail
 *     https://mobbin.com/screens/65efebb0-b008-4210-9ff1-7d50a1575086
 *   - Brief / topic → Gamma + Manus single-input hero
 *     https://mobbin.com/screens/23a25ddc-5d71-44d3-af2b-ff2ea0ec1767
 *   - Template gallery → Pitch left-rail categories
 *     https://mobbin.com/screens/b7d71395-ad7b-430e-9eed-4c96c629148c
 *   - Outline cards + diff → Gamma
 *     https://mobbin.com/screens/9c722748-1af1-4cab-a352-c8706aad29d2
 *     https://mobbin.com/screens/aa564aa8-83bc-44d0-9f54-f6df923c87be
 *   - Visuals tabs + chips → Pitch
 *     https://mobbin.com/screens/e0b2c3cf-921d-4b0c-bc78-41eea0399e37
 *   - Publish focus state → Gamma
 *     https://mobbin.com/screens/d31c151e-10c8-4f69-928a-4eea183f8d1d
 *
 * CI stays RealSight V3 — navy / mint / glass / Inter. The composer
 * chrome is intentionally quieter than the old version: less ornament,
 * more focus on the active step.
 *
 * Mobile-first: header collapses to step number + current label only,
 * Back/Next condense to icon-only buttons, content stacks vertically.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';

import {
  StepBrief,
  StepTemplate,
  StepOutline,
  StepVisuals,
  StepPublish,
  StepIndicator,
  WizardErrorBoundary,
  WizardNavRail,
} from './deck-composer-imports';
import {
  EMPTY_DRAFT,
  WIZARD_STEPS,
  type DraftDeck,
  type ComposerContext,
  type ComposerAudience,
} from '@/features/studio/deck-builder/composer/types';
import type { OutlineEntry } from '@/features/studio/deck-builder/runtime/types';

export function DeckComposer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deckIdParam = searchParams.get('deck');
  const stepParam = searchParams.get('step');
  const [draft, setDraft] = useState<DraftDeck>(() => EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(Boolean(deckIdParam));
  const contentRef = useRef<HTMLDivElement>(null);

  // Load existing deck when ?deck=ID is in the URL.
  useEffect(() => {
    let cancelled = false;
    if (!deckIdParam) {
      setLoadingDraft(false);
      return;
    }
    (async () => {
      setLoadingDraft(true);
      const { data, error } = await supabase
        .from('studio_decks')
        .select(
          'id, template_slug, topic, audience, brief, outline, html_slides, theme, visuals, reference_assets',
        )
        .eq('id', deckIdParam)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error('Could not load that deck — starting fresh');
        setSearchParams({}, { replace: true });
        setLoadingDraft(false);
        return;
      }
      const brief = (data.brief ?? {}) as {
        topic?: string;
        audience?: string;
        voice_notes?: string;
        contact_bg_prompt?: string;
        reference_asset_ids?: string[];
      };
      const refs = (Array.isArray(data.reference_assets)
        ? data.reference_assets
        : []) as DraftDeck['reference_assets'];
      const loaded: DraftDeck = {
        id: data.id,
        topic: data.topic ?? brief.topic ?? '',
        audience: (data.audience as ComposerAudience | null) ?? (brief.audience as ComposerAudience) ?? 'investor',
        voice_notes: brief.voice_notes ?? '',
        contact_bg_prompt: brief.contact_bg_prompt ?? '',
        reference_assets: refs,
        template_slug: data.template_slug ?? 'cinematic-gold',
        html_slides: (data.html_slides ?? null) as DraftDeck['html_slides'],
        theme: (data.theme ?? null) as DraftDeck['theme'],
        outline: (data.outline ?? null) as OutlineEntry[] | null,
        visuals: (data.visuals ?? {}) as Record<string, string>,
      };
      setDraft(loaded);
      const hasHtml = Array.isArray(loaded.html_slides) && loaded.html_slides.length > 0;
      const hasOutline = Array.isArray(loaded.outline) && loaded.outline.length > 0;
      let resumeIdx = 0;
      if (stepParam) {
        const idx = WIZARD_STEPS.findIndex((s) => s.id === stepParam);
        if (idx >= 0) resumeIdx = idx;
      } else if (hasHtml || hasOutline) {
        resumeIdx = WIZARD_STEPS.findIndex((s) => s.id === 'outline');
      }
      setStep(resumeIdx >= 0 ? resumeIdx : 0);
      setLoadingDraft(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckIdParam, setSearchParams]);

  // Mirror deck id + current step into the URL.
  useEffect(() => {
    if (!draft.id) return;
    const targetStepId = WIZARD_STEPS[step]?.id ?? 'brief';
    if (draft.id !== deckIdParam || targetStepId !== stepParam) {
      setSearchParams({ deck: draft.id, step: targetStepId }, { replace: true });
    }
  }, [draft.id, step, deckIdParam, stepParam, setSearchParams]);

  const startFresh = () => {
    void lightTap();
    setDraft(EMPTY_DRAFT);
    setStep(0);
    setSearchParams({}, { replace: true });
  };

  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const canGoNext = (() => {
    const slideCount =
      (Array.isArray(draft.html_slides) ? draft.html_slides.length : 0) ||
      (Array.isArray(draft.outline) ? draft.outline.length : 0);
    switch (WIZARD_STEPS[step].id) {
      case 'brief':    return draft.topic.trim().length >= 8;
      case 'template': return Boolean(draft.template_slug);
      case 'outline':  return slideCount >= 4;
      case 'visuals':  return slideCount >= 4;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
  const currentLabel = WIZARD_STEPS[step].label;
  const isLast = step === WIZARD_STEPS.length - 1;

  return (
    // Standalone fullscreen — no AppLayout chrome around this. The
    // wizard owns its own background: a static solid navy gradient
    // (no fixed pseudo-element aurora orbs, no backdrop-blur on the
    // root, no sidebar / ticker / nav siblings). This is the
    // architectural fix for the Edge Dev OOM crash advisers kept
    // hitting on Step 4 / 5 — see App.tsx route comment.
    //
    // Lightweight WizardNavRail gives the adviser back their main
    // app navigation without dragging in AppLayout's heavy chrome.
    <div
      className="flex min-h-[100dvh] w-full text-white"
      style={{
        background:
          'linear-gradient(180deg, #07040F 0%, #0a0a18 40%, #0a0814 100%)',
      }}
    >
      <WizardNavRail />
      <div className="flex min-w-0 flex-1 flex-col">
      {/* Sticky header — Linear-style slim. One line:
            crumb (Studio › Deck Builder) — step rail — Back / Next.
          Mobile collapses to step counter + current label. */}
      <nav
        className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#07040F]/95"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-8 sm:py-3.5">
          {/* Brand crumb */}
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 rounded-full px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-white"
          >
            <Sparkles className="h-3 w-3 text-[#18d6a4]" />
            <span className="hidden sm:inline">Studio</span>
            <span className="hidden text-white/30 sm:inline">/</span>
            <span className="text-white">Deck</span>
          </Link>

          {/* Step rail */}
          <div className="hidden flex-1 items-center justify-center md:flex">
            <StepIndicator
              steps={WIZARD_STEPS.map((s) => ({ id: s.id, label: s.label }))}
              current={step}
              onJump={(i) => {
                void lightTap();
                setStep(i);
              }}
            />
          </div>

          {/* Mobile: current step counter */}
          <div className="flex flex-1 items-center justify-center text-[11px] font-bold uppercase tracking-[0.18em] md:hidden">
            <span className="text-[#2effc0]">{step + 1}</span>
            <span className="mx-1 text-white/35">/</span>
            <span className="text-white/55">{WIZARD_STEPS.length}</span>
            <span className="mx-2 text-white/30">·</span>
            <span className="truncate text-white/85">{currentLabel}</span>
          </div>

          {/* Right cluster */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {draft.id ? (
              <button
                type="button"
                onClick={startFresh}
                title="Start a new deck"
                className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:border-[#18d6a4]/40 hover:text-[#2effc0] sm:inline-flex"
              >
                <PlusCircle className="h-3 w-3" />
                New
              </button>
            ) : null}
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              aria-label="Back"
              className={cn(
                'inline-flex items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-white/75 transition hover:border-white/[0.24] hover:text-white',
                'h-8 w-8 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3.5',
                step === 0 && 'opacity-30 cursor-not-allowed',
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-[0.14em]">Back</span>
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext || isLast}
              aria-label="Next"
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-full px-4 text-[11px] font-black uppercase tracking-[0.14em] transition-all',
                'h-8 sm:h-9 sm:px-5',
                'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
                (!canGoNext || isLast) && 'opacity-40 cursor-not-allowed translate-y-0',
              )}
            >
              <span>{isLast ? 'Done' : 'Next'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Mobile-only step rail — second row, scrollable */}
        <div className="-mx-2 overflow-x-auto px-4 pb-2 md:hidden">
          <StepIndicator
            steps={WIZARD_STEPS.map((s) => ({ id: s.id, label: s.label }))}
            current={step}
            onJump={(i) => {
              void lightTap();
              setStep(i);
            }}
          />
        </div>
      </nav>

      {/* Step content — no outer card chrome. Each step owns its own
          surfaces so the canvas can be focused or split as needed. */}
      <main
        className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10"
        ref={contentRef}
      >
        {loadingDraft ? (
          <div className="flex min-h-[60vh] items-center justify-center text-white/55">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#18d6a4]" />
            Loading your draft…
          </div>
        ) : (
          <>
            {/* Single-step render with a CSS fade keyed off the step id.
                Cheaper than framer-motion's AnimatePresence which keeps
                both incoming and outgoing mounted during the transition
                and was contributing to the renderer OOM on low-power
                tabs. */}
            <section
              key={currentId}
              className="animate-deck-step-in"
            >
              <WizardErrorBoundary resetKey={currentId}>
                {currentId === 'brief'    && <StepBrief    {...ctx} />}
                {currentId === 'template' && <StepTemplate {...ctx} />}
                {currentId === 'outline'  && <StepOutline  {...ctx} />}
                {currentId === 'visuals'  && <StepVisuals  {...ctx} />}
                {currentId === 'publish'  && <StepPublish  {...ctx} />}
              </WizardErrorBoundary>
            </section>
            <style>{`
              @keyframes rs-deck-step-in {
                from { opacity: 0; transform: translateY(4px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              .animate-deck-step-in {
                animation: rs-deck-step-in 0.22s cubic-bezier(0.22, 0.61, 0.36, 1) both;
              }
              @media (prefers-reduced-motion: reduce) {
                .animate-deck-step-in { animation: none; }
              }
            `}</style>
          </>
        )}
      </main>
      </div>
    </div>
  );
}

export default DeckComposer;
