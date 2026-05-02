import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Bell, CheckCircle2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  STUDIO_TOOLS,
  studioToolCounts,
  TONE_PALETTE,
  type StudioTool,
} from '@/data/studioTools';
import { StudioIllustration } from '@/components/studio/StudioIllustrations';

/**
 * Studio — adviser tools workspace (v3, 2 May 2026).
 *
 * Visual language: existing V3 design system — Inter typography,
 * glass-panel surfaces, mint #18D6A4 hero accent, no introduced
 * fonts. Four cards only — Presentation, Social Pack, Video Studio,
 * Buyer Matcher — each with a custom on-brand SVG illustration that
 * communicates what the tool does. Cards animate on hover via
 * Framer Motion variants flowing into the illustrations themselves.
 *
 * Notify-me state stored in localStorage (v1) so cards remember
 * which tools the adviser has opted into.
 */

// ── localStorage key for notify-me ───────────────────────────────────
const NOTIFY_KEY = 'studio.notifyMe';

function loadNotifyMe(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(NOTIFY_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveNotifyMe(state: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(state));
  } catch {
    // Silent — toast already confirmed intent.
  }
}

// ── Easing ───────────────────────────────────────────────────────────
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export default function Studio() {
  const navigate = useNavigate();
  const counts = useMemo(studioToolCounts, []);
  const [openTool, setOpenTool] = useState<StudioTool | null>(null);
  const [notified, setNotified] = useState<Record<string, number>>(loadNotifyMe);

  // Page reveal — kick once on mount.
  const [hasRevealed, setHasRevealed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setHasRevealed(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const handleCardClick = (tool: StudioTool) => {
    if (tool.status === 'live' || tool.status === 'beta') {
      if (tool.route) navigate(tool.route);
      return;
    }
    setOpenTool(tool);
  };

  const handleNotifyMe = (tool: StudioTool) => {
    const next = { ...notified, [tool.slug]: Date.now() };
    setNotified(next);
    saveNotifyMe(next);
    toast.success("On the list.", {
      description: `We'll let you know when ${tool.name} launches.`,
    });
    setOpenTool(null);
  };

  return (
    <div className="animate-fade-in">
      {/* ── Hero header — V3 mint accent + Inter type ── */}
      <div className="relative mb-7 lg:mb-9">
        <div className="flex items-center gap-3 mb-1.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: 'radial-gradient(circle at 30% 20%, #2effc0 0%, #18d6a4 45%, #059669 100%)',
              boxShadow: '0 8px 24px rgba(24,214,164,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-[#2effc0]/90">
            Adviser Studio
          </p>
          <div className="flex-1" />
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 text-[10.5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2effc0] animate-pulse" />
            <span className="font-semibold text-white/75">{counts.live} live · {counts.coming} coming</span>
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-[1.05]">
          Tools that{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)' }}
          >
            build your business
          </span>
        </h1>
        <p className="text-[13px] lg:text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          Branded presentations, social packs, cinematic video pitches and AI matchmaking — fresh tools added every month.
        </p>
      </div>

      {/* ── Card grid — 4 cards: 1-col mobile, 2-col tablet, 4-col wide desktop ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {STUDIO_TOOLS.map((tool, i) => (
          <ToolCard
            key={tool.slug}
            tool={tool}
            index={i}
            hasRevealed={hasRevealed}
            notified={!!notified[tool.slug]}
            onClick={() => handleCardClick(tool)}
          />
        ))}
      </div>

      {/* ── Footer line — feedback CTA ── */}
      <div className="mt-8 lg:mt-10 flex items-center justify-center">
        <p className="text-[12px] text-white/40">
          Got an idea for a tool?{' '}
          <a
            href="mailto:concierge@realsight.com?subject=Studio%20tool%20idea"
            className="text-[#7aa6ff] hover:text-[#9fb9ff] underline-offset-2 hover:underline transition-colors font-semibold"
          >
            Tell us →
          </a>
        </p>
      </div>

      {/* ── Notify-me modal ── */}
      <Dialog open={!!openTool} onOpenChange={(o) => !o && setOpenTool(null)}>
        <DialogContent className="sm:max-w-md">
          {openTool && (
            <NotifyMeModal
              tool={openTool}
              alreadyNotified={!!notified[openTool.slug]}
              onConfirm={() => handleNotifyMe(openTool)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// ToolCard — small, glassmorphic, V3-on-brand, illustration-led
// ──────────────────────────────────────────────────────────────────────

interface ToolCardProps {
  tool: StudioTool;
  index: number;
  hasRevealed: boolean;
  notified: boolean;
  onClick: () => void;
}

function ToolCard({ tool, index, hasRevealed, notified, onClick }: ToolCardProps) {
  const Icon = tool.icon;
  const palette = TONE_PALETTE[tool.tone];
  const isLive = tool.status === 'live' || tool.status === 'beta';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      // Variants drive both the entry sequence AND the hover state. Using
      // string labels (hidden / rest / hover) lets the same labels cascade
      // into the SVG illustration's motion children — no prop drilling.
      variants={{
        hidden: { opacity: 0, y: 20 },
        rest:   { opacity: 1, y: 0 },
        hover:  { y: -2 },
      }}
      initial="hidden"
      animate={hasRevealed ? 'rest' : 'hidden'}
      whileHover="hover"
      transition={{
        duration: 0.55,
        ease: EASE_OUT,
        delay: 0.1 + index * 0.06,
      }}
      className={cn(
        'group relative flex flex-col text-left rounded-2xl overflow-hidden',
        'glass-panel transition-shadow duration-300',
      )}
      style={{
        // Hover ring colour driven from tone palette via a CSS var.
        ['--ring' as string]: palette.ring,
      }}
      aria-label={`${tool.name} — ${isLive ? 'open' : 'notify me when it launches'}`}
    >
      {/* Illustration plate — small, contained */}
      <div
        className="relative w-full aspect-[1.7/1] overflow-hidden rounded-t-2xl"
        style={{
          // Subtle tone wash behind the illustration.
          background: `radial-gradient(ellipse 80% 100% at 50% 100%, ${palette.accent}10 0%, transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)`,
        }}
      >
        {/* The motion variant inheritance: parent button has whileHover="hover".
            The illustration's <motion.g> children listen for the same variant
            and animate accordingly — no prop drilling needed. */}
        <div className="absolute inset-0 p-1.5">
          <StudioIllustration id={tool.illustration} tone={tool.tone} />
        </div>

        {/* Status chip — top-right */}
        <div className="absolute top-2.5 right-2.5">
          <StatusChip tool={tool} palette={palette} />
        </div>

        {/* Notified pill — top-left when adviser opted in */}
        {!isLive && notified && (
          <div className="absolute top-2.5 left-2.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold backdrop-blur"
              style={{
                background: palette.chipBg,
                color: palette.chipFg,
                border: `1px solid ${palette.chipBorder}`,
              }}
            >
              <Bell className="h-2.5 w-2.5" />
              ON THE LIST
            </span>
          </div>
        )}
      </div>

      {/* Meta strip */}
      <div className="px-4 sm:px-4 pt-3.5 pb-4 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
          <Icon className="h-3 w-3" style={{ color: palette.accent }} />
          <span>{tool.comingLabel ?? 'Available'}</span>
        </div>
        <h3 className="text-[15px] sm:text-base font-bold text-foreground leading-tight">
          {tool.name}
        </h3>
        <p className="text-[12.5px] text-muted-foreground leading-snug">
          {tool.tagline}
        </p>

        {/* CTA row */}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/55 group-hover:text-white transition-colors">
          <span>{isLive ? 'Open tool' : 'Notify me'}</span>
          <ArrowRight
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            style={{ color: palette.accent }}
          />
        </div>
      </div>

      {/* Tone-coloured ring on hover */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ boxShadow: 'inset 0 0 0 1px var(--ring), 0 12px 36px -8px var(--ring)' }}
      />
    </motion.button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Status chip — small, monochrome-ish, status-aware
// ──────────────────────────────────────────────────────────────────────

interface StatusChipProps {
  tool: StudioTool;
  palette: { accent: string; chipBg: string; chipFg: string; chipBorder: string };
}

function StatusChip({ tool, palette }: StatusChipProps) {
  if (tool.status === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.18em] backdrop-blur"
        style={{
          background: palette.chipBg,
          color: palette.chipFg,
          border: `1px solid ${palette.chipBorder}`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: palette.accent, boxShadow: `0 0 8px ${palette.accent}` }}
        />
        Live
      </span>
    );
  }
  if (tool.status === 'beta') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.18em] backdrop-blur">
        Beta
      </span>
    );
  }
  // coming
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] text-white/70 border border-white/[0.10] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.16em] backdrop-blur">
      {tool.comingLabel ?? 'Coming'}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Notify-me modal contents
// ──────────────────────────────────────────────────────────────────────

interface NotifyMeModalProps {
  tool: StudioTool;
  alreadyNotified: boolean;
  onConfirm: () => void;
}

function NotifyMeModal({ tool, alreadyNotified, onConfirm }: NotifyMeModalProps) {
  const palette = TONE_PALETTE[tool.tone];
  const Icon = tool.icon;
  return (
    <>
      <DialogHeader>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${palette.accent} 0%, ${palette.accent}99 60%, ${palette.accent}55 100%)`,
            boxShadow: `0 12px 32px ${palette.ring}, inset 0 1px 0 rgba(255,255,255,0.45)`,
          }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <DialogTitle className="text-xl font-bold tracking-tight">
          {tool.name}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed pt-1">
          {tool.tagline}
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1">
          Status
        </p>
        <p className="text-sm font-semibold text-foreground">
          Coming {tool.comingLabel}
        </p>
      </div>
      <AnimatePresence mode="wait">
        {alreadyNotified ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-emerald-400 rounded-xl bg-emerald-400/10 border border-emerald-400/20 px-3 py-2.5"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>You&rsquo;re on the list — we&rsquo;ll write when it launches.</span>
          </motion.div>
        ) : (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Button
              size="lg"
              className="rounded-full font-bold w-full"
              style={{
                background: 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)',
                color: '#04130b',
              }}
              onClick={onConfirm}
            >
              <Bell className="h-4 w-4 mr-2" />
              Notify me when it launches
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
