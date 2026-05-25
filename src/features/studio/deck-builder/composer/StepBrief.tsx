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

const TONE_PRESETS = ['Formal', 'Friendly', 'Urgent', 'Quiet luxury'];

/**
 * Step 1 — Chat brief.
 *
 * UX matches the reference (form left, chat panel right) but the CI
 * is RealSight V3 — navy / mint / glass / Inter.
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
    <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
      {/* Left — brief form */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#18d6a4]">
          01 — Tell us about it
        </div>
        <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
          What's this deck about?
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Write a one-line topic. Pick the audience. Attach anything that helps
          — a YouTube link, your own notes. The AI does the rest.
        </p>

        <div className="mt-7 space-y-6">
          {/* Topic */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
              Topic
            </label>
            <textarea
              value={draft.topic}
              onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
              placeholder="Secondary market — since the war"
              rows={2}
              maxLength={1024}
              className="mt-2 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-white/30 outline-none backdrop-blur-md transition focus:border-[#18d6a4]/45 focus:ring-2 focus:ring-[#18d6a4]/20"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-white/40">
              <span>{draft.topic.trim().length < 8 ? 'At least 8 characters' : ' '}</span>
              <span>{draft.topic.length} / 1024</span>
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
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
                      'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors min-h-[36px]',
                      active
                        ? 'border-[#18d6a4]/55 bg-[#18d6a4]/[0.10] text-[#2effc0]'
                        : 'border-white/[0.08] bg-white/[0.02] text-white/65 hover:border-white/[0.20] hover:text-white',
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
              <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
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
                        setDraft((d) => {
                          const hasIt = d.voice_notes.toLowerCase().includes(t.toLowerCase());
                          if (hasIt) return d;
                          return { ...d, voice_notes: d.voice_notes ? `${d.voice_notes}. Tone: ${t}.` : `Tone: ${t}.` };
                        });
                      }}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors',
                        active
                          ? 'border-[#18d6a4]/55 bg-[#18d6a4]/[0.10] text-[#2effc0]'
                          : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:border-white/[0.20] hover:text-white',
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                Language
              </label>
              <div className="mt-2 inline-flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white backdrop-blur-md">
                <span>English</span>
                <span className="text-white/45 text-xs">More coming</span>
              </div>
            </div>
          </div>

          {/* Source material */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
              Source material (optional)
            </label>
            <div className="mt-2 space-y-3 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-4 backdrop-blur-sm">
              {/* YouTube ingest row */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Youtube className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#18d6a4]/80" />
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Paste a YouTube link"
                    disabled={ingesting}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/30 outline-none backdrop-blur-md transition focus:border-[#18d6a4]/45 focus:ring-2 focus:ring-[#18d6a4]/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={addYoutube}
                  disabled={!youtubeUrl.trim() || ingesting}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-all',
                    'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
                    'disabled:opacity-40 disabled:translate-y-0',
                  )}
                >
                  {ingesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add
                </button>
              </div>
              <div className="text-xs text-white/40">
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
                    className="space-y-1.5"
                  >
                    {draft.reference_assets.map((r) => (
                      <div
                        key={r.asset_id}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-md"
                      >
                        <Youtube className="h-4 w-4 shrink-0 text-[#18d6a4]" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-white">
                            {r.display_name ?? r.source_url ?? r.asset_id}
                          </div>
                          {r.char_count ? (
                            <div className="text-[11px] text-white/45">
                              {r.char_count.toLocaleString()} chars · transcribed
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRef(r.asset_id)}
                          aria-label="Remove"
                          className="text-white/45 transition-colors hover:text-white/85"
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
            <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
              Voice notes (optional)
            </label>
            <textarea
              value={draft.voice_notes}
              onChange={(e) => setDraft((d) => ({ ...d, voice_notes: e.target.value }))}
              placeholder="Lean on yield numbers. Mention the metro line. Avoid the word 'opportunity'…"
              maxLength={500}
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none backdrop-blur-md transition focus:border-[#18d6a4]/45 focus:ring-2 focus:ring-[#18d6a4]/20"
            />
          </div>
        </div>
      </div>

      {/* Right — chat-style status panel */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#18d6a4] opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#18d6a4]" />
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">
            AI · ready
          </span>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[#18d6a4]/10 px-3 py-2 text-white">
            {draft.topic.trim() || (
              <span className="text-white/40">Type your topic on the left…</span>
            )}
          </div>

          <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.06] px-3 py-2 text-white/85 backdrop-blur-sm">
            Got it. Who's the audience —{' '}
            <span className="font-bold text-[#2effc0]">
              {AUDIENCE_OPTIONS.find((o) => o.value === draft.audience)?.label.toLowerCase() ?? 'investors'}
            </span>
            ?
          </div>

          {draft.reference_assets.length > 0 ? (
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.06] px-3 py-2 text-white/85">
              <span className="inline-flex items-center gap-1.5 text-[#18d6a4]">
                <Sparkles className="h-3 w-3" /> {draft.reference_assets.length} source
                {draft.reference_assets.length > 1 ? 's' : ''} attached
              </span>{' '}
              — I'll fold them into the script.
            </div>
          ) : null}

          {draft.voice_notes.trim() ? (
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[#18d6a4]/10 px-3 py-2 text-white">
              {draft.voice_notes}
            </div>
          ) : null}

          <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.06] px-3 py-2 text-white/85">
            When you're ready, hit{' '}
            <kbd className="rounded-md border border-white/20 px-1.5 py-0.5 text-[10px] font-mono text-white/90">
              Next
            </kbd>{' '}
            and pick a style — I'll draft a 5–10 slide outline using live DLD data.
          </div>
        </div>
      </div>
    </div>
  );
}
