import { useMemo, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, FileText, Loader2,
  Upload, X, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Presentation Generator — first Studio tool.
 *
 * Adviser inputs a topic (or reference material) → AI plans a 5-page
 * branded presentation → 4 images generated (cover + 2 detail pages
 * + 1 contact page) → adviser reviews each image and approves or
 * regenerates → server composes the final branded PDF.
 *
 * v2 layout (this commit) — composer + live-preview pattern, post
 * design / Vercel UI / WCAG AA audit. Logic, validation, and the
 * edge-function call are unchanged from v1; only the JSX shape
 * and copy were updated. See:
 *   /Presentation-Generator-Redesign.html  (approved mockup)
 *   memory/presentation_port_plan.md       (full pipeline plan)
 */

type Audience = 'end_user' | 'investor' | 'both';

interface FormState {
  topic: string;
  audience: Audience;
  voiceNotes: string;
  contactBgPrompt: string;
  referenceFiles: File[];
}

const MAX_REFERENCE_FILES = 5;
const MAX_REFERENCE_SIZE_MB = 10;

const AUDIENCE_OPTIONS: ReadonlyArray<{ v: Audience; label: string; desc: string }> = [
  { v: 'end_user', label: 'End user', desc: 'Buyers + occupiers' },
  { v: 'investor', label: 'Investor', desc: 'Yield-focused' },
  { v: 'both',     label: 'Both',     desc: 'Mixed audience' },
];

const NEXT_AUDIENCE: Record<Audience, Audience> = {
  end_user: 'investor',
  investor: 'both',
  both:     'end_user',
};
const PREV_AUDIENCE: Record<Audience, Audience> = {
  end_user: 'both',
  investor: 'end_user',
  both:     'investor',
};

const DECK_PAGES: ReadonlyArray<{ n: string; label: string }> = [
  { n: '01', label: 'Cover' },
  { n: '02', label: 'Summary' },
  { n: '03', label: 'Detail A' },
  { n: '04', label: 'Detail B' },
  { n: '05', label: 'Contact' },
];

export default function PresentationGenerator() {
  const [form, setForm] = useState<FormState>({
    topic: '',
    audience: 'investor',
    voiceNotes: '',
    contactBgPrompt: '',
    referenceFiles: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const canSubmit = form.topic.trim().length >= 8 && !submitting;

  /** Count of optional fields that have something in them — surfaces in the disclosure label. */
  const moreFilledCount = useMemo(() => {
    let n = 0;
    if (form.voiceNotes.trim().length > 0) n += 1;
    if (form.contactBgPrompt.trim().length > 0) n += 1;
    if (form.referenceFiles.length > 0) n += 1;
    return n;
  }, [form.voiceNotes, form.contactBgPrompt, form.referenceFiles]);

  /** Cover-slide preview text — the user's typed topic, capped so it can't break the layout. */
  const coverPreview = useMemo(() => {
    const t = form.topic.trim();
    if (!t) return '';
    return t.length > 60 ? `${t.slice(0, 60)}…` : t;
  }, [form.topic]);

  const onPickReferenceFiles = (files: FileList | null) => {
    if (!files) return;
    const next: File[] = [...form.referenceFiles];
    for (const f of Array.from(files)) {
      if (next.length >= MAX_REFERENCE_FILES) {
        toast.warning(`Maximum ${MAX_REFERENCE_FILES} reference files.`);
        break;
      }
      if (f.size > MAX_REFERENCE_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name} is larger than ${MAX_REFERENCE_SIZE_MB}MB.`);
        continue;
      }
      next.push(f);
    }
    setForm({ ...form, referenceFiles: next });
  };

  const onRemoveFile = (idx: number) => {
    const next = form.referenceFiles.filter((_, i) => i !== idx);
    setForm({ ...form, referenceFiles: next });
  };

  /** Roving keyboard nav for the audience radiogroup. */
  const onAudienceKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setForm(f => ({ ...f, audience: NEXT_AUDIENCE[f.audience] }));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setForm(f => ({ ...f, audience: PREV_AUDIENCE[f.audience] }));
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // v1: backend generation pipeline lands in the next session.
      // See memory/presentation_port_plan.md — this is intentionally
      // a stub so the UI can be reviewed independently.
      await new Promise(r => setTimeout(r, 900));
      toast.success('Generation queued', {
        description: 'You\'ll get a notification when your presentation is ready to review. (Preview build — full pipeline launching shortly.)',
      });
      // Reset to a clean form so the adviser can queue another.
      setForm({
        topic: '',
        audience: 'investor',
        voiceNotes: '',
        contactBgPrompt: '',
        referenceFiles: [],
      });
      setMoreOpen(false);
    } catch (err) {
      toast.error('Could not queue your presentation', {
        description: 'Please try again, or write to concierge@realsight.com.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="animate-fade-in"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ─────── Slim top bar ─────── */}
      <div className="flex items-center justify-between gap-3 mb-7 lg:mb-9">
        <div className="flex items-center gap-2 min-w-0 text-[12px]">
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group rounded-md px-1.5 py-1 -mx-1.5 -my-1 min-h-[36px]"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
            <span className="font-medium">Studio</span>
          </Link>
          <span className="text-white/30" aria-hidden="true">/</span>
          <span className="font-semibold text-foreground" translate="no">Presentation</span>
          <span className="ml-1 inline-flex items-center rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em]">
            Beta
          </span>
        </div>
      </div>

      {/* ─────── Page title ─────── */}
      <div className="mb-7 lg:mb-9 max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-[#2effc0]/90 mb-3">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Studio · Presentation
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-[1.05] text-balance">
          Tell us about your deck.
        </h1>
        <p className="text-[14px] lg:text-[15px] text-muted-foreground leading-relaxed mt-3">
          We&rsquo;ll build a 5-page branded presentation in about 2&nbsp;minutes. Cover, summary, two deep-dive pages and a contact card — branded and ready to send.
        </p>
      </div>

      {/* ─────── Composer + Live preview grid ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">

        {/* LEFT — Composer */}
        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        >
          <div className="glass-panel accent-emerald p-5 sm:p-7">

            {/* Topic — the only big required input */}
            <div className="mb-6">
              <Label
                htmlFor="topic"
                className="block text-[14px] font-bold text-foreground mb-2.5"
              >
                What&rsquo;s it about?
                <span className="ml-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/50" aria-hidden="true">
                  required
                </span>
              </Label>
              <Textarea
                id="topic"
                name="topic"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Beachfront living in Dubai 2026 — what your AED 5M buys this season…"
                className="glass-input min-h-[112px] resize-none text-[15px] leading-relaxed"
                maxLength={240}
                aria-required="true"
                spellCheck
                autoComplete="off"
              />
              <p className="text-[11px] text-white/45 mt-2">
                One sentence is plenty. The more specific, the sharper the result.
              </p>
            </div>

            {/* Audience — radiogroup with subtitles */}
            <div className="mb-6">
              <p
                id="audience-label"
                className="block text-[14px] font-bold text-foreground mb-2.5"
              >
                Who&rsquo;s it for?
              </p>
              <div
                role="radiogroup"
                aria-labelledby="audience-label"
                className="grid grid-cols-3 gap-2"
              >
                {AUDIENCE_OPTIONS.map(opt => {
                  const active = form.audience === opt.v;
                  return (
                    <button
                      type="button"
                      key={opt.v}
                      role="radio"
                      aria-checked={active}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setForm({ ...form, audience: opt.v })}
                      onKeyDown={onAudienceKey}
                      className={cn(
                        'relative rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 min-h-[60px]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18D6A4]/65 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0628]',
                        active
                          ? 'border-[#18D6A4]/60 bg-[#18D6A4]/[0.08] shadow-[0_8px_24px_rgba(24,214,164,0.18)]'
                          : 'border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.18]',
                      )}
                    >
                      <p className={cn(
                        'text-[13px] font-bold leading-tight',
                        active ? 'text-foreground' : 'text-foreground/90',
                      )}>
                        {opt.label}
                      </p>
                      <p className={cn(
                        'text-[11px] leading-tight mt-0.5',
                        active ? 'text-[#2effc0]/75' : 'text-muted-foreground',
                      )}>
                        {opt.desc}
                      </p>
                      {active && (
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#18D6A4] shadow-[0_0_8px_#18D6A4]" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* More options — disclosure for voice / files / contact-bg */}
            <div>
              <button
                type="button"
                onClick={() => setMoreOpen(o => !o)}
                aria-expanded={moreOpen}
                aria-controls="more-fields"
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-dashed px-3.5 py-2.5 min-h-[44px] text-[13px] font-semibold transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18D6A4]/65 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0628]',
                  moreOpen
                    ? 'border-[#18D6A4]/45 bg-[#18D6A4]/[0.06] text-foreground'
                    : 'border-white/[0.18] bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:border-white/[0.25] hover:text-foreground',
                )}
              >
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform duration-200', moreOpen && 'rotate-180')}
                  aria-hidden="true"
                />
                More options
                <span className={cn(
                  'ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums',
                  moreFilledCount > 0
                    ? 'bg-[#18D6A4]/15 text-[#2effc0]'
                    : 'bg-white/[0.06] text-white/55',
                )}>
                  {moreFilledCount > 0 ? `${moreFilledCount} of 3` : '+ 3 fields'}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {moreOpen && (
                  <motion.div
                    id="more-fields"
                    key="more-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5 space-y-5">

                      {/* Voice notes */}
                      <div>
                        <Label
                          htmlFor="voice"
                          className="block text-[13px] font-bold text-foreground mb-2"
                        >
                          Voice notes
                          <span className="ml-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                            optional
                          </span>
                        </Label>
                        <Textarea
                          id="voice"
                          name="voiceNotes"
                          value={form.voiceNotes}
                          onChange={(e) => setForm({ ...form, voiceNotes: e.target.value })}
                          placeholder="e.g. Lean on yield numbers. Mention the new metro line. Avoid the word &lsquo;opportunity&rsquo;…"
                          className="glass-input min-h-[80px] resize-none text-[14px]"
                          maxLength={500}
                        />
                        <p className="text-[11px] text-white/45 mt-2">
                          Tone, angle, what to emphasise, what to avoid. We&rsquo;ll honour it.
                        </p>
                      </div>

                      {/* Reference files */}
                      <div>
                        <p className="block text-[13px] font-bold text-foreground mb-2">
                          Reference material
                          <span className="ml-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                            optional · up to {MAX_REFERENCE_FILES}&nbsp;PDFs · {MAX_REFERENCE_SIZE_MB}&nbsp;MB each
                          </span>
                        </p>
                        <label
                          htmlFor="ref-files"
                          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.18] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#18D6A4]/45 transition-all cursor-pointer py-5 px-4 text-center min-h-[64px]"
                        >
                          <Upload className="h-4 w-4 text-white/55" aria-hidden="true" />
                          <span className="text-[12.5px] font-semibold text-white/80">
                            Drop PDFs or click to upload
                          </span>
                          <input
                            id="ref-files"
                            type="file"
                            accept="application/pdf"
                            multiple
                            onChange={(e) => onPickReferenceFiles(e.target.files)}
                            className="hidden"
                          />
                        </label>
                        {form.referenceFiles.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {form.referenceFiles.map((f, i) => (
                              <li
                                key={`${f.name}-${i}`}
                                className="flex items-center gap-2 text-[12px] text-white/80 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2"
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0 text-[#18D6A4]" aria-hidden="true" />
                                <span className="flex-1 truncate min-w-0">{f.name}</span>
                                <span className="text-[10.5px] text-white/55 tabular-nums shrink-0">
                                  {(f.size / 1024 / 1024).toFixed(1)}&nbsp;MB
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onRemoveFile(i)}
                                  className="text-white/55 hover:text-red-400 transition-colors p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/65"
                                  aria-label={`Remove ${f.name}`}
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Contact background prompt */}
                      <div>
                        <Label
                          htmlFor="contact-bg"
                          className="block text-[13px] font-bold text-foreground mb-2"
                        >
                          Contact-page scene
                          <span className="ml-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                            optional
                          </span>
                        </Label>
                        <Input
                          id="contact-bg"
                          name="contactBgPrompt"
                          value={form.contactBgPrompt}
                          onChange={(e) => setForm({ ...form, contactBgPrompt: e.target.value })}
                          placeholder="e.g. quiet villa terrace at dusk overlooking the marina…"
                          className="glass-input"
                          maxLength={300}
                        />
                        <p className="text-[11px] text-white/45 mt-2">
                          The image behind your contact details on the last page. Leave blank for our default.
                        </p>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Composer footer — meta + Generate */}
            <div className="mt-7 pt-5 border-t border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-[11.5px] text-white/55">
                <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.10] px-2.5 py-1 tabular-nums">
                  5&nbsp;pages
                </span>
                <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.10] px-2.5 py-1 tabular-nums">
                  ~2&nbsp;min
                </span>
              </div>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                size="lg"
                className="rounded-full px-6 font-bold shrink-0 transition-transform hover:-translate-y-px"
                style={{
                  background: canSubmit
                    ? 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)'
                    : undefined,
                  color: canSubmit ? '#04130b' : undefined,
                }}
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> Queueing…</>
                  : <><Sparkles className="h-4 w-4 mr-2" aria-hidden="true" /> Generate Presentation</>}
              </Button>
            </div>

          </div>
        </motion.div>

        {/* RIGHT — Live preview */}
        <motion.aside
          className="lg:col-span-5 lg:sticky lg:top-6 lg:self-start"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
          aria-live="polite"
          aria-atomic="false"
          aria-label="Deck preview"
        >
          <div className="glass-panel p-5 sm:p-6">

            {/* Preview header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-foreground">Live preview</p>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2effc0]/85" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18D6A4] shadow-[0_0_8px_#18D6A4]" />
                Updates as you type
              </span>
            </div>

            {/* Slide grid: cover full-width on top, 2×2 below */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Cover — spans 2 cols */}
              <div
                className="col-span-2 rounded-xl border border-white/[0.10] p-3.5 flex flex-col justify-between overflow-hidden relative"
                style={{
                  aspectRatio: '22 / 7',
                  background: 'radial-gradient(70% 100% at 0% 100%, rgba(46, 255, 192, 0.22), transparent 65%), linear-gradient(135deg, #0e1830 0%, #06122a 100%)',
                }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55">01 · Cover</p>
                <div>
                  {coverPreview ? (
                    <>
                      <p className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-[#2effc0]/80 mb-1">Your input</p>
                      <p className="text-[14px] font-bold text-foreground leading-tight line-clamp-2">{coverPreview}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-white/40 mb-1">Awaiting topic</p>
                      <p className="text-[13px] font-semibold text-white/45 leading-tight">
                        Your headline lands here once you start typing.
                      </p>
                    </>
                  )}
                  <div className="flex gap-1.5 mt-2">
                    <span className="h-1 w-10 rounded-sm bg-white/10" />
                    <span className="h-1 w-6 rounded-sm bg-white/[0.06]" />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div
                className="rounded-xl border border-white/[0.10] p-3 flex flex-col justify-between overflow-hidden"
                style={{ aspectRatio: '16 / 10', background: 'linear-gradient(135deg, #0a1f1a 0%, #08151b 100%)' }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55">02 · Summary</p>
                <div className="flex flex-col gap-1">
                  <span className="h-1.5 w-full rounded-sm bg-white/10" />
                  <span className="h-1.5 w-3/5 rounded-sm bg-white/10" />
                  <span className="h-1.5 w-2/5 rounded-sm bg-white/[0.07]" />
                </div>
              </div>

              {/* Detail A */}
              <div
                className="rounded-xl border border-white/[0.10] p-3 flex flex-col justify-between overflow-hidden"
                style={{ aspectRatio: '16 / 10', background: 'linear-gradient(135deg, #110a35 0%, #0a0628 100%)' }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55">03 · Detail A</p>
                <div className="flex flex-col gap-1">
                  <span className="h-1.5 w-full rounded-sm bg-white/10" />
                  <span className="h-1.5 w-3/5 rounded-sm bg-white/10" />
                </div>
              </div>

              {/* Detail B */}
              <div
                className="rounded-xl border border-white/[0.10] p-3 flex flex-col justify-between overflow-hidden"
                style={{ aspectRatio: '16 / 10', background: 'linear-gradient(135deg, #1c102f 0%, #0e0926 100%)' }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55">04 · Detail B</p>
                <div className="flex flex-col gap-1">
                  <span className="h-1.5 w-full rounded-sm bg-white/10" />
                  <span className="h-1.5 w-3/5 rounded-sm bg-white/10" />
                </div>
              </div>

              {/* Contact */}
              <div
                className="rounded-xl border border-white/[0.10] p-3 flex flex-col justify-between overflow-hidden relative"
                style={{
                  aspectRatio: '16 / 10',
                  background: 'radial-gradient(60% 90% at 100% 100%, rgba(123, 92, 255, 0.20), transparent 60%), linear-gradient(135deg, #0c0a26 0%, #07041a 100%)',
                }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55">05 · Contact</p>
                <div className="flex flex-col gap-1">
                  <span className="h-1.5 w-full rounded-sm bg-white/10" />
                  <span className="h-1.5 w-2/5 rounded-sm bg-white/[0.07]" />
                </div>
              </div>
            </div>

            {/* Footer caption */}
            <p className="text-[11px] text-white/40 leading-relaxed mt-4 pt-3 border-t border-white/[0.06]">
              Preview updates as you type. The full deck generates in about 2&nbsp;minutes and lands in your drafts.
            </p>
          </div>

          {/* Page-count badges shown on desktop only — small reassurance under preview */}
          <p className="text-[11px] text-white/40 mt-3 px-1 hidden lg:block">
            {DECK_PAGES.map(p => p.label).join(' · ')}
          </p>
        </motion.aside>
      </div>
    </motion.div>
  );
}
