import { useState } from 'react';
import { Sparkles, Loader2, RotateCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';
import { OutlineTile } from './OutlineTile';
import type { ComposerContext } from './types';
import type { OutlineEntry } from '../runtime/types';

/**
 * Step 3 — Review script.
 *
 * UX matches reference (tile list + global refine input). CI is
 * RealSight V3: glass cards, mint accent, Inter type, rounded-2xl,
 * mint-gradient primary CTA.
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
    // supabase.functions.invoke turns any non-2xx into a generic
    // "Edge Function returned a non-2xx status code" error. The real
    // error message lives in the response body, which we sometimes
    // need to dig out from error.context.
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

  // Empty state.
  if (!outline || outline.length === 0) {
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
          We'll write a 5–10 slide outline based on your brief and pull live
          numbers from the Dubai Land Department + your references.
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
              Draft the outline
            </>
          )}
        </button>
        {generating ? (
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/40">
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
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#18d6a4]">
            03 — Review the script
          </div>
          <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
            {outline.length} slides, ready to tweak.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/60">
            Every number is grounded in a live DLD query — tap a slide to edit
            its headline + body.
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
          Refresh data
        </button>
      </div>

      {/* Tile list */}
      <div className="mt-6 space-y-2.5">
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
      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md">
        <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
          Refine the whole deck with AI
        </label>
        <div className="mt-2 flex items-end gap-2">
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
