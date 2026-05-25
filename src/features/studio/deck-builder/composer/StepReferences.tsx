import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, FileText, X, Loader2, Plus, Link2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';
import type { ComposerContext, ReferenceAsset } from './types';

/**
 * Step 2 — References (optional). The adviser can attach:
 *   - YouTube URLs (transcript ingested via studio-youtube-ingest).
 *   - (Phase 1.5) PDF uploads via studio-assets bucket — stubbed
 *     here with a "Coming soon" affordance so the step is shippable.
 *
 * Mobile-first: large URL input + Add button as a single row that
 * stacks on tiny screens. Each attached reference renders as a
 * full-width chip with a tap target to remove.
 */
export function StepReferences({ draft, setDraft }: ComposerContext) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);

  const addYoutube = async () => {
    const url = youtubeUrl.trim();
    if (!url) return;
    setIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('studio-youtube-ingest', {
        body: { youtube_url: url, deck_id: draft.id ?? undefined },
      });
      if (error) throw new Error(error.message);
      const payload = data as { asset_id?: string; video_id?: string; char_count?: number; error?: string };
      if (payload.error || !payload.asset_id) {
        throw new Error(payload.error || 'Could not read transcript');
      }
      const newRef: ReferenceAsset = {
        asset_id: payload.asset_id,
        kind: 'youtube_transcript',
        source_url: url,
        display_name: payload.video_id ? `YouTube · ${payload.video_id}` : 'YouTube video',
        char_count: payload.char_count,
      };
      setDraft((d) => ({
        ...d,
        reference_assets: [...d.reference_assets, newRef],
      }));
      setYoutubeUrl('');
      void mediumTap();
      toast.success('Transcript added', {
        description: payload.char_count
          ? `${payload.char_count.toLocaleString()} chars from the video.`
          : undefined,
      });
    } catch (err) {
      const msg = (err as Error).message ?? 'Could not read this video';
      const friendly = msg.includes('no_captions')
        ? "This video doesn't have captions. Try one with subtitles or upload a PDF instead."
        : msg.includes('private_video')
          ? 'This video is private or has been removed.'
          : msg;
      toast.error(friendly);
    } finally {
      setIngesting(false);
    }
  };

  const removeRef = (assetId: string) => {
    void lightTap();
    setDraft((d) => ({
      ...d,
      reference_assets: d.reference_assets.filter((r) => r.asset_id !== assetId),
    }));
  };

  return (
    <div className="space-y-7">
      <header>
        <h2 className="text-lg font-bold text-white sm:text-xl">
          Add reference material
        </h2>
        <p className="mt-1.5 text-sm text-white/55">
          Optional. The AI will use anything you attach as background —
          a YouTube interview, a market report PDF, your own notes.
        </p>
      </header>

      {/* YouTube URL row */}
      <section>
        <Label htmlFor="youtube-url" className="text-sm font-semibold text-white/85 inline-flex items-center gap-2">
          <Youtube className="h-4 w-4 text-[#18d6a4]/80" />
          Paste a YouTube link
        </Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <Input
              id="youtube-url"
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              disabled={ingesting}
              className="h-12 rounded-2xl border-white/[0.08] bg-white/[0.04] pl-10 pr-4 text-base text-white placeholder:text-white/30 focus-visible:border-[#18d6a4]/45 focus-visible:ring-[#18d6a4]/25"
            />
          </div>
          <Button
            type="button"
            onClick={addYoutube}
            disabled={!youtubeUrl.trim() || ingesting}
            className={cn(
              'h-12 rounded-2xl px-5 text-sm font-bold transition-all sm:w-auto',
              'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
              'disabled:opacity-40 disabled:translate-y-0',
            )}
          >
            {ingesting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reading…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add
              </span>
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-white/35">
          We pull the captions and use the text as research material.
        </p>
      </section>

      {/* PDF upload — Phase 1.5 placeholder */}
      <section>
        <Label className="text-sm font-semibold text-white/85 inline-flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#18d6a4]/80" />
          Upload PDFs
        </Label>
        <div className="mt-2 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 text-center text-sm text-white/45">
          PDF upload arrives in the next build. For now, paste a YouTube link
          above or rely on the topic + voice notes you wrote in step 1.
        </div>
      </section>

      {/* Attached refs list */}
      {draft.reference_assets.length > 0 ? (
        <section>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
            Attached ({draft.reference_assets.length})
          </div>
          <AnimatePresence initial={false}>
            <div className="space-y-2">
              {draft.reference_assets.map((r) => (
                <motion.div
                  key={r.asset_id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3"
                >
                  {r.kind === 'youtube_transcript' ? (
                    <Youtube className="h-5 w-5 shrink-0 text-[#18d6a4]/80" />
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-[#18d6a4]/80" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white/90">
                      {r.display_name ?? r.source_url ?? r.asset_id}
                    </div>
                    {r.char_count ? (
                      <div className="text-[11px] text-white/40">
                        {r.char_count.toLocaleString()} chars of transcript
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRef(r.asset_id)}
                    aria-label={`Remove ${r.display_name ?? 'reference'}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/85"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </section>
      ) : null}
    </div>
  );
}
