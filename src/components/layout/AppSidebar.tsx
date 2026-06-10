import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { User, LogOut, Sparkles, ArrowRight, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePersona } from '@/hooks/usePersona';
import { useSubscription, PLAN_LABELS } from '@/hooks/useSubscription';
import { getUpsellTarget } from '@/lib/upsell';
import { NAV_CONFIG } from '@/config/navConfig';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';

/**
 * AppSidebar — primary navigation rail. ROLE + PLAN aware.
 *
 * 28 Apr 2026 redesign — third pass after founder clarification:
 *
 *   The investor's mental model is "my investments are one thing, market
 *   research is another thing." So we group accordingly:
 *
 *   INVESTOR VIEW (free or Investor Pro):
 *     ── MY INVESTMENTS ── (everything tied to THEIR portfolio)
 *       Portfolio · Payments · Documents · Updates · AI Concierge
 *     ── MARKETS ── (research / discovery tools that aren't personal)
 *       Home · UK Market · US Market · Off-Plan · Market Intelligence · UAE Heatmap · Deal Analyzer · New Launches
 *       · Watchlist · Compare
 *
 *   ADVISER VIEW (Adviser Pro / trial / admin):
 *     ── WORKSPACE ── Home · Deal Analyzer · New Launches
 *     ── MARKETS ──   Markets · UK Market · US Market · UAE Heatmap · Off-Plan · Watchlist
 *     ── ADMIN ──     Workspace  (-> /admin shell with secondary tabs)
 *
 *   The adviser doesn't get "My Investments" inline — they access a
 *   client's portfolio + payments + documents + updates + AI concierge
 *   from /admin/investors → click client → drill in.
 *
 *   DEFERRED at launch (still reachable by URL): Global Radar, the
 *   duplicate user-facing /top-picks, standalone Opportunity Signals
 *   (per LAUNCH_PLAN.md §2-5).
 *
 *   PLAN GATING: every nav item in the rail is FREE per the launch plan;
 *   gating happens INSIDE specific features (live unit availability,
 *   white-label, etc.) via <UpsellBanner>. Bottom-of-rail upsell card:
 *   Free → "Upgrade to Investor Pro $4/mo"; Investor Pro → "Are you an
 *   adviser? $99/mo white-label"; Adviser Pro / trial → no upsell card.
 */

// ─── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({
  to, icon: Icon, label, locked, requiredPlan, badge,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  locked?: boolean;
  requiredPlan?: string;
  badge?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  const handleClick = (e: React.MouseEvent) => {
    if (locked) {
      e.preventDefault();
      toast.info(`Upgrade to ${requiredPlan || 'a paid plan'} to unlock ${label}`, {
        action: { label: 'See Plans', onClick: () => navigate('/billing') },
      });
    }
  };

  return (
    <NavLink
      to={locked ? '#' : to}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-1.5 mx-1 rounded-xl transition-all duration-150 relative select-none group/nav',
        locked
          ? 'text-white/30 cursor-pointer hover:bg-white/[0.03]'
          : isActive
            ? 'bg-white/[0.07] text-white'
            : 'text-white/60 hover:bg-white/[0.04] hover:text-white',
      )}
    >
      {isActive && !locked && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#18d6a4]" />
      )}
      <span
        className={cn(
          'shrink-0 flex items-center justify-center rounded-lg w-7 h-7 transition-colors',
          locked
            ? 'bg-white/[0.03] text-white/30 border border-white/[0.05]'
            : isActive
              ? 'bg-[#18d6a4]/15 text-[#2effc0] border border-[#18d6a4]/30'
              : 'bg-white/[0.05] text-white/70 border border-white/[0.07] group-hover/nav:text-white',
        )}
      >
        <Icon className="h-[15px] w-[15px]" />
      </span>
      <span className={cn('text-sm flex-1 truncate', isActive && !locked ? 'font-semibold' : 'font-medium')}>
        {label}
      </span>
      {locked && requiredPlan && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md border bg-amber-500/10 text-amber-300 border-amber-500/25 shrink-0 uppercase tracking-wider">
          {requiredPlan}
        </span>
      )}
      {badge && !locked && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#18d6a4]/15 text-[#2effc0] border border-[#18d6a4]/25 shrink-0 uppercase tracking-wider">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

// ─── Section label ───────────────────────────────────────────────────────────
type SectionAccent = 'investments' | 'workspace' | 'markets' | 'admin';
const ACCENTS: Record<SectionAccent, { text: string; dot: string }> = {
  investments: { text: 'text-[#2effc0]/85', dot: 'bg-[#18d6a4]' }, // emerald — investor's personal world
  workspace:   { text: 'text-[#2effc0]/85', dot: 'bg-[#18d6a4]' }, // emerald — adviser's daily-use
  markets:     { text: 'text-[#7eb8ff]/85', dot: 'bg-[#4AA8FF]' }, // blue    — research
  admin:       { text: 'text-[#b6a4ff]/85', dot: 'bg-[#7B5CFF]' }, // violet  — back-office
};

function SectionLabel({ label, accent }: { label: string; accent: SectionAccent }) {
  const c = ACCENTS[accent];
  return (
    <div className="px-3 pt-4 pb-1.5 flex items-center gap-1.5 select-none">
      <span className={cn('inline-block h-1 w-1 rounded-full', c.dot)} />
      <p className={cn('text-[10px] font-black uppercase tracking-[0.2em]', c.text)}>
        {label}
      </p>
    </div>
  );
}

// ─── Main sidebar ──────────────────────────────────────────────────────────────
export function AppSidebar() {
  const { signOut } = useAuth();
  const { isAdviserNav, isLoading: personaLoading } = usePersona();
  const { plan, loading: planLoading } = useSubscription();

  // Menu comes from the SINGLE shared config (navConfig) — the mobile
  // drawer renders the exact same list, so the two can never drift apart.
  const sections = NAV_CONFIG[isAdviserNav ? 'adviser' : 'investor'];

  // If we render BEFORE persona resolves, the investor menu flashes briefly
  // for advisers on every page load. Show a skeleton until we know who they are.
  const navReady = !personaLoading;

  // Single plan-aware upsell — same helper used by AppLayout, MarketHome,
  // Account, etc. so every surface offers the same next-tier plan.
  const upsell = getUpsellTarget(plan, isAdviserNav);

  return (
    <aside
      className="relative h-screen w-60 flex flex-col border-r border-white/[0.08] overflow-hidden"
      style={{
        // Frosted-glass — translucent base + strong backdrop blur. The page's
        // cinematic-bg gradients tint the rail subtly through the glass.
        background:
          'linear-gradient(180deg, rgba(7,4,15,0.55) 0%, rgba(8,5,17,0.62) 50%, rgba(5,3,12,0.68) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        boxShadow:
          'inset -1px 0 0 rgba(255,255,255,0.04), 1px 0 24px -8px rgba(0,0,0,0.5)',
      }}
    >
      {/* Subtle inner highlight at the very top edge */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.10) 70%, transparent 100%)',
        }}
      />

      {/* Logo */}
      <div className="relative flex items-center h-[57px] px-4 border-b border-white/[0.06] shrink-0 overflow-hidden">
        <Link to="/dashboard" className="flex items-center min-w-0">
          <Logo variant="white" className="h-6 w-auto shrink-0" />
        </Link>
      </div>

      {/* Navigation — ROLE-AWARE */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none">

        {!navReady ? (
          /* Loading state — neutral skeleton stops the investor menu
             from flashing for admin users on hard refresh. */
          <div className="px-3 pt-4 space-y-3 animate-pulse">
            <div className="h-2.5 w-16 rounded bg-white/[0.08]" />
            <div className="space-y-2">
              <div className="h-9 rounded-xl bg-white/[0.04]" />
              <div className="h-9 rounded-xl bg-white/[0.04]" />
              <div className="h-9 rounded-xl bg-white/[0.04]" />
              <div className="h-9 rounded-xl bg-white/[0.04]" />
            </div>
            <div className="h-2.5 w-20 rounded bg-white/[0.08] mt-6" />
            <div className="space-y-2">
              <div className="h-9 rounded-xl bg-white/[0.04]" />
              <div className="h-9 rounded-xl bg-white/[0.04]" />
              <div className="h-9 rounded-xl bg-white/[0.04]" />
            </div>
          </div>
        ) : (
          /* Role-aware menu, rendered from the single shared NAV_CONFIG so
             the desktop rail and the mobile drawer always match. */
          sections.map((section) => (
            <div key={section.id}>
              <SectionLabel label={section.label} accent={section.accent} />
              <div className="space-y-0.5 px-1.5">
                {section.items.map((item) => (
                  <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
                ))}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Bottom — plan-aware upsell + account + sign out.
          The upsell variant comes from `getUpsellTarget()` so every surface
          across the app stays in sync. Top-tier users see no upsell. */}
      <div className="relative border-t border-white/[0.06] pt-1.5 pb-2 space-y-0.5 px-1.5 shrink-0">
        {/* Current plan — so the user always knows which package they're on.
            (Every menu item itself is free; paid capabilities are gated inside
            specific features, not in the nav.) */}
        {navReady && !planLoading && plan && (
          <div className="flex items-center justify-between px-2.5 py-1 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">Your plan</span>
            <span
              className="text-[11px] font-black"
              style={{
                color: plan === 'free'
                  ? 'rgba(255,255,255,0.65)'
                  : plan === 'investor_pro'
                    ? '#2effc0'
                    : '#FFB020',
              }}
            >
              {PLAN_LABELS[plan]}
            </span>
          </div>
        )}
        {/* Hide the upsell until both role + plan are known, otherwise
            the wrong-tier offer flashes for a frame on each page load. */}
        {navReady && !planLoading && upsell && (
          <Link
            to="/billing"
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all duration-200 mb-1 group overflow-hidden"
            style={{
              background:
                upsell.targetPlan === 'adviser_pro'
                  ? 'linear-gradient(90deg, rgba(255,176,32,0.24), rgba(255,176,32,0.06))'
                  : 'linear-gradient(90deg, rgba(24,214,164,0.22), rgba(24,214,164,0.06))',
              border: `1px solid ${upsell.accent}55`,
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: upsell.accent,
                // Amber & mint both need dark text for AA contrast.
                color: '#0a0814',
              }}
            >
              {upsell.targetPlan === 'adviser_pro'
                ? <Crown className="h-3.5 w-3.5" />
                : <Sparkles className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-black text-white leading-none">
                  {upsell.headline.replace('Upgrade to ', '')}
                </p>
                {upsell.promoActive && (
                  <span
                    className="text-[8px] font-black px-1 py-0.5 rounded leading-none uppercase tracking-wider"
                    style={{
                      background: `${upsell.accent}30`,
                      color: upsell.accent,
                      border: `1px solid ${upsell.accent}60`,
                    }}
                  >
                    -{upsell.discountPct}%
                  </span>
                )}
              </div>
              <p className="text-[9px] text-white/65 mt-0.5">
                {upsell.promoActive && (
                  <span className="text-white/40 line-through mr-1">{upsell.regularPrice}</span>
                )}
                {upsell.price}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-white/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        )}

        <NavItem to="/account" icon={User} label="My Account" />
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 mx-1 rounded-xl transition-all duration-150 text-white/50 hover:bg-red-500/10 hover:text-red-300"
        >
          <span className="shrink-0 flex items-center justify-center rounded-lg w-7 h-7 bg-white/[0.04] border border-white/[0.06]">
            <LogOut className="h-[15px] w-[15px]" />
          </span>
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
