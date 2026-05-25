import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, MessageSquare, Send, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';
import { OutlineTile } from './OutlineTile';
import type { ComposerContext } from './types';
import type { OutlineEntry } from '../runtime/types';

/**
 * Step 4 — Outline. The interactive review surface where the AI
 * brings back a 5–10 slide deck.
 *
 * Empty state: big "Generate the outline" CTA. Pressing it calls
 * `studio-deck-plan` (loading state ~20-60s).
 *
 * Populated state:
 *   - List of OutlineTile (collapsed by default, expand to edit).
 *   - Bottom-anchored "Refine with AI" chat input (mobile = sticky
 *     above the wizard footer; desktop = inline below the list).
 *
 * Mobile UX: full-screen scroll, refinement input as a sticky bar.
 */
export function StepOutline({ draft, setDraft }: ComposerContext) {
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineText, setRefineText] = useState('');
  const refineRef = useRef<HTMLTextAreaElement>(null);
  const outline = draft.outline;

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
    if (error) throw new Error(error.message);
    const payload = data as { deck_id?: string; outline?: OutlineEntry[]; error?: string };
    if (payload.error || !payload.outline) throw new Error(payload.error || 'No outline returned');
    return { deckId: payload.deck_id ?? draft.id, outline: payload.outline };
  };

  const onGenerate = async () => {
    setGenerating(true);
    try {
      const { deckId, outline } = await callPlan('plan');
      setDraft((d) => ({ ...d, id: deckId ?? d.id, outline }));
      void mediumTap();
      toast.success('Outline ready', { description: `${outline.length} slides drafted.` });
    } catch (err) {
      toast.error('Could not generate outline', { description: (err as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  const onRefine = async () => {
    const instruction = refineText.trim();
    if (!instruction || refining) return;
    setRefining(true);
    try {
      const { deckId, outline } = await callPlan('refine', instruction);
      setDraft((d) => ({ ...d, id: deckId ?? d.id, outline }));
      setRefineText('');
      void mediumTap();
      toast.success('Outline refined');
    } catch (err) {
      toast.error('Could not refine', { description: (err as Error).message });
    } finally {
      setRefining(false);
    }
  };

  const updateEntry = (index: number, next: OutlineEntry) => {
    setDraft((d) => {
      if (!d.outline) return d;
      const copy = [...d.outline];
      copy[index] = next;
      return { ...d, outline: copy };
    });
  };

  // Empty state — big CTA, helpful framing.
  if (!outline || outline.length === 0) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 text-center sm:p-10">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2effc0]/30 via-[#18d6a4]/20 to-transparent">
          <Sparkles className="h-7 w-7 text-[#18d6a4]" />
        </div>
        <h2 className="mb-1.5 text-xl font-bold text-white sm:text-2xl">
          Ready when you are.
        </h2>
        <p className="mb-6 max-w-[440px] text-sm leading-relaxed text-white/55">
          We'll write a 5–10 slide outline based on your brief and pull live
          numbers from the Dubai Land Department + your references. Takes
          about 30 seconds.
        </p>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={generating || draft.topic.trim().length < 8}
          className={cn(
            'h-12 rounded-full px-6 text-sm font-black transition-all min-w-[200px]',
            'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
            'disabled:opacity-40 disabled:translate-y-0',
          )}
        >
          {generating ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Drafting your deck…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate outline
            </span>
          )}
        </Button>
        {generating ? (
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/40">
            Calling the data tools · this can take 20–60 seconds
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-44 sm:pb-32">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white sm:text-xl">
            Your outline · {outline.length} slides
          </h2>
          <p className="mt-1 text-xs text-white/55">
            Tap a slide to edit its headline and body. Numbers are backed by
            the data tag inside each tile.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 text-xs font-bold text-white/75 transition-colors hover:border-white/[0.24] hover:text-white disabled:opacity-50"
          title="Discard outline and re-generate from the brief"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}
          Re-do
        </button>
      </header>

      {/* Outline tiles */}
      <div className="space-y-2.5">
        {outline.map((entry, i) => (
          <OutlineTile
            key={`${entry.slide_type}-${i}`}
            index={i}
            entry={entry}
            onUpdate={(next) => updateEntry(i, next)}
            isFirst={i === 0}
            isLast={i === outline.length - 1}
          />
        ))}
      </div>

      {/* Refine-chat bar — sticky above the wizard footer on mobile */}
      <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-white/[0.08] bg-[#0B1120]/95 px-4 py-3 backdrop-blur-xl sm:relative sm:bottom-auto sm:inset-x-auto sm:mt-6 sm:rounded-2xl sm:border sm:border-white/[0.08] sm:bg-white/[0.03] sm:px-4 sm:py-3.5 sm:backdrop-blur-none">
        <label className="mb-1.5 hidden text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 sm:inline-flex sm:items-center sm:gap-1.5">
          <MessageSquare className="h-3 w-3 text-[#18d6a4]/80" />
          Refine with AI
        </label>
        <div className="flex items-end gap-2">
          <Textarea
            ref={refineRef}
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            placeholder="e.g. Make slide 3 more punchy. Remove every mention of off-plan."
            rows={1}
            disabled={refining}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onRefine();
              }
            }}
            className="min-h-[44px] resize-none rounded-2xl border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus-visible:border-[#18d6a4]/45 focus-visible:ring-[#18d6a4]/25"
          />
          <Button
            type="button"
            onClick={onRefine}
            disabled={!refineText.trim() || refining}
            className={cn(
              'h-11 w-11 shrink-0 rounded-full p-0',
              'bg-gradient-to-br from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814]',
              'disabled:opacity-40',
            )}
            aria-label="Send refine instruction"
          >
            {refining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
