import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, PieChart, BarChart3, Map, Building2, Search, Bot,
  User, LogOut, Sparkles, ArrowRight, Shield,
  CreditCard, FolderOpen, Bell, Eye, Scale, Crown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';

/**
 * AppSidebar — primary navigation rail. ROLE + PLAN aware.
 *
 * 28 Apr 2026 redesign — second pass after founder feedback that I had
 * conflated investor and adviser navigation. Per LAUNCH_PLAN.md §3-5 and
 * REALSIGHT_MASTER_SPEC.md §4:
 *
 *   • INVESTORS see their personal ledger inline: Home, Portfolio, Deal
 *     Analyzer, New Launches, AI Concierge, plus Markets tools and a
 *     "Records" section (Payments, Documents, Updates).
 *
 *   • ADVISERS see the same Markets tools but their personal ledger is
 *     replaced by an Admin entry. They access their CLIENTS' ledgers from
 *     /admin/investors → click a client → see that client's Portfolio /
 *     Payments / Documents / Updates / AI Concierge as that client.
 *
 *   • DEFERRED features (Global Radar, the duplicate user-facing /top-picks,
 *     standalone Opportunity Signals) are NOT in the rail at launch. They
 *     remain reachable by URL for anyone holding bookmarks, but we don't
 *     promote them. See LAUNCH_PLAN.md §2-5.
 *
 *   • FREE PLAN items in the rail are free per the launch plan — no per-item
 *     lock badges in the sidebar itself. Plan-gating happens INSIDE
 *     individual features (e.g. live unit availability inside New Launches
 *     detail uses <UpsellBanner feature="unit-availability" />).
 *
 *   • Free investors get a permanent "Upgrade to Investor Pro" card pinned
 *     to the bottom of the rail. Investor Pro users get a "Become an
 *     adviser" tile (cross-tier upsell) only if they later choose. Adviser
 *     Pro / trial users see the Account + Sign Out without an upsell.
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
type SectionAccent = 'workspace' | 'markets' | 'records' | 'admin';
const ACCENTS: Record<SectionAccent, { text: string; dot: string }> = {
  workspace: { text: 'text-[#2effc0]/85', dot: 'bg-[#18d6a4]' }, // emerald — daily-use
  markets:   { text: 'text-[#7eb8ff]/85', dot: 'bg-[#4AA8FF]' }, // blue    — analytics
  records:   { text: 'text-[#cbd5e1]/85', dot: 'bg-[#94A3B8]' }, // slate   — your records
  admin:     { text: 'text-[#b6a4ff]/85', dot: 'bg-[#7B5CFF]' }, // violet  — back-office
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
  const { isAdmin } = useUserRole();
  const { plan } = useSubscription();

  const isFree         = plan === 'free';
  const isInvestorPro  = plan === 'investor_pro';
  const isAdviserPro   = plan === 'adviser_pro' || plan === 'adviser_trial';

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
      <div
        className="relative flex items-center h-[57px] px-4 border-b border-white/[0.06] shrink-0 overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)', height: 'calc(57px + env(safe-area-inset-top, 0))' }}
      >
        <Link to="/dashboard" className="flex items-center min-w-0">
          <Logo variant="white" className="h-6 w-auto shrink-0" />
        </Link>
      </div>

      {/* Navigation — ROLE-AWARE */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none">

        {isAdmin ? (
          /* ─────────────── ADVISER / ADMIN VIEW ───────────────
             Their personal investor ledger doesn't live here — they access
             their CLIENTS' ledgers from Admin → Investors. */
          <>
            <SectionLabel label="Workspace" accent="workspace" />
            <div className="space-y-0.5 px-1.5">
              <NavItem to="/dashboard"     icon={LayoutDashboard} label="Home" />
              <NavItem to="/deal-analyzer" icon={Search}          label="Deal Analyzer" />
              <NavItem to="/projects"      icon={Building2}       label="New Launches" />
            </div>

            <SectionLabel label="Markets" accent="markets" />
            <div className="space-y-0.5 px-1.5">
              <NavItem to="/market-intelligence" icon={BarChart3} label="Markets" />
              <NavItem to="/heatmap"             icon={Map}       label="Dubai Heatmap" />
              <NavItem to="/watchlist"           icon={Eye}       label="Watchlist" />
              <NavItem to="/compare"             icon={Scale}     label="Compare" />
            </div>

            <SectionLabel label="Admin" accent="admin" />
            <div className="space-y-0.5 px-1.5">
              <NavItem to="/admin" icon={Shield} label="Workspace" />
            </div>
          </>
        ) : (
          /* ─────────────── INVESTOR VIEW (free or Investor Pro) ───────────────
             Personal ledger lives in the rail: Portfolio + AI Concierge in
             Workspace, plus Records (Payments / Documents / Updates). */
          <>
            <SectionLabel label="Workspace" accent="workspace" />
            <div className="space-y-0.5 px-1.5">
              <NavItem to="/dashboard"     icon={LayoutDashboard} label="Home" />
              <NavItem to="/portfolio"     icon={PieChart}        label="Portfolio" />
              <NavItem to="/deal-analyzer" icon={Search}          label="Deal Analyzer" />
              <NavItem to="/projects"      icon={Building2}       label="New Launches" />
              <NavItem to="/concierge"     icon={Bot}             label="AI Concierge" />
            </div>

            <SectionLabel label="Markets" accent="markets" />
            <div className="space-y-0.5 px-1.5">
              <NavItem to="/market-intelligence" icon={BarChart3} label="Markets" />
              <NavItem to="/heatmap"             icon={Map}       label="Dubai Heatmap" />
              <NavItem to="/watchlist"           icon={Eye}       label="Watchlist" />
              <NavItem to="/compare"             icon={Scale}     label="Compare" />
            </div>

            <SectionLabel label="Records" accent="records" />
            <div className="space-y-0.5 px-1.5">
              <NavItem to="/payments"  icon={CreditCard} label="Payments" />
              <NavItem to="/documents" icon={FolderOpen} label="Documents" />
              <NavItem to="/updates"   icon={Bell}       label="Updates" />
            </div>
          </>
        )}
      </nav>

      {/* Bottom — plan-aware upsell + account + sign out
          • Free Investor    → "Upgrade to Investor Pro" card
          • Investor Pro     → "Become an adviser" cross-tier upsell
          • Adviser Pro/trial → just account + sign out (top tier, no upsell) */}
      <div className="relative border-t border-white/[0.06] pt-1.5 pb-2 space-y-0.5 px-1.5 shrink-0">
        {isFree && (
          <Link
            to="/billing"
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all duration-200 mb-1 group overflow-hidden"
            style={{
              background:
                'linear-gradient(90deg, rgba(24,214,164,0.22), rgba(24,214,164,0.06))',
              border: '1px solid rgba(24,214,164,0.35)',
            }}
          >
            <div className="w-7 h-7 rounded-lg bg-[#18d6a4] text-black flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-white leading-none">Upgrade to Pro</p>
              <p className="text-[9px] text-white/65 mt-0.5">$4/mo · 30-day trial</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-white/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        )}

        {isInvestorPro && !isAdmin && (
          <Link
            to="/billing"
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all duration-200 mb-1 group overflow-hidden"
            style={{
              background:
                'linear-gradient(90deg, rgba(123,92,255,0.22), rgba(123,92,255,0.06))',
              border: '1px solid rgba(123,92,255,0.35)',
            }}
          >
            <div className="w-7 h-7 rounded-lg bg-[#7B5CFF] text-white flex items-center justify-center shrink-0">
              <Crown className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-white leading-none">Are you an adviser?</p>
              <p className="text-[9px] text-white/65 mt-0.5">White-label · $99/mo</p>
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
