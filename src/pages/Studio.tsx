import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Bell, CheckCircle2 } from 'lucide-react';
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

/**
 * Studio — adviser tools workspace.
 *
 * Design language: editorial atelier. Reads like a Christie's catalogue
 * crossed with a Higgsfield UI: numbered tools, large display serif,
 * cinematic photography, asymmetric grid, monospaced tactical labels,
 * and a film-grain canvas overlay. Mint and gold are the only accents
 * — applied surgically, not painted everywhere.
 *
 * Motion choreography:
 *  · 1.0s — fade-in canvas + line-draw across the editorial title rule
 *  · 0.4s — display headline reveals letter-by-letter via clip mask
 *  · 0.6s — cards stagger up with overshoot (live first, then coming)
 *  · scroll — hero photo parallaxes ~80px to anchor the page
 *  · hover — Ken Burns zoom on photo + accent line draws under the title
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

// ── Easing curves ────────────────────────────────────────────────────
const EASE_OUT = [0.16, 1, 0.3, 1] as const;          // cinematic deceleration
const EASE_OVERSHOOT = [0.34, 1.56, 0.64, 1] as const; // card pop on entry

// ── Film grain SVG (inline, ~1KB, no extra request) ──────────────────
const FILM_GRAIN_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>`,
)}`;

export default function Studio() {
  const navigate = useNavigate();
  const counts = useMemo(studioToolCounts, []);
  const [openTool, setOpenTool] = useState<StudioTool | null>(null);
  const [notified, setNotified] = useState<Record<string, number>>(loadNotifyMe);

  // Hero photo parallax — subtle, ~80px over the first viewport.
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 600], [0, -80]);
  const heroFade = useTransform(scrollY, [0, 400], [1, 0.65]);

  // Page-load reveal — kick once on mount.
  const [hasRevealed, setHasRevealed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setHasRevealed(true), 80);
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
      description: `We'll write when ${tool.name} ships.`,
    });
    setOpenTool(null);
  };

  return (
    <div
      className="relative min-h-screen"
      style={{
        // Letterboxed editorial canvas — pulled tighter than the rest of the
        // app so Studio reads as a "magazine spread" inside the chrome.
        ['--studio-gutter' as string]: 'clamp(1rem, 4vw, 3rem)',
      }}
    >
      {/* Film grain overlay — barely visible but breaks up the dark canvas. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: `url("${FILM_GRAIN_SVG}")`, backgroundSize: '240px 240px' }}
      />

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  HERO — editorial title-card                                 ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <section className="relative pt-2 lg:pt-6 pb-10 lg:pb-14" style={{ paddingLeft: 'var(--studio-gutter)', paddingRight: 'var(--studio-gutter)' }}>
        {/* Eyebrow strip — STUDIO · ADVISER TOOLS · live count */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="flex items-center gap-3 text-[10.5px] mb-9 lg:mb-12"
          style={{ fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.18em' }}
        >
          <span className="text-white/45 uppercase">RealSight</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span className="text-[#18D6A4] uppercase font-medium">Studio</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span className="text-white/45 uppercase">Adviser Tools</span>
          <span className="flex-1 h-px bg-white/10 ml-2" />
          <span className="text-white/55 tabular-nums">
            {String(counts.live).padStart(2, '0')} LIVE · {String(counts.coming).padStart(2, '0')} IN PRODUCTION
          </span>
        </motion.div>

        {/* The display headline — Fraunces, oversized, with clip-mask reveal. */}
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: '110%' }}
            animate={hasRevealed ? { y: '0%' } : {}}
            transition={{ duration: 0.95, ease: EASE_OUT, delay: 0.15 }}
            className="font-editorial leading-[0.92] tracking-[-0.025em] text-white"
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontWeight: 360,
              fontSize: 'clamp(2.4rem, 7.6vw, 6.5rem)',
              fontVariationSettings: '"opsz" 144, "SOFT" 35, "WONK" 0',
            }}
          >
            Tools that build
          </motion.h1>
        </div>
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: '110%' }}
            animate={hasRevealed ? { y: '0%' } : {}}
            transition={{ duration: 0.95, ease: EASE_OUT, delay: 0.28 }}
            className="font-editorial leading-[0.92] tracking-[-0.025em]"
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontWeight: 360,
              fontSize: 'clamp(2.4rem, 7.6vw, 6.5rem)',
              fontVariationSettings: '"opsz" 144, "SOFT" 35, "WONK" 1',
            }}
          >
            <span
              className="bg-clip-text text-transparent italic"
              style={{
                backgroundImage: 'linear-gradient(92deg, #C9A84C 0%, #18D6A4 60%, #7BFFD6 100%)',
                fontWeight: 320,
              }}
            >
              your business.
            </span>
          </motion.h1>
        </div>

        {/* Hairline rule + subhead */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={hasRevealed ? { scaleX: 1 } : {}}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.55 }}
          className="origin-left h-px bg-white/15 mt-9 lg:mt-12 mb-5 lg:mb-7"
        />
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={hasRevealed ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.7 }}
          className="text-white/60 text-[15px] lg:text-base leading-[1.55] max-w-[36rem]"
        >
          A working set of cinematic deliverables — branded presentations, social packs, video pitches and AI matchmaking. New tool curated and shipped every month.
        </motion.p>
      </section>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  EDITORIAL GRID — asymmetric tool cards                      ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <section
        className="relative pb-16 lg:pb-24"
        style={{ paddingLeft: 'var(--studio-gutter)', paddingRight: 'var(--studio-gutter)' }}
      >
        {/* Section eyebrow — "THE COLLECTION · 2026" */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={hasRevealed ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.85 }}
          className="flex items-end justify-between gap-4 mb-6 lg:mb-8"
        >
          <div className="flex items-baseline gap-3">
            <span
              className="text-[10.5px] text-white/45 uppercase tracking-[0.22em]"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              The Collection
            </span>
            <span className="w-7 h-px bg-white/15" />
            <span
              className="text-[10.5px] text-white/45 uppercase tracking-[0.22em] tabular-nums"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {STUDIO_TOOLS.length.toString().padStart(2, '0')} pieces
            </span>
          </div>
          <span
            className="text-[10.5px] text-white/35 uppercase tracking-[0.2em] hidden sm:inline"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            Hover to preview · Click to enter
          </span>
        </motion.div>

        <div
          className="grid gap-3 sm:gap-4 lg:gap-5"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
            gridAutoFlow: 'dense',
          }}
        >
          {STUDIO_TOOLS.map((tool, i) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              index={i}
              hasRevealed={hasRevealed}
              notified={!!notified[tool.slug]}
              onClick={() => handleCardClick(tool)}
              heroParallax={heroParallax}
              heroFade={heroFade}
            />
          ))}
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════════════╗
          ║  EDITORIAL FOOTER                                            ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <section
        className="relative pb-20"
        style={{ paddingLeft: 'var(--studio-gutter)', paddingRight: 'var(--studio-gutter)' }}
      >
        <div className="h-px bg-white/10 mb-7" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p
            className="text-[10.5px] text-white/35 uppercase tracking-[0.22em]"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            Studio · RealSight Adviser Tools · Edition 2026
          </p>
          <a
            href="mailto:concierge@realsight.com?subject=Studio%20tool%20idea"
            className="group inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white transition-colors"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            <span className="uppercase tracking-[0.16em]">Submit a tool idea</span>
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      {/* ── Notify-me modal ──────────────────────────────────────────── */}
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

      {/* Background reveal — first ~1.2s, a thin mint line draws across.
          Performs the cinema "title sweep" that anchors the rest of the
          choreography. Disappears after the page settles. */}
      <AnimatePresence>
        {!hasRevealed && (
          <motion.div
            key="reveal-curtain"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-[2] pointer-events-none"
          >
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: EASE_OUT }}
              className="origin-left h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(24,214,164,0.7) 50%, transparent)',
                boxShadow: '0 0 30px rgba(24,214,164,0.6)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// ToolCard — editorial atelier card
// ──────────────────────────────────────────────────────────────────────

interface ToolCardProps {
  tool: StudioTool;
  index: number;
  hasRevealed: boolean;
  notified: boolean;
  onClick: () => void;
  // Accept the parallax MotionValues so we could later wire one card into
  // the scroll choreography if we want a "featured" piece. v1 ignores them.
  heroParallax: ReturnType<typeof useTransform>;
  heroFade: ReturnType<typeof useTransform>;
}

function ToolCard({ tool, index, hasRevealed, notified, onClick }: ToolCardProps) {
  const Icon = tool.icon;
  const palette = TONE_PALETTE[tool.tone];
  const isLive = tool.status === 'live' || tool.status === 'beta';
  const isWide = tool.span === 'wide';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 38 }}
      animate={hasRevealed ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.85,
        ease: EASE_OVERSHOOT,
        // Cards stagger from top-left; live first, then by index.
        delay: 0.95 + index * 0.07,
      }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative flex flex-col text-left overflow-hidden rounded-[14px]',
        'border border-white/[0.07] hover:border-white/[0.15] transition-colors duration-500',
        'bg-[#0B1322]',
        // Wide cards span 2 columns on lg+ (auto-fit grid above is the
        // base; the explicit span class is a hint browsers honour when
        // they have room).
        isWide && 'lg:col-span-2',
      )}
      style={{
        // Hover ring drawn via box-shadow — subtle, tone-coloured.
        ['--card-ring' as string]: palette.ring,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.4)',
      }}
      aria-label={`${tool.name} — ${isLive ? 'open' : 'notify me when it ships'}`}
    >
      {/* Photo plate — top-aligned, cinematic ratio */}
      <div className={cn('relative w-full overflow-hidden', isWide ? 'aspect-[2.4/1]' : 'aspect-[1.65/1]')}>
        {tool.bgImage ? (
          <div
            className="absolute inset-0 transition-transform duration-[1400ms] ease-out group-hover:scale-[1.07]"
            style={{
              backgroundImage: `url(${tool.bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: tool.bgPosition ?? 'center',
              filter: 'brightness(0.62) saturate(1.05) contrast(1.08)',
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 70% 90% at 60% 30%, ${palette.accent}30 0%, transparent 65%), linear-gradient(160deg, #0B1322 0%, #08111E 100%)`,
            }}
          />
        )}
        {/* Tonal wash — gives every card a subtle accent tint without
            burning the photo. The gradient direction matches the
            overall page motion (top-left → bottom-right). */}
        <div
          className="absolute inset-0 mix-blend-overlay opacity-50 transition-opacity duration-700 group-hover:opacity-65"
          style={{
            background: `linear-gradient(140deg, ${palette.accent}55 0%, transparent 55%, ${palette.accent}22 100%)`,
          }}
        />
        {/* Bottom fade so chip + meta on the meta-strip below transition cleanly */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(11,19,34,0.95))' }}
        />

        {/* Status chip — top-right, tactical */}
        <div className="absolute top-3 right-3 z-10">
          <StatusChip tool={tool} palette={palette} />
        </div>

        {/* Number — bottom-left, oversized editorial numeral */}
        <div className="absolute bottom-2.5 left-3.5 z-10">
          <span
            className="text-white/85 leading-none tabular-nums"
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontVariationSettings: '"opsz" 144, "WONK" 1',
              fontWeight: 280,
              fontSize: isWide ? '3.4rem' : '2.6rem',
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
              textShadow: '0 4px 24px rgba(0,0,0,0.6)',
            }}
          >
            {tool.number}
          </span>
        </div>

        {/* Notified pill — top-left, only when adviser opted in */}
        {!isLive && notified && (
          <div className="absolute top-3 left-3 z-10">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur"
              style={{
                background: palette.chipBg,
                color: palette.chipFg,
                border: `1px solid ${palette.chipFg}33`,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              <Bell className="h-2.5 w-2.5" />
              ON THE LIST
            </span>
          </div>
        )}
      </div>

      {/* Meta strip — title + tagline + accent line + arrow */}
      <div className="relative px-4 sm:px-5 lg:px-6 pt-4 pb-5 flex flex-col gap-3 flex-1">
        {/* Tactical metadata — Tool, status pulse */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40"
             style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          <Icon className="h-3 w-3" style={{ color: palette.accent }} />
          <span>{tool.tone === 'mint' ? 'Generation' : 'Tool'}</span>
          <span className="w-3 h-px bg-white/15 ml-1" />
          <span className="tabular-nums">{tool.comingLabel ?? 'Available'}</span>
        </div>

        {/* Display title — Fraunces, smaller-display optical size */}
        <h3
          className="text-white leading-[1.05] tracking-[-0.015em]"
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontVariationSettings: '"opsz" 96, "SOFT" 30',
            fontWeight: 380,
            fontSize: isWide ? 'clamp(1.6rem, 2.8vw, 2.05rem)' : 'clamp(1.4rem, 2.2vw, 1.7rem)',
          }}
        >
          {tool.name}
        </h3>

        {/* Tagline — Inter, restrained */}
        <p className="text-[13.5px] text-white/55 leading-[1.5] max-w-md">
          {tool.tagline}
        </p>

        {/* CTA row — accent line that draws on hover + arrow */}
        <div className="mt-1 flex items-center gap-2 text-[11px] text-white/55 group-hover:text-white transition-colors duration-300"
             style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          <span className="uppercase tracking-[0.18em]">
            {isLive ? 'Open Tool' : 'Notify Me'}
          </span>
          <span
            aria-hidden
            className="flex-1 h-px origin-left scale-x-[0.18] group-hover:scale-x-100 transition-transform duration-700 ease-out"
            style={{ background: palette.accent }}
          />
          <ArrowUpRight
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            style={{ color: palette.accent }}
          />
        </div>
      </div>

      {/* Hover ring — subtle tone-coloured glow on the entire card */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[14px] pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1px var(--card-ring), 0 24px 60px -20px var(--card-ring)` }}
      />
    </motion.button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Status chip — tactical, monospaced, tone-aware
// ──────────────────────────────────────────────────────────────────────

interface StatusChipProps {
  tool: StudioTool;
  palette: { accent: string; chipBg: string; chipFg: string };
}

function StatusChip({ tool, palette }: StatusChipProps) {
  if (tool.status === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold backdrop-blur"
        style={{
          background: `${palette.accent}15`,
          color: palette.chipFg,
          border: `1px solid ${palette.accent}55`,
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: '0.18em',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: palette.accent, boxShadow: `0 0 12px ${palette.accent}` }}
        />
        LIVE
      </span>
    );
  }
  if (tool.status === 'beta') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold backdrop-blur"
        style={{
          background: 'rgba(245,180,51,0.15)',
          color: '#FFD685',
          border: '1px solid rgba(245,180,51,0.45)',
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: '0.18em',
        }}
      >
        BETA
      </span>
    );
  }
  // coming
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-medium backdrop-blur"
      style={{
        background: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.65)',
        border: '1px solid rgba(255,255,255,0.10)',
        fontFamily: '"JetBrains Mono", monospace',
        letterSpacing: '0.16em',
      }}
    >
      COMING · {(tool.comingLabel ?? '').toUpperCase()}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Notify-me modal contents — editorial-styled
// ──────────────────────────────────────────────────────────────────────

interface NotifyMeModalProps {
  tool: StudioTool;
  alreadyNotified: boolean;
  onConfirm: () => void;
}

function NotifyMeModal({ tool, alreadyNotified, onConfirm }: NotifyMeModalProps) {
  const palette = TONE_PALETTE[tool.tone];
  return (
    <>
      <DialogHeader>
        <div
          className="text-[10px] mb-3 inline-flex items-center gap-2 self-start uppercase tracking-[0.22em]"
          style={{ fontFamily: '"JetBrains Mono", monospace', color: palette.chipFg }}
        >
          <span className="tabular-nums">{tool.number}</span>
          <span className="w-3 h-px" style={{ background: palette.accent, opacity: 0.55 }} />
          <span>{tool.comingLabel}</span>
        </div>
        <DialogTitle
          className="leading-[1.05] tracking-[-0.015em] text-2xl"
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontVariationSettings: '"opsz" 96, "SOFT" 35',
            fontWeight: 360,
          }}
        >
          {tool.name}
        </DialogTitle>
        <DialogDescription className="text-[14px] leading-[1.55] pt-1.5">
          {tool.tagline}
        </DialogDescription>
      </DialogHeader>

      {alreadyNotified ? (
        <div
          className="flex items-center gap-2 text-[13px] rounded-xl px-3 py-2.5"
          style={{ background: palette.chipBg, color: palette.chipFg, border: `1px solid ${palette.accent}33` }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>You&rsquo;re on the list — we&rsquo;ll write when it ships.</span>
        </div>
      ) : (
        <Button
          size="lg"
          className="rounded-full font-semibold w-full"
          style={{
            background: `linear-gradient(92deg, ${palette.accent}, #18D6A4 70%)`,
            color: '#04130b',
          }}
          onClick={onConfirm}
        >
          <Bell className="h-4 w-4 mr-2" />
          Notify me when it ships
        </Button>
      )}
      <p
        className="text-[10px] uppercase tracking-[0.22em] text-white/35 mt-1"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        We email once · No marketing spam
      </p>
    </>
  );
}
