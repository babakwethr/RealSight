import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Sparkles, Youtube, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';
import type { ComposerContext, ComposerAudience, ReferenceAsset } from './types';

const AUDIENCE_OPTIONS: Array<{ value: ComposerAudience; label: string }> = [
  { value: 'team',       label: 'My team' },
  { value: 'clients',    label: 'Clients' },
  { value: 'investor',   label: 'Investors' },
  { value: 'end_user',   label: 'End user' },
  { value: 'open_house', label: 'Open house' },
];

const TONE_PRESETS = [
  'Formal',
  'Friendly',
  'Urgent',
  'Quiet luxury',
];

/**
 * Step 1 — Chat brief. Matches the userflow.html reference:
 *   - Left column: form (topic + audience + tone + language + source).
 *   - Right column: chat-style panel showing what the LLM will use,
 *     plus a YouTube link ingest field. (Real multi-turn chat lives
 *     in Step 3 — Review script — where the adviser refines slides.)
 *
 * Aesthetic: ink-900 bg + bone text + gold accents + Cormorant
 * serif headlines + Inter body + sharp corners. NOT the V3 navy/mint.
 */
export function StepBrief({ draft, setDraft }: ComposerContext) {
  const [tone, setTone] = useState<string>('Friendly');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);

  const addYoutube = async () => {
    const url = youtubeUrl.trim();
    if (!url || ingesting) return;
    setIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('studio-youtube-ingest', {
        body: { youtube_url: url, deck_id: draft.id ?? undefined },
      });
      if (error) throw new Error(error.message);
      const payload = data as { asset_id?: string; video_id?: string; char_count?: number; error?: string };
      if (payload.error || !payload.asset_id) throw new Error(payload.error || 'Could not read transcript');
      const newRef: ReferenceAsset = {
        asset_id: payload.asset_id,
        kind: 'youtube_transcript',
        source_url: url,
        display_name: payload.video_id ? `YouTube · ${payload.video_id}` : 'YouTube video',
        char_count: payload.char_count,
      };
      setDraft((d) => ({ ...d, reference_assets: [...d.reference_assets, newRef] }));
      setYoutubeUrl('');
      void mediumTap();
      toast.success('Transcript added');
    } catch (err) {
      const msg = (err as Error).message ?? '';
      const friendly = msg.includes('no_captions')
        ? "This video doesn't have captions. Try one with subtitles."
        : msg.includes('private_video')
          ? 'This video is private or has been removed.'
          : msg || 'Could not read this video.';
      toast.error(friendly);
    } finally {
      setIngesting(false);
    }
  };

  const removeRef = (id: string) => {
    void lightTap();
    setDraft((d) => ({
      ...d,
      reference_assets: d.reference_assets.filter((r) => r.asset_id !== id),
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-7 md:grid-cols-[1.05fr_1fr] md:gap-8">
      {/* Left — brief form */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-gold">
          01 — Tell us about it
        </div>
        <h2 className="mt-2 font-serif text-4xl leading-tight text-bone">
          What's this deck about?
        </h2>
        <p className="mt-2 text-sm text-bone/60">
          Write a one-line topic. Pick the audience. Attach anything that helps
          — a YouTube link, your own notes. The AI does the rest.
        </p>

        <div className="mt-7 space-y-6">
          {/* Topic */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.18em] text-bone/55">
              Topic
            </label>
            <textarea
              value={draft.topic}
              onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
              placeholder="Secondary market — since the war"
              rows={2}
              maxLength={1024}
              className="mt-2 w-full resize-none rounded-sm border border-bone/15 bg-ink-900/60 px-4 py-3 text-base text-bone placeholder:text-bone/30 outline-none transition focus:border-gold/55"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-bone/40">
              <span>{draft.topic.trim().length < 8 ? 'At least 8 characters' : ' '}</span>
              <span>{draft.topic.length} / 1024</span>
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.18em] text-bone/55">
              Audience
            </label>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
              {AUDIENCE_OPTIONS.map((opt) => {
                const active = draft.audience === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      void lightTap();
                      setDraft((d) => ({ ...d, audience: opt.value }));
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.14em] transition-colors min-h-[36px]',
                      active
                        ? 'border-gold/50 bg-gold/[0.08] text-gold'
                        : 'border-bone/15 text-bone/65 hover:border-bone/35 hover:text-bone',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone + Language */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] uppercase tracking-[0.18em] text-bone/55">
                Tone
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TONE_PRESETS.map((t) => {
                  const active = tone === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        void lightTap();
                        setTone(t);
                        // Append the tone to voice_notes if it's not there.
                        setDraft((d) => {
                          const hasIt = d.voice_notes.toLowerCase().includes(t.toLowerCase());
                          if (hasIt) return d;
                          return { ...d, voice_notes: d.voice_notes ? `${d.voice_notes}. Tone: ${t}.` : `Tone: ${t}.` };
                        });
                      }}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors',
                        active
                          ? 'border-gold/50 bg-gold/[0.08] text-gold'
                          : 'border-bone/15 text-bone/60 hover:border-bone/35 hover:text-bone',
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.18em] text-bone/55">
                Language
              </label>
              <div className="mt-2 inline-flex w-full items-center justify-between rounded-sm border border-bone/15 bg-ink-900/60 px-3 py-2 text-sm text-bone">
                <span>English</span>
                <span className="text-bone/45 text-xs">More languages coming</span>
              </div>
            </div>
          </div>

          {/* Source material */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.18em] text-bone/55">
              Source material (optional)
            </label>
            <div className="mt-2 rounded-sm border border-dashed border-bone/20 bg-ink-900/40 p-4 space-y-3">
              {/* YouTube ingest row */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Youtube className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/70" />
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Paste a YouTube link"
                    disabled={ingesting}
                    className="w-full rounded-sm border border-bone/15 bg-ink-800/60 pl-10 pr-3 py-2 text-sm text-bone placeholder:text-bone/30 outline-none transition focus:border-gold/55"
                  />
                </div>
                <button
                  type="button"
                  onClick={addYoutube}
                  disabled={!youtubeUrl.trim() || ingesting}
                  className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-bone/15 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-bone/70 transition hover:border-gold/40 hover:text-gold disabled:opacity-40"
                >
                  {ingesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add
                </button>
              </div>

              {/* PDF upload placeholder */}
              <div className="text-xs text-bone/40">
                + Drop PDF or CSV here — coming in the next build
              </div>

              {/* Attached references */}
              <AnimatePresence initial={false}>
                {draft.reference_assets.length > 0 ? (
                  <motion.div
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 pt-1"
                  >
                    {draft.reference_assets.map((r) => (
                      <div
                        key={r.asset_id}
                        className="flex items-center gap-3 rounded-sm border border-bone/10 bg-ink-800/60 px-3 py-2"
                      >
                        <Youtube className="h-4 w-4 shrink-0 text-gold" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-bone">
                            {r.display_name ?? r.source_url ?? r.asset_id}
                          </div>
                          {r.char_count ? (
                            <div className="text-[11px] text-bone/45">
                              {r.char_count.toLocaleString()} chars · transcribed
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRef(r.asset_id)}
                          aria-label="Remove"
                          className="text-bone/45 transition-colors hover:text-bone/85"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          {/* Voice notes */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.18em] text-bone/55">
              Voice notes (optional)
            </label>
            <textarea
              value={draft.voice_notes}
              onChange={(e) => setDraft((d) => ({ ...d, voice_notes: e.target.value }))}
              placeholder="Lean on yield numbers. Mention the metro line. Avoid the word 'opportunity'…"
              maxLength={500}
              rows={3}
              className="mt-2 w-full resize-none rounded-sm border border-bone/15 bg-ink-900/60 px-4 py-3 text-sm text-bone placeholder:text-bone/30 outline-none transition focus:border-gold/55"
            />
          </div>
        </div>
      </div>

      {/* Right — chat-style status panel */}
      <div className="rounded-md border border-bone/10 bg-ink-900/60 p-5">
        <div className="flex items-center gap-2 border-b border-bone/10 pb-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
          <span className="text-xs uppercase tracking-[0.18em] text-bone/60">
            AI · ready
          </span>
        </div>

        <div className="mt-4 space-y-3.5 text-sm">
          <div className="ml-auto max-w-[80%] rounded-md rounded-tr-sm bg-gold/10 px-3 py-2 text-bone">
            {draft.topic.trim() || (
              <span className="text-bone/40">Type your topic on the left…</span>
            )}
          </div>

          <div className="mr-auto max-w-[80%] rounded-md rounded-tl-sm bg-ink-700/60 px-3 py-2 text-bone/85">
            Got it. Who's the audience —{' '}
            <span className="text-gold-light italic">
              {AUDIENCE_OPTIONS.find((o) => o.value === draft.audience)?.label.toLowerCase() ?? 'investors'}
            </span>
            ?
          </div>

          {draft.reference_assets.length > 0 ? (
            <div className="mr-auto max-w-[80%] rounded-md rounded-tl-sm bg-ink-700/60 px-3 py-2 text-bone/85">
              <span className="inline-flex items-center gap-1.5 text-gold">
                <Sparkles className="h-3 w-3" /> {draft.reference_assets.length} source
                {draft.reference_assets.length > 1 ? 's' : ''} attached
              </span>{' '}
              — I'll fold them into the script.
            </div>
          ) : null}

          {draft.voice_notes.trim() ? (
            <div className="ml-auto max-w-[80%] rounded-md rounded-tr-sm bg-gold/10 px-3 py-2 text-bone">
              {draft.voice_notes}
            </div>
          ) : null}

          <div className="mr-auto max-w-[80%] rounded-md rounded-tl-sm bg-ink-700/60 px-3 py-2 text-bone/85">
            When you're ready, hit{' '}
            <kbd className="rounded border border-bone/25 px-1.5 py-0.5 text-[10px] text-bone">
              Next
            </kbd>{' '}
            and pick a style — I'll draft a 5–10 slide outline using live DLD data.
          </div>
        </div>
      </div>
    </div>
  );
}
