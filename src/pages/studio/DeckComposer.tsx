/**
 * DeckComposer — Studio Deck Builder wizard.
 *
 * UX layout from the spec userflow.html reference (5-step wizard,
 * sticky pill stepper, app-frame card hosting current step, Back +
 * Next on the right, page header + Trust/Time/Reuse strip below).
 *
 * CI is RealSight V3 throughout — cinematic-bg navy, mint accent
 * (#18d6a4 / #2effc0), Inter type, glass surfaces (rounded-2xl,
 * backdrop-blur-md, border-white/[0.08]), mint-gradient primary CTAs.
 *
 * The only places the gold/cinematic-gold aesthetic appears are
 * *inside the deck previews*: the template thumbnails in Step 2 and
 * the cover preview in Step 5 — those are intentionally showing what
 * the published deck will look like, not part of the composer chrome.
 *
 * Mobile: same vertical flow, pills horizontal-scroll, content stacks.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Layers, Loader2, Sparkles, PlusCircle } from 'lucide-react';
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
} from './deck-composer-imports';
import {
  EMPTY_DRAFT,
  WIZARD_STEPS,
  type DraftDeck,
  type ComposerContext,
  type ComposerAudience,
} from '@/features/studio/deck-builder/composer/types';
import type { OutlineEntry } from '@/features/studio/deck-builder/runtime/types';

const STEP_PANE_VARIANTS = {
  enter:  { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0 },
  exit:   { opacity: 0, y: -6 },
};

export function DeckComposer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deckIdParam = searchParams.get('deck');
  const [draft, setDraft] = useState<DraftDeck>(() => EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(Boolean(deckIdParam));
  const contentRef = useRef<HTMLDivElement>(null);

  // Load existing deck when ?deck=ID is in the URL (coming back from
  // the preview, or a saved-state shareable link). Without this the
  // composer used to reset to step 1 with an empty draft.
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
        // Clear the bad ?deck= so refresh doesn't keep failing.
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
      // Jump the wizard to the most-relevant step based on draft progress.
      const hasHtml = Array.isArray(loaded.html_slides) && loaded.html_slides.length > 0;
      const hasOutline = Array.isArray(loaded.outline) && loaded.outline.length > 0;
      const resumeStep = (hasHtml || hasOutline)
        ? WIZARD_STEPS.findIndex((s) => s.id === 'outline')
        : 0;
      setStep(resumeStep >= 0 ? resumeStep : 0);
      setLoadingDraft(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckIdParam, setSearchParams]);

  // Whenever the deck gets persisted (first Generate sets draft.id),
  // mirror that into the URL so refresh + Back-button keep state.
  useEffect(() => {
    if (draft.id && draft.id !== deckIdParam) {
      setSearchParams({ deck: draft.id }, { replace: true });
    }
  }, [draft.id, deckIdParam, setSearchParams]);

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

  // Desktop keyboard arrows — matches reference nicety, doesn't
  // interfere with typing inside inputs.
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
  const isLast = step === WIZARD_STEPS.length - 1;

  return (
    // Break out of AppLayout's content-area padding so the wizard
    // can use its own outer chrome at full width.
    <div className="-mx-4 -my-4 min-h-[calc(100dvh-2rem)] sm:-mx-6 sm:-my-6">
      {/* Page header — RealSight V3 hero treatment. */}
      <header className="mx-auto max-w-7xl px-4 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-10">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#18d6a4]">
            <Sparkles className="h-3 w-3" />
            RealSight · Studio
          </div>
          <div className="flex items-center gap-2">
            {draft.id ? (
              <button
                type="button"
                onClick={startFresh}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/65 backdrop-blur-md transition hover:border-[#18d6a4]/40 hover:text-[#2effc0]"
              >
                <PlusCircle className="h-3 w-3" />
                Start new
              </button>
            ) : null}
            <Link
              to="/studio"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/65 backdrop-blur-md transition hover:border-white/[0.20] hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              Studio
            </Link>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-5xl">
          Deck Builder
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
          From a topic to a published, fullscreen-ready, data-backed
          presentation hosted on{' '}
          <span className="font-bold text-[#2effc0]">realsight.app</span>. Five steps.
        </p>
      </header>

      {/* Sticky step indicator + Back/Next */}
      <nav
        className="sticky top-0 z-30 border-y border-white/[0.06] bg-[#07040F]/85 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-8 sm:py-3.5">
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
                'inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 transition hover:border-white/[0.24] hover:text-white sm:px-4',
                step === 0 && 'opacity-30 cursor-not-allowed',
              )}
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext || isLast}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-all sm:px-5',
                'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
                (!canGoNext || isLast) && 'opacity-40 cursor-not-allowed translate-y-0',
              )}
            >
              {isLast ? 'Done' : 'Next'}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </nav>

      {/* App-frame card with current step */}
      <main className="mx-auto mb-12 max-w-7xl px-4 sm:px-8" ref={contentRef}>
        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] shadow-2xl backdrop-blur-md">
          {loadingDraft ? (
            <div className="flex min-h-[480px] items-center justify-center p-12 text-white/55">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#18d6a4]" />
              Loading your draft…
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.section
                key={currentId}
                variants={STEP_PANE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                className="p-5 sm:p-8"
              >
                {currentId === 'brief'    && <StepBrief    {...ctx} />}
                {currentId === 'template' && <StepTemplate {...ctx} />}
                {currentId === 'outline'  && <StepOutline  {...ctx} />}
                {currentId === 'visuals'  && <StepVisuals  {...ctx} />}
                {currentId === 'publish'  && <StepPublish  {...ctx} />}
              </motion.section>
            </AnimatePresence>
          )}
        </div>

        {/* Trust / Time / Reuse strip */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <TrustCard
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Trust"
            body="Every number on the deck traces to a live DLD query. The AI has no freedom to invent figures — only to phrase them."
          />
          <TrustCard
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Speed"
            body={
              <>
                Topic → published, branded presentation in{' '}
                <span className="font-bold text-white">under 5 minutes</span> for pilot agents.
              </>
            }
          />
          <TrustCard
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Reuse"
            body="The deck rendering engine ports directly from a proven secondary-market deck — not a rewrite."
          />
        </div>
      </main>
    </div>
  );
}

function TrustCard({
  icon,
  label,
  body,
}: {
  icon: React.ReactNode;
  label: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-md">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#18d6a4]">
        <span className="text-[#2effc0]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/75">{body}</p>
    </div>
  );
}

export default DeckComposer;
