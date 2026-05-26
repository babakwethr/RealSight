/**
 * Step 5 — Publish (V3, Mobbin-grounded).
 *
 * Mobbin grounding:
 *   - Gamma share modal — tabbed Link / Embed / Export
 *     https://mobbin.com/screens/8665be6a-dd30-4335-aca3-589b43ed7760
 *   - Gamma "Link copied · Start presenting" focus state
 *     https://mobbin.com/screens/d31c151e-10c8-4f69-928a-4eea183f8d1d
 *   - Pitch public-access lifecycle subnav
 *     https://mobbin.com/screens/16fc533a-5443-4759-a588-60840f66d124
 *
 * Behaviour: two states.
 *
 *   - Draft (default): big cover preview on the left, a single primary
 *     CTA "Open deck preview" on the right + the secondary exports
 *     (PDF, HTML, share link) waiting their turn.
 *
 *   - Published: the panel flips into a focused "Your deck is live"
 *     state with a copy-link affordance + three sub-actions
 *     (Open · Present · Customize URL). Tabs underneath surface Embed
 *     / PDF for later.
 *
 * Publishing itself still happens from /studio/decks/:id (DeckPreview's
 * footer publish button) — this step's CTA links there. After publish,
 * DeckPreview persists share_token to studio_decks; on return we read
 * it from the draft and render the published state.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Code,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Play,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { CoverPreviewCard } from './CoverPreviewCard';
import { cn } from '@/lib/utils';
import { lightTap, mediumTap } from '@/lib/capacitor';
import type { ComposerContext } from './types';

type Tab = 'link' | 'embed' | 'pdf';

export function StepPublish({ draft }: ComposerContext) {
  const navigate = useNavigate();
  const slideCount =
    (draft.html_slides?.length ?? 0) || (draft.outline?.length ?? 0);
  const hasDeckId = Boolean(draft.id);
  const canPublish = hasDeckId && slideCount > 0;

  // We treat the deck as "published" the moment a share link exists on
  // the row. The composer doesn't hold that state — DeckPreview writes
  // it — so we infer from draft.id + the supabase query we already do
  // when loading. For now, surface the action panel from this page.
  const [tab, setTab] = useState<Tab>('link');
  const [copied, setCopied] = useState(false);
  const [publishedUrl] = useState<string | null>(null); // placeholder — see DeckPreview

  const onCopy = async () => {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      void mediumTap();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Copy failed — long-press the link instead.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#18d6a4]/25 bg-[#18d6a4]/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#2effc0]">
            <Send className="h-3 w-3" />
            Step 5 of 5 — Publish
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Your deck is ready.
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/55">
            Open the live preview to fullscreen, present, or grab a share link.
            Looks the same on a laptop, an iPad, or a phone.
          </p>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 backdrop-blur-md">
          {slideCount} slides · {draft.template_slug}
        </span>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Big preview */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl">
          <CoverPreviewCard draft={draft} />
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-white/[0.10] bg-[#0c0a1a]/40 p-5 backdrop-blur-md">
          {canPublish ? (
            <AnimatePresence mode="wait">
              {publishedUrl ? (
                <motion.div
                  key="published"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  {/* Link copied focus state — Gamma */}
                  <div className="rounded-2xl border border-[#18d6a4]/35 bg-[#18d6a4]/[0.06] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2effc0]">
                      <Sparkles className="mr-1 inline h-3 w-3" />
                      Live
                    </div>
                    <button
                      type="button"
                      onClick={onCopy}
                      className={cn(
                        'mt-3 flex w-full items-center justify-between gap-2 rounded-xl border bg-white/[0.04] px-3 py-2 transition-colors',
                        copied
                          ? 'border-[#18d6a4]/55 text-[#2effc0]'
                          : 'border-white/[0.10] text-white/85 hover:border-white/[0.24]',
                      )}
                    >
                      <span className="truncate font-mono text-xs sm:text-[13px]">
                        {publishedUrl.replace(/^https?:\/\//, '')}
                      </span>
                      {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                    </button>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <ActionCard
                        icon={<Eye className="h-3.5 w-3.5" />}
                        label="Open"
                        onClick={() => navigate(`/studio/decks/${draft.id}`)}
                      />
                      <ActionCard
                        icon={<Play className="h-3.5 w-3.5" />}
                        label="Present"
                        onClick={() => navigate(`/studio/decks/${draft.id}?present=1`)}
                      />
                      <ActionCard
                        icon={<Globe className="h-3.5 w-3.5" />}
                        label="Customize"
                        disabled
                        title="Custom URLs land next"
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="draft"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                    Take it live
                  </div>
                  <Link
                    to={`/studio/decks/${draft.id}`}
                    onClick={() => void lightTap()}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.14em] transition-all',
                      'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Open deck preview
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <p className="text-xs text-white/55">
                    Pick photos if you want, then hit Publish in the preview —
                    you'll get a shareable{' '}
                    <span className="font-mono text-white/80">realsight.app/r/XXX</span>{' '}
                    link.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 text-center text-sm text-white/55 backdrop-blur-sm">
              <ExternalLink className="mx-auto mb-2 h-5 w-5 text-white/45" />
              Draft a deck in Step 3 first.
            </div>
          )}

          {/* Tabs — Gamma share modal */}
          <div className="mt-1 flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
            <TabButton active={tab === 'link'} onClick={() => setTab('link')}>
              Link
            </TabButton>
            <TabButton active={tab === 'embed'} onClick={() => setTab('embed')}>
              Embed
            </TabButton>
            <TabButton active={tab === 'pdf'} onClick={() => setTab('pdf')}>
              Export
            </TabButton>
          </div>

          {tab === 'link' ? (
            <ExportRow
              icon={<ExternalLink className="h-4 w-4 text-white/70" />}
              title="Public share link"
              hint="Publish from the preview to generate."
              cta={canPublish ? 'Open preview →' : null}
              onClick={canPublish ? () => navigate(`/studio/decks/${draft.id}`) : undefined}
            />
          ) : tab === 'embed' ? (
            <ExportRow
              icon={<Code className="h-4 w-4 text-white/70" />}
              title="Embed <iframe>"
              hint="Drop into your agency website."
              soon
            />
          ) : (
            <div className="flex flex-col gap-2">
              <ExportRow
                icon={<Download className="h-4 w-4 text-white/70" />}
                title="Download PDF"
                hint={`${slideCount} pages · 1280×800`}
                soon
              />
              <ExportRow
                icon={<Download className="h-4 w-4 text-white/70" />}
                title="Download HTML (offline)"
                hint="Single-file, plays anywhere"
                soon
              />
            </div>
          )}

          <div className="mt-2 border-t border-white/[0.08] pt-4 text-xs text-white/45">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
              <Wand2 className="mr-1 inline h-3 w-3 text-[#18d6a4]" /> Coming
            </div>
            <p className="mt-2 leading-relaxed">
              Deck analytics · presenter remote on phone · matching Instagram +
              LinkedIn social pack from this same deck.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Bits ──────────────────────────────────────────────────────────

function ActionCard({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border transition-colors',
        disabled
          ? 'border-white/[0.06] bg-white/[0.02] text-white/35 cursor-not-allowed'
          : 'border-white/[0.10] bg-white/[0.04] text-white hover:border-[#18d6a4]/35 hover:bg-[#18d6a4]/10',
      )}
    >
      <span className={cn('rounded-full p-1.5', disabled ? 'bg-white/[0.04]' : 'bg-[#18d6a4]/15 text-[#2effc0]')}>
        {icon}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em]">{label}</span>
    </button>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void lightTap();
        onClick();
      }}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors',
        active
          ? 'bg-[#18d6a4]/15 text-[#2effc0] ring-1 ring-inset ring-[#18d6a4]/40'
          : 'text-white/55 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

function ExportRow({
  icon,
  title,
  hint,
  cta,
  soon,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  cta?: string | null;
  soon?: boolean;
  onClick?: () => void;
}) {
  const disabled = soon || !onClick;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border bg-white/[0.04] p-4 text-left backdrop-blur-md transition-colors',
        disabled
          ? 'border-white/[0.08] opacity-65 cursor-not-allowed'
          : 'border-white/[0.10] hover:border-[#18d6a4]/35',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{title}</div>
          <div className="truncate text-xs text-white/55">{hint}</div>
        </div>
      </div>
      <div className="shrink-0">
        {soon ? (
          <span className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/65">
            Soon
          </span>
        ) : cta ? (
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2effc0]">{cta}</span>
        ) : null}
      </div>
    </button>
  );
}
