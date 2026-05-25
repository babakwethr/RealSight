import { useState } from 'react';
import { Sparkles, Loader2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';
import { OutlineTile } from './OutlineTile';
import type { ComposerContext } from './types';
import type { OutlineEntry } from '../runtime/types';

/**
 * Step 3 — Review script. The interactive outline review surface.
 *
 * Empty state: gold-accent CTA "Draft the outline" → calls
 * studio-deck-plan, then populates the tiles.
 *
 * Populated state:
 *   - Title row with global "Refresh data" + "Re-prompt all" buttons,
 *     matching the userflow.html reference.
 *   - Vertical list of OutlineTile (each tappable to expand-edit).
 *   - Bottom-of-page Refine-with-AI input (single-line, can extend
 *     to chat later).
 *
 * Cinematic Gold aesthetic throughout — ink + bone + gold, sharp
 * corners, serif headlines.
 */
export function StepOutline({ draft, setDraft }: ComposerContext) {
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineText, setRefineText] = useState('');
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
      toast.success(`Outline ready · ${outline.length} slides`);
    } catch (err) {
      toast.error('Could not draft outline', { description: (err as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  const onRefineAll = async () => {
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

  const updateEntry = (i: number, next: OutlineEntry) => {
    setDraft((d) => {
      if (!d.outline) return d;
      const copy = [...d.outline];
      copy[i] = next;
      return { ...d, outline: copy };
    });
  };

  // ── Empty state ──
  if (!outline || outline.length === 0) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center rounded-md border border-bone/10 bg-ink-900/40 p-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/[0.06]">
          <Sparkles className="h-6 w-6 text-gold" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-gold">03 — Review the script</div>
        <h2 className="mt-2 font-serif text-3xl text-bone">Ready to draft.</h2>
        <p className="mt-2 max-w-md text-sm text-bone/60">
          We'll write a 5–10 slide outline based on your brief and pull live
          numbers from the Dubai Land Department + your references.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || draft.topic.trim().length < 8}
          className={cn(
            'mt-7 inline-flex h-11 items-center gap-2 rounded-sm border border-gold bg-gold px-5 text-xs uppercase tracking-[0.18em] text-ink-900 transition hover:bg-gold-light',
            'disabled:opacity-40 disabled:hover:bg-gold',
          )}
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Drafting…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Draft the outline
            </>
          )}
        </button>
        {generating ? (
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-bone/40">
            Calling the data tools · 20–60 seconds
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold">03 — Review the script</div>
          <h2 className="mt-2 font-serif text-4xl leading-tight text-bone">
            {outline.length} slides, ready to tweak.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-bone/60">
            Every number is grounded in a live DLD query — hover the chip to see
            the source. Tap a slide to edit its headline + body.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-sm border border-bone/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-bone/70 transition hover:border-gold/40 hover:text-gold disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCw className="h-3 w-3" />
            )}
            Refresh data
          </button>
        </div>
      </div>

      {/* Tile list */}
      <div className="mt-6 space-y-3">
        {outline.map((entry, i) => (
          <OutlineTile
            key={`${entry.slide_type}-${i}`}
            index={i}
            entry={entry}
            onUpdate={(next) => updateEntry(i, next)}
            onRePrompt={async () => {
              try {
                const { outline: newOutline } = await callPlan(
                  'refine',
                  `Re-write slide ${i + 1} (${entry.slide_type}) only. Keep the data citation if any. Make it punchier.`,
                );
                setDraft((d) => ({ ...d, outline: newOutline }));
                toast.success('Slide rewritten');
              } catch (err) {
                toast.error('Re-write failed', { description: (err as Error).message });
              }
            }}
            isFirst={i === 0}
            isLast={i === outline.length - 1}
          />
        ))}
      </div>

      {/* Refine-all input */}
      <div className="mt-6 rounded-md border border-bone/10 bg-ink-900/40 p-4">
        <label className="text-[10px] uppercase tracking-[0.18em] text-bone/55">
          Refine the whole deck
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            placeholder="e.g. Make slide 3 punchier. Remove every mention of off-plan."
            disabled={refining}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onRefineAll();
              }
            }}
            className="flex-1 rounded-sm border border-bone/15 bg-ink-800/60 px-3 py-2 text-sm text-bone placeholder:text-bone/35 outline-none transition focus:border-gold/55"
          />
          <button
            type="button"
            onClick={onRefineAll}
            disabled={!refineText.trim() || refining}
            className="inline-flex items-center gap-1.5 rounded-sm border border-gold bg-gold px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-ink-900 transition hover:bg-gold-light disabled:opacity-40"
          >
            {refining ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Refine
          </button>
        </div>
      </div>
    </div>
  );
}
