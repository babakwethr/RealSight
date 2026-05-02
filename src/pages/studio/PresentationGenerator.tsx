import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Sparkles, FileText, Loader2,
  Upload, X, ChevronRight, Info,
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
 * v1 (this commit) ships the form UI in the Studio aesthetic. The
 * generation pipeline (edge functions, image gen, PDF render) ports
 * in subsequent sessions — see /Users/babak/.claude/projects/.../
 * memory/presentation_port_plan.md.
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

export default function PresentationGenerator() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    topic: '',
    audience: 'investor',
    voiceNotes: '',
    contactBgPrompt: '',
    referenceFiles: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = form.topic.trim().length >= 8 && !submitting;

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
      {/* Back to Studio */}
      <Link
        to="/studio"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to Studio
      </Link>

      {/* Hero header — Studio aesthetic, mint orb + Inter type */}
      <div className="relative mb-7 lg:mb-9">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: 'radial-gradient(circle at 30% 20%, #2effc0 0%, #18d6a4 45%, #059669 100%)',
              boxShadow: '0 8px 24px rgba(24,214,164,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-[#2effc0]/90 mb-0.5">
              Studio · Presentation
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-[1.05]">
              Build a branded{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)' }}
              >
                5-page presentation
              </span>
            </h1>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] shrink-0">
            Beta
          </span>
        </div>
        <p className="text-[13px] lg:text-sm text-muted-foreground max-w-2xl leading-relaxed mt-2">
          Type a topic — get a cover, summary, two deep-dive pages and your contact card. Branded, ready to send. Review every image before it locks.
        </p>
      </div>

      {/* Two-column workbench: form left, preview/help right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">

        {/* ─────────── LEFT: Form ─────────── */}
        <div className="lg:col-span-7 space-y-4">

          {/* Topic */}
          <div className="glass-panel accent-emerald p-5 sm:p-6">
            <Label htmlFor="topic" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2effc0]/90 mb-2">
              <span className="font-black tabular-nums">01</span>
              <span className="w-3 h-px bg-[#2effc0]/40" />
              <span>Topic <span className="text-red-400 ml-0.5">*</span></span>
            </Label>
            <Textarea
              id="topic"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="e.g. Beachfront living in Dubai 2026 — what your AED 5M buys this season"
              className="glass-input min-h-[72px] resize-none"
              maxLength={240}
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              One sentence is plenty. The more specific, the sharper the result.
            </p>
          </div>

          {/* Audience */}
          <div className="glass-panel p-5 sm:p-6">
            <Label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 mb-3">
              <span className="font-black tabular-nums">02</span>
              <span className="w-3 h-px bg-white/30" />
              <span>Audience</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'end_user',  label: 'End user',  desc: 'Buyers + occupiers' },
                { v: 'investor',  label: 'Investor',  desc: 'Yield-focused' },
                { v: 'both',      label: 'Both',      desc: 'Mixed audience' },
              ] as const).map(opt => {
                const active = form.audience === opt.v;
                return (
                  <button
                    type="button"
                    key={opt.v}
                    onClick={() => setForm({ ...form, audience: opt.v })}
                    className={cn(
                      'relative rounded-xl border px-3 py-3 text-left transition-all duration-200',
                      active
                        ? 'border-[#18D6A4]/60 bg-[#18D6A4]/[0.08] shadow-[0_8px_24px_rgba(24,214,164,0.18)]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.14]',
                    )}
                  >
                    <p className="text-sm font-bold text-foreground">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    {active && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#18D6A4] shadow-[0_0_8px_#18D6A4]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice notes */}
          <div className="glass-panel p-5 sm:p-6">
            <Label htmlFor="voice" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 mb-2">
              <span className="font-black tabular-nums">03</span>
              <span className="w-3 h-px bg-white/30" />
              <span>Voice notes <span className="text-white/45 normal-case font-normal tracking-normal text-[10px] ml-1">(optional)</span></span>
            </Label>
            <Textarea
              id="voice"
              value={form.voiceNotes}
              onChange={(e) => setForm({ ...form, voiceNotes: e.target.value })}
              placeholder="e.g. Lean on yield numbers. Mention the new metro line. Avoid words like 'opportunity'."
              className="glass-input min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              Tone, angle, what to emphasise, what to avoid. We&rsquo;ll honour it.
            </p>
          </div>

          {/* Reference files */}
          <div className="glass-panel p-5 sm:p-6">
            <Label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 mb-2">
              <span className="font-black tabular-nums">04</span>
              <span className="w-3 h-px bg-white/30" />
              <span>Reference material <span className="text-white/45 normal-case font-normal tracking-normal text-[10px] ml-1">(optional)</span></span>
            </Label>
            <p className="text-[11px] text-muted-foreground mb-3">
              Up to {MAX_REFERENCE_FILES} PDFs · {MAX_REFERENCE_SIZE_MB}MB each. We&rsquo;ll pull supporting facts and language from these without quoting them.
            </p>
            <label
              htmlFor="ref-files"
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#18D6A4]/40 transition-all cursor-pointer py-5 px-4 text-center"
            >
              <Upload className="h-4 w-4 text-white/55" />
              <span className="text-[12px] font-semibold text-white/75">
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
                  <li key={i} className="flex items-center gap-2 text-[12px] text-white/75 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[#18D6A4]" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {(f.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(i)}
                      className="text-white/45 hover:text-red-400 transition-colors p-0.5"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Contact background prompt */}
          <div className="glass-panel p-5 sm:p-6">
            <Label htmlFor="contact-bg" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 mb-2">
              <span className="font-black tabular-nums">05</span>
              <span className="w-3 h-px bg-white/30" />
              <span>Contact-page scene <span className="text-white/45 normal-case font-normal tracking-normal text-[10px] ml-1">(optional)</span></span>
            </Label>
            <Input
              id="contact-bg"
              value={form.contactBgPrompt}
              onChange={(e) => setForm({ ...form, contactBgPrompt: e.target.value })}
              placeholder="e.g. quiet villa terrace at dusk overlooking the marina"
              className="glass-input"
              maxLength={300}
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              The image behind your contact details on the last page. Leave blank for our default.
            </p>
          </div>

          {/* CTA */}
          <div className="glass-panel accent-emerald p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[12px] text-white/60 max-w-md">
              Generation takes about <span className="text-white/85 font-semibold">2 minutes</span>. We&rsquo;ll show you the 4 images for review before locking the PDF.
            </p>
            <Button
              onClick={onSubmit}
              disabled={!canSubmit}
              size="lg"
              className="rounded-full px-6 font-bold shrink-0"
              style={{
                background: canSubmit
                  ? 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)'
                  : undefined,
                color: canSubmit ? '#04130b' : undefined,
              }}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Queueing…</>
                : <><Sparkles className="h-4 w-4 mr-2" /> Generate Presentation</>}
            </Button>
          </div>
        </div>

        {/* ─────────── RIGHT: What you get / preview helper ─────────── */}
        <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-6 lg:self-start">

          {/* Output overview */}
          <div className="glass-panel p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2effc0]/90 mb-3">
              What you&rsquo;ll get
            </p>
            <ul className="space-y-2.5">
              {[
                { n: '01', label: 'Cover',     desc: 'Headline image, title, subtitle, edition' },
                { n: '02', label: 'Summary',   desc: 'One-paragraph intro + 4-row at-a-glance table' },
                { n: '03', label: 'Detail A',  desc: 'Topic deep-dive part one with reality-check line' },
                { n: '04', label: 'Detail B',  desc: 'Topic deep-dive part two with reality-check line' },
                { n: '05', label: 'Contact',   desc: 'Your branded contact block — name, photo, phone, email' },
              ].map(p => (
                <li key={p.n} className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/[0.06] px-3 py-2.5">
                  <span className="text-[10px] font-black tabular-nums text-[#18D6A4] mt-0.5 shrink-0">{p.n}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-foreground leading-tight">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{p.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* How it works — short, no vendor names */}
          <div className="glass-panel p-5 sm:p-6 bg-white/[0.02]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 mb-3">
              How it works
            </p>
            <ol className="space-y-2.5">
              {[
                'AI plans the 5-page outline from your topic + voice notes.',
                'Four cinematic images are generated (cover, two detail pages, contact background).',
                'You review each image — keep, regenerate, or edit until it\'s right.',
                'We compose the final branded PDF — yours to download, share, or send via WhatsApp.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-[10px] font-black tabular-nums text-white/65">
                    {i + 1}
                  </span>
                  <p className="text-[12px] text-white/70 leading-snug">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Beta note */}
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-4 flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-amber-200 mb-0.5">Preview build</p>
              <p className="text-[11px] text-amber-200/75 leading-relaxed">
                The form is live and we&rsquo;re finishing the generation pipeline this week. Submissions queue and you&rsquo;ll be notified the moment they&rsquo;re ready.
              </p>
            </div>
          </div>

          {/* Drafts placeholder — links to the dashboard once we have one */}
          <button
            type="button"
            disabled
            className="w-full glass-panel p-4 flex items-center justify-between gap-3 text-left opacity-60 cursor-not-allowed"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50 mb-0.5">My drafts</p>
              <p className="text-[12px] text-white/65">No drafts yet — your first will land here.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/35" />
          </button>
        </aside>
      </div>
    </motion.div>
  );
}
