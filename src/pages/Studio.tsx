import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bell, CheckCircle2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  STUDIO_TOOLS,
  studioToolCounts,
  type StudioTool,
  type StudioToolVariant,
} from '@/data/studioTools';

/**
 * Studio — adviser-only "tools that build your business" workspace.
 *
 * One card per tool. Live tools open via full-page take-over (per
 * founder direction 2 May 2026). Coming tools open a notify-me modal
 * and store the adviser's interest in localStorage so we can later
 * surface "you asked about this" prompts when the tool ships.
 *
 * Visual language reuses the cinematic gradient palette established
 * in `HeroMetricCard` so this page slots into the V3 design system
 * without introducing new tokens. Photo-realistic Higgsfield
 * backgrounds land in a follow-up once founder upgrades the plan.
 */

// ── Gradient palette — mirrors HeroMetricCard for visual consistency ──
const VARIANT_GRADIENT: Record<StudioToolVariant, string> = {
  mint:    'radial-gradient(ellipse 60% 80% at 80% 40%, rgba(16,227,176,0.45), transparent 60%), linear-gradient(115deg, #063F35 0%, #0AC291 48%, #10E3B0 100%)',
  blue:    'radial-gradient(ellipse 60% 80% at 80% 40%, rgba(123,92,255,0.45), transparent 60%), linear-gradient(105deg, #2A4BAE 0%, #3B6CE8 42%, #6F6AF6 100%)',
  cyan:    'linear-gradient(120deg, #08213D 0%, #1F5BA6 45%, #4AA8FF 100%)',
  purple:  'radial-gradient(ellipse 60% 80% at 20% 30%, rgba(74,168,255,0.38), transparent 55%), linear-gradient(135deg, #1A1640 0%, #3D2A8A 45%, #7B5CFF 100%)',
  amber:   'radial-gradient(ellipse 70% 80% at 70% 30%, rgba(245,180,51,0.35), transparent 60%), linear-gradient(120deg, #2A1E0D 0%, #8C6B1F 50%, #C9A84C 100%)',
  sunset:  'radial-gradient(ellipse 70% 80% at 70% 30%, rgba(245,180,51,0.30), transparent 60%), linear-gradient(135deg, #7C2D12 0%, #F97316 55%, #FDBA74 100%)',
  rose:    'linear-gradient(115deg, #FF5577 0%, #7B5CFF 55%, #4AA8FF 100%)',
  night:   'radial-gradient(ellipse 60% 80% at 80% 40%, rgba(123,92,255,0.35), transparent 60%), radial-gradient(ellipse 50% 60% at 20% 60%, rgba(16,227,176,0.18), transparent 60%), linear-gradient(135deg, #1A1640 0%, #0F1D33 100%)',
};

// ── localStorage key for notify-me state ──────────────────────────────
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
    // Quota errors are silent — the toast already confirmed intent.
  }
}

export default function Studio() {
  const navigate = useNavigate();
  const counts = useMemo(studioToolCounts, []);
  const [openTool, setOpenTool] = useState<StudioTool | null>(null);
  const [notified, setNotified] = useState<Record<string, number>>(loadNotifyMe);

  const handleCardClick = (tool: StudioTool) => {
    if (tool.status === 'live' || tool.status === 'beta') {
      if (tool.route) navigate(tool.route);
      return;
    }
    // Coming — open notify-me modal
    setOpenTool(tool);
  };

  const handleNotifyMe = (tool: StudioTool) => {
    const next = { ...notified, [tool.slug]: Date.now() };
    setNotified(next);
    saveNotifyMe(next);
    toast.success("Got it — we'll let you know.", {
      description: `We'll email you when ${tool.name} launches.`,
    });
    setOpenTool(null);
  };

  return (
    <div className="animate-fade-in">
      {/* ── Hero header ── */}
      <div
        className="relative rounded-3xl overflow-hidden mb-8 border border-white/[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(8,15,28,0.72) 0%, rgba(8,15,28,0.92) 100%), url(/pdf-bg/dubai-skyline.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        <div className="px-6 sm:px-8 lg:px-10 py-9 lg:py-12">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-[#2effc0]/90 mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Adviser Studio
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-[1.05]">
                Tools that{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)' }}
                >
                  build your business
                </span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                Generate branded presentations, social packs, video pitches and AI matchmaking — all from one place. New tool every month.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2effc0] animate-pulse" />
              <span className="text-[11px] font-semibold text-white/80">
                {counts.live} live · {counts.coming} coming
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card grid ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {STUDIO_TOOLS.map(tool => (
          <ToolCard
            key={tool.slug}
            tool={tool}
            notified={!!notified[tool.slug]}
            onClick={() => handleCardClick(tool)}
          />
        ))}
      </div>

      {/* ── Footer line ── */}
      <div className="mt-10 flex items-center justify-center">
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
            <>
              <DialogHeader>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{
                    background: 'radial-gradient(circle at 30% 20%, #2effc0 0%, #18d6a4 45%, #059669 100%)',
                    boxShadow: '0 12px 32px rgba(24,214,164,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
                  }}
                >
                  <openTool.icon className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-xl">
                  {openTool.name}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed pt-1">
                  {openTool.tagline}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 my-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1">
                  Status
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {openTool.comingLabel ?? 'Coming soon'}
                </p>
              </div>
              {notified[openTool.slug] ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400 rounded-xl bg-emerald-400/10 border border-emerald-400/20 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>You&rsquo;re on the list — we&rsquo;ll email you when it launches.</span>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="rounded-full font-bold w-full"
                  style={{
                    background: 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)',
                    color: '#04130b',
                  }}
                  onClick={() => handleNotifyMe(openTool)}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notify me when it launches
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// ToolCard — one card in the Studio grid
// ──────────────────────────────────────────────────────────────────────

interface ToolCardProps {
  tool: StudioTool;
  notified: boolean;
  onClick: () => void;
}

function ToolCard({ tool, notified, onClick }: ToolCardProps) {
  const Icon = tool.icon;
  const isLive = tool.status === 'live' || tool.status === 'beta';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative aspect-[1.35/1] w-full rounded-3xl overflow-hidden text-left',
        'border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300',
        'hover:shadow-[0_24px_60px_rgba(46,255,192,0.18)]',
      )}
      aria-label={`${tool.name} — ${tool.status === 'live' ? 'open' : 'notify me when it launches'}`}
    >
      {/* Gradient layer (or photo background once Higgsfield assets land) */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        style={{
          background: tool.bgImage
            ? `linear-gradient(180deg, rgba(8,15,28,0.25) 0%, rgba(8,15,28,0.85) 100%), url(${tool.bgImage})`
            : VARIANT_GRADIENT[tool.variant],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Bottom-fade overlay so the text is always readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, transparent 30%, rgba(8,15,28,0.55) 75%, rgba(8,15,28,0.88) 100%)',
        }}
      />

      {/* Decorative sparkle for live/beta cards */}
      {isLive && (
        <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-[#2effc0] animate-pulse shadow-[0_0_12px_rgba(46,255,192,0.8)]" />
      )}

      {/* Status chip */}
      <div className="absolute top-3 right-3 z-10">
        {tool.status === 'live' && (
          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400/90 text-emerald-950 rounded-full px-2.5 py-1 shadow-[0_4px_14px_rgba(46,255,192,0.4)]">
            Live
          </span>
        )}
        {tool.status === 'beta' && (
          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/90 text-amber-950 rounded-full px-2.5 py-1 shadow-[0_4px_14px_rgba(251,191,36,0.4)]">
            Beta
          </span>
        )}
        {tool.status === 'coming' && (
          <span className="text-[10px] font-black uppercase tracking-wider bg-white/[0.10] text-white/70 border border-white/[0.12] backdrop-blur rounded-full px-2.5 py-1 group-hover:bg-white/[0.16] transition-colors">
            {tool.comingLabel ?? 'Coming soon'}
          </span>
        )}
      </div>

      {/* Notified pill (when adviser already opted in for this tool) */}
      {!isLive && notified && (
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 rounded-full px-2 py-0.5">
            <Bell className="h-2.5 w-2.5" />
            On the list
          </span>
        </div>
      )}

      {/* Icon orb */}
      <div className="absolute top-1/2 left-5 sm:left-6 -translate-y-2/3 z-10">
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center backdrop-blur"
          style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
      </div>

      {/* Title + tagline */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 z-10">
        <h3 className="text-base sm:text-lg lg:text-[1.1rem] font-black text-white tracking-tight leading-tight mb-1">
          {tool.name}
        </h3>
        <p className="text-[12px] sm:text-[13px] text-white/75 leading-snug line-clamp-2">
          {tool.tagline}
        </p>
        <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold text-white/65 group-hover:text-white transition-colors">
          {isLive ? 'Open tool' : 'Notify me'}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}
