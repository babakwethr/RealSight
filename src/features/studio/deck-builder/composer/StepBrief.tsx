/**
 * Step 1 — Brief.
 *
 * Mobbin grounding:
 *   - Chronicle "Generate from prompt" — big single input, sample chips
 *     below, settings condensed into pills.
 *     https://mobbin.com/screens/65efebb0-b008-4210-9ff1-7d50a1575086
 *   - Gamma "Generate" — format / length / tone are inline pill
 *     selectors above the prompt, not a modal.
 *     https://mobbin.com/screens/23a25ddc-5d71-44d3-af2b-ff2ea0ec1767
 *   - Manus "What can I do for you?" — chat-style input with attachment
 *     chips below the textarea.
 *     https://mobbin.com/screens/10fcbb26-3619-4697-8613-eeeacc7b89b1
 *
 * Result: one focused canvas. The big topic input is the hero. Audience
 * + tone are pills directly under it. Voice notes + source material
 * open as a single "Add detail" disclosure so first-timers see ONE
 * thing to do. Sample topics live below as a 2 / 3-col grid (Pitch
 * Manus "Choose a template" tile feel).
 *
 * CI: RealSight V3 — navy / mint / glass / Inter.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Loader2,
  Mic,
  Paperclip,
  Plus,
  Sparkles,
  Wand2,
  X,
  Youtube,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';
import { StarterGallery } from './StarterGallery';
import type { ComposerContext, ComposerAudience, ReferenceAsset } from './types';

const AUDIENCE_OPTIONS: Array<{ value: ComposerAudience; label: string; subtext: string }> = [
  { value: 'investor',   label: 'Investor',   subtext: 'numbers first' },
  { value: 'clients',    label: 'Client',     subtext: 'briefing tone' },
  { value: 'end_user',   label: 'End buyer',  subtext: 'lifestyle' },
  { value: 'team',       label: 'My team',    subtext: 'training' },
  { value: 'open_house', label: 'Open house', subtext: 'walkthrough' },
];

const TONE_PRESETS = ['Friendly', 'Formal', 'Urgent', 'Quiet luxury'];

export function StepBrief({ draft, setDraft }: ComposerContext) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [showDetail, setShowDetail] = useState<boolean>(
    Boolean(draft.voice_notes || draft.reference_assets.length > 0),
  );
  const [tone, setTone] = useState<string>('Friendly');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    // Focus the topic input on first paint so the adviser can start
    // typing immediately — Chronicle / ChatGPT pattern.
    inputRef.current?.focus({ preventScroll: true });
  }, []);

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

  const applyTone = (t: string) => {
    void lightTap();
    setTone(t);
    setDraft((d) => {
      const hasIt = d.voice_notes.toLowerCase().includes(t.toLowerCase());
      if (hasIt) return d;
      return { ...d, voice_notes: d.voice_notes ? `${d.voice_notes}. Tone: ${t}.` : `Tone: ${t}.` };
    });
  };

  const charCount = draft.topic.length;
  const topicReady = draft.topic.trim().length >= 8;
  const refCount = draft.reference_assets.length;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#18d6a4]/25 bg-[#18d6a4]/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#2effc0]">
          <Wand2 className="h-3 w-3" />
          Step 1 of 5 — Tell us about it
        </div>
        <h1 className="mt-4 text-balance text-3xl font-bold leading-tight text-white sm:text-5xl">
          What's this deck about?
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-balance text-sm text-white/55 sm:text-base">
          One sentence is enough. Pick who it's for, and the AI will draft a
          5–10 slide presentation backed by live Dubai Land Department data.
        </p>
      </div>

      {/* Hero input — Chronicle/Gamma pattern */}
      <div className="relative mx-auto mt-8">
        {/* Soft mint halo behind the input — Chronicle's signature */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-12 -inset-y-8 -z-10 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(46,255,192,0.10) 0%, rgba(24,214,164,0.04) 35%, transparent 70%)',
            filter: 'blur(28px)',
          }}
        />

        <div
          className={cn(
            'relative rounded-3xl border bg-white/[0.04] backdrop-blur-xl transition-all',
            topicReady
              ? 'border-[#18d6a4]/35 shadow-[0_0_0_4px_rgba(46,255,192,0.06)]'
              : 'border-white/[0.10]',
          )}
        >
          <textarea
            ref={inputRef}
            value={draft.topic}
            onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
            placeholder="e.g. Why Dubai Marina rents will outperform in 2026"
            rows={3}
            maxLength={1024}
            className="w-full resize-none rounded-3xl bg-transparent px-5 pt-4 pb-2 text-lg leading-relaxed text-white placeholder:text-white/30 outline-none sm:text-xl"
          />

          {/* Bottom toolbar inside the input — Manus pattern */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] px-3 py-2.5">
            {/* Audience pill (compact, leads with current selection) */}
            <AudiencePill
              value={draft.audience}
              onChange={(v) => setDraft((d) => ({ ...d, audience: v }))}
            />
            <button
              type="button"
              onClick={() => {
                void lightTap();
                setShowDetail((v) => !v);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:border-white/[0.20] hover:text-white"
              title="Voice notes, sources, tone"
            >
              <Paperclip className="h-3 w-3" />
              <span>Detail</span>
              {refCount > 0 ? (
                <span className="ml-0.5 rounded-full bg-[#18d6a4]/20 px-1.5 text-[9px] font-black text-[#2effc0]">
                  {refCount}
                </span>
              ) : null}
              <ChevronDown
                className={cn('h-3 w-3 transition-transform', showDetail && 'rotate-180')}
              />
            </button>
            <button
              type="button"
              disabled
              title="Voice capture — next build"
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35"
            >
              <Mic className="h-3 w-3" />
              <span className="hidden sm:inline">Voice</span>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <span
                className={cn(
                  'text-[10px] font-medium tabular-nums transition-colors',
                  charCount > 900 ? 'text-amber-300/80' : 'text-white/40',
                )}
              >
                {charCount}/1024
              </span>
            </div>
          </div>
        </div>
        {!topicReady && draft.topic.length > 0 ? (
          <p className="mt-2 text-center text-[11px] text-white/40">
            Just a few more characters — the AI works best with 8+.
          </p>
        ) : null}
      </div>

      {/* "Detail" disclosure — voice notes + source material */}
      <AnimatePresence initial={false}>
        {showDetail ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="mx-auto mt-6 overflow-hidden"
          >
            <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-md">
              {/* Tone pills */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                  Tone
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TONE_PRESETS.map((t) => {
                    const active = tone === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => applyTone(t)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors',
                          active
                            ? 'border-[#18d6a4]/55 bg-[#18d6a4]/10 text-[#2effc0]'
                            : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:border-white/[0.20] hover:text-white',
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice notes */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                  Voice notes (optional)
                </label>
                <textarea
                  value={draft.voice_notes}
                  onChange={(e) => setDraft((d) => ({ ...d, voice_notes: e.target.value }))}
                  placeholder="Lean on yield numbers. Mention the metro line. Avoid the word 'opportunity'…"
                  maxLength={500}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none backdrop-blur-md transition focus:border-[#18d6a4]/45 focus:ring-2 focus:ring-[#18d6a4]/20"
                />
              </div>

              {/* Source material */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                  Source material (optional)
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Youtube className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#18d6a4]/80" />
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="Paste a YouTube link to use as reference"
                      disabled={ingesting}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none backdrop-blur-md transition focus:border-[#18d6a4]/45 focus:ring-2 focus:ring-[#18d6a4]/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addYoutube}
                    disabled={!youtubeUrl.trim() || ingesting}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.10] bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 transition hover:border-[#18d6a4]/35 hover:text-white sm:py-2',
                      'disabled:opacity-40',
                    )}
                  >
                    {ingesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-white/35">
                  PDF / CSV upload coming next.
                </p>

                {/* Attached references */}
                <AnimatePresence initial={false}>
                  {draft.reference_assets.length > 0 ? (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="space-y-1.5"
                    >
                      {draft.reference_assets.map((r) => (
                        <div
                          key={r.asset_id}
                          className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-md"
                        >
                          <Youtube className="h-3.5 w-3.5 shrink-0 text-[#18d6a4]" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm text-white">
                              {r.display_name ?? r.source_url ?? r.asset_id}
                            </div>
                            {r.char_count ? (
                              <div className="text-[10px] text-white/45">
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
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Starter cards */}
      <div className="mx-auto mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/55">
            Or start from a template prompt
          </h2>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
            <Sparkles className="mr-1 inline h-3 w-3 text-[#18d6a4]" />
            tap to use
          </span>
        </div>
        <StarterGallery
          selectedPrompt={draft.topic}
          onPick={({ prompt, audience }) => {
            setDraft((d) => ({
              ...d,
              topic: prompt,
              audience: (audience as ComposerAudience | null) ?? d.audience,
            }));
            inputRef.current?.focus();
          }}
        />
      </div>
    </div>
  );
}

// ─── Audience pill (popover-like) ──────────────────────────────────

function AudiencePill({
  value,
  onChange,
}: {
  value: ComposerAudience;
  onChange: (v: ComposerAudience) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = AUDIENCE_OPTIONS.find((o) => o.value === value) ?? AUDIENCE_OPTIONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          void lightTap();
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full border border-[#18d6a4]/35 bg-[#18d6a4]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2effc0] transition hover:border-[#18d6a4]/55"
      >
        <span className="text-white/55">for</span>
        <span>{current.label}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30"
            />
            <motion.div
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 top-[calc(100%+6px)] z-40 w-56 overflow-hidden rounded-xl border border-white/[0.12] bg-[#0c0a1a]/95 shadow-2xl backdrop-blur-xl"
            >
              {AUDIENCE_OPTIONS.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      void lightTap();
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors',
                      active ? 'bg-[#18d6a4]/10 text-[#2effc0]' : 'text-white/85 hover:bg-white/[0.04]',
                    )}
                  >
                    <span className="font-bold uppercase tracking-[0.14em]">{opt.label}</span>
                    <span className="text-[10px] text-white/45">{opt.subtext}</span>
                  </button>
                );
              })}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
