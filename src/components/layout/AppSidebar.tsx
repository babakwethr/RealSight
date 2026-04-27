import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, PieChart, BarChart3, Map, Building2, Search, Bot,
  User, LogOut, Sparkles, ArrowRight, Shield,
  CreditCard, FolderOpen, Bell, Eye, Scale, Star, Target, Globe,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';

/**
 * AppSidebar — primary navigation rail.
 *
 * 28 Apr 2026 redesign (founder UX feedback):
 *   • No more hover-to-expand / pin-to-stay state. Single fixed width
 *     (240 px) on desktop. The previous two-state interaction was annoying
 *     and easy to accidentally trigger.
 *   • Background harmonised to the same `#07040F` base used by `cinematic-bg`
 *     so the sidebar bleeds visually into the page instead of butting against
 *     it (the previous opaque blue gradient created a visible seam).
 *   • Reorganised into 3 short groups (Workspace · Markets · Admin) — total
 *     8 items for an admin (was 19), 7 for a regular user. The 8 admin
 *     sub-pages now live behind a single "Workspace" entry that opens an
 *     `/admin` overview page with its own secondary tab navigation. Same
 *     pattern as Stripe / Linear / Notion.
 *   • Mobile uses a separate <MobileDrawer />; this component is desktop-only
 *     (rendered inside `hidden lg:block` in AppLayout).
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
          ? 'text-white/25 cursor-not-allowed'
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
            ? 'bg-white/[0.03] text-white/25 border border-white/[0.04]'
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
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md border bg-amber-500/10 text-amber-300 border-amber-500/20 shrink-0">
          {requiredPlan}
        </span>
      )}
      {badge && !locked && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#18d6a4]/15 text-[#2effc0] border border-[#18d6a4]/25 shrink-0">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

// ─── Section label ───────────────────────────────────────────────────────────
type SectionAccent = 'workspace' | 'markets' | 'discover' | 'records' | 'admin';
const ACCENTS: Record<SectionAccent, { text: string; dot: string }> = {
  workspace: { text: 'text-[#2effc0]/85', dot: 'bg-[#18d6a4]' }, // emerald — daily-use
  markets:   { text: 'text-[#7eb8ff]/85', dot: 'bg-[#4AA8FF]' }, // blue    — analytics
  discover:  { text: 'text-[#FFD8A8]/85', dot: 'bg-[#F59E0B]' }, // amber   — find new
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

  return (
    <aside
      className="relative h-screen w-60 flex flex-col border-r border-white/[0.08] overflow-hidden"
      style={{
        // Frosted-glass sidebar (founder request, 28 Apr 2026 evening). The
        // background is intentionally MORE transparent than before so the
        // page's cinematic-bg gradients show through and tint the rail
        // subtly. The strong backdrop blur + saturate gives the macOS-style
        // "real frosted glass" depth.
        background:
          'linear-gradient(180deg, rgba(7,4,15,0.55) 0%, rgba(8,5,17,0.62) 50%, rgba(5,3,12,0.68) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        boxShadow:
          'inset -1px 0 0 rgba(255,255,255,0.04), 1px 0 24px -8px rgba(0,0,0,0.5)',
      }}
    >
      {/* Subtle inner highlight at the very top — reinforces the glass
          edge and gives the macOS / iOS feel. */}
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

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none">

        {/* WORKSPACE — daily-use items */}
        <SectionLabel label="Workspace" accent="workspace" />
        <div className="space-y-0.5 px-1.5">
          <NavItem to="/dashboard"     icon={LayoutDashboard} label="Home" />
          <NavItem to="/portfolio"     icon={PieChart}        label="Portfolio" />
          <NavItem to="/deal-analyzer" icon={Search}          label="Deal Analyzer" />
          <NavItem to="/projects"      icon={Building2}       label="New Launches" />
          <NavItem to="/concierge"     icon={Bot}             label="AI Concierge" />
        </div>

        {/* MARKETS — area + heatmap + watch + compare */}
        <SectionLabel label="Markets" accent="markets" />
        <div className="space-y-0.5 px-1.5">
          <NavItem to="/market-intelligence" icon={BarChart3} label="Markets" />
          <NavItem to="/heatmap"             icon={Map}       label="Dubai Heatmap" />
          <NavItem to="/watchlist"           icon={Eye}       label="Watchlist" />
          <NavItem to="/compare"             icon={Scale}     label="Compare" />
        </div>

        {/* DISCOVER — find new opportunities */}
        <SectionLabel label="Discover" accent="discover" />
        <div className="space-y-0.5 px-1.5">
          <NavItem to="/top-picks"            icon={Star}   label="Top Picks" />
          <NavItem to="/opportunity-signals"  icon={Target} label="Opportunity Signals" />
          <NavItem to="/radar"                icon={Globe}  label="Global Radar" />
        </div>

        {/* RECORDS — your own paper trail */}
        <SectionLabel label="Records" accent="records" />
        <div className="space-y-0.5 px-1.5">
          <NavItem to="/payments"  icon={CreditCard} label="Payments" />
          <NavItem to="/documents" icon={FolderOpen} label="Documents" />
          <NavItem to="/updates"   icon={Bell}       label="Updates" />
        </div>

        {/* ADMIN — single entry, opens /admin overview with its own tab nav */}
        {isAdmin && (
          <>
            <SectionLabel label="Admin" accent="admin" />
            <div className="space-y-0.5 px-1.5">
              <NavItem to="/admin" icon={Shield} label="Workspace" />
            </div>
          </>
        )}
      </nav>

      {/* Bottom — upgrade hint (free users) + account + sign out */}
      <div className="relative border-t border-white/[0.06] pt-1.5 pb-2 space-y-0.5 px-1.5 shrink-0">
        {!isAdmin && plan === 'free' && (
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
