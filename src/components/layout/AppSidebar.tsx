import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PieChart, CreditCard, FolderOpen,
  BarChart3, Map, Building2, Search, Activity, Layers,
  Star, Target, Radar, Bot, Bookmark, Columns, Bell,
  User, LogOut, Shield, Users, Settings, Database,
  Sparkles, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';

// ─── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({
  to, icon: Icon, label, isExpanded, locked, requiredPlan, badge,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  isExpanded: boolean;
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
        action: { label: 'See Plans', onClick: () => navigate('/payments') },
      });
    }
  };

  const inner = (
    <NavLink
      to={locked ? '#' : to}
      onClick={handleClick}
      className={cn(
        'flex items-center rounded-2xl transition-all duration-150 group/nav relative select-none',
        isExpanded ? 'gap-3 px-3 py-2 mx-1' : 'justify-center py-2 mx-1',
        locked
          ? 'text-white/25 cursor-not-allowed'
          : isActive
            ? 'bg-white/[0.06] text-white'
            : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
      )}
    >
      {isActive && !locked && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[#18d6a4]" />
      )}
      <span
        className={cn(
          'shrink-0 flex items-center justify-center rounded-xl transition-colors',
          isExpanded ? 'w-8 h-8' : 'w-8 h-8',
          locked
            ? 'bg-white/[0.03] text-white/25 border border-white/[0.04]'
            : isActive
              ? 'bg-[#18d6a4]/15 text-[#2effc0] border border-[#18d6a4]/30'
              : 'bg-white/[0.05] text-white/70 border border-white/[0.07] group-hover/nav:text-white',
        )}
      >
        <Icon className="h-[17px] w-[17px]" />
      </span>
      {isExpanded && (
        <span className={cn('text-sm flex-1 truncate', isActive && !locked ? 'font-semibold' : 'font-medium')}>
          {label}
        </span>
      )}
      {isExpanded && locked && requiredPlan && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md border bg-amber-500/10 text-amber-300 border-amber-500/20 shrink-0">
          {requiredPlan.replace('Portfolio ', 'PRO').replace('Adviser', 'ADV')}
        </span>
      )}
      {isExpanded && badge && !locked && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#18d6a4]/15 text-[#2effc0] border border-[#18d6a4]/25 shrink-0">
          {badge}
        </span>
      )}
    </NavLink>
  );

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-sm flex items-center gap-2">
          {label}
          {locked && requiredPlan && <span className="text-xs text-muted-foreground">· {requiredPlan}</span>}
        </TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

// ─── Section label ───────────────────────────────────────────────────────────
function SectionLabel({ label, isExpanded }: { label: string; isExpanded: boolean }) {
  if (!isExpanded) return <div className="my-2 mx-4 h-px bg-white/[0.06]" />;
  return (
    <p className="px-4 pt-4 pb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/35 select-none">
      {label}
    </p>
  );
}

// ─── Main sidebar ──────────────────────────────────────────────────────────────
export function AppSidebar() {
  const { signOut, user: _user } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan } = useSubscription();

  const [isPinned, setIsPinned] = useState(() => {
    try { return localStorage.getItem('rs-sidebar-pinned') === 'true'; } catch { return false; }
  });
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered;

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    try { localStorage.setItem('rs-sidebar-pinned', String(next)); } catch {}
  };

  return (
    <aside
      className={cn(
        'relative h-screen flex flex-col border-r border-white/[0.06] overflow-hidden',
        'transition-[width] duration-200 ease-in-out',
        isExpanded ? 'w-60' : 'w-[68px]',
      )}
      style={{
        background:
          'linear-gradient(180deg, rgba(14,20,55,0.96) 0%, rgba(10,15,46,0.96) 50%, rgba(5,7,22,0.98) 100%)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient glow */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-16 w-[18rem] h-[18rem] rounded-full bg-[#2d5cff]/20 blur-[80px]" />
        <div className="absolute -bottom-24 -right-10 w-[16rem] h-[16rem] rounded-full bg-[#18d6a4]/12 blur-[80px]" />
      </div>

      {/* Logo */}
      <div
        className={cn(
          'relative flex items-center h-[57px] border-b border-white/[0.06] shrink-0 overflow-hidden',
          isExpanded ? 'px-4 gap-2' : 'justify-center',
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0)', height: 'calc(57px + env(safe-area-inset-top, 0))' }}
      >
        <Link to="/dashboard" className="flex items-center min-w-0">
          {isExpanded
            ? <Logo variant="white" className="h-6 w-auto shrink-0" />
            : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 20%, #2effc0 0%, #18d6a4 45%, #059669 100%)',
                  boxShadow: '0 6px 18px rgba(24,214,164,0.35)',
                }}
              >
                <span className="text-white font-black text-[11px] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                  RS
                </span>
              </div>
            )
          }
        </Link>
        {isExpanded && (
          <button
            onClick={togglePin}
            title={isPinned ? 'Unpin' : 'Pin open'}
            className={cn(
              'ml-auto p-1.5 rounded-lg transition-colors shrink-0',
              isPinned
                ? 'text-[#2effc0] bg-[#18d6a4]/10'
                : 'text-white/30 hover:text-white/70 hover:bg-white/[0.05]',
            )}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0 scrollbar-none">
        {/* Primary */}
        <div className="space-y-0.5 px-1.5">
          <NavItem to="/dashboard"          icon={LayoutDashboard} label="Home"          isExpanded={isExpanded} />
          <NavItem to="/market-intelligence" icon={BarChart3}       label="Markets"       isExpanded={isExpanded} />
          <NavItem to="/deal-analyzer"       icon={Search}          label="Deal Analyzer" isExpanded={isExpanded} />
          <NavItem to="/projects"            icon={Building2}       label="New Launches"  isExpanded={isExpanded} />
          <NavItem to="/concierge"           icon={Bot}             label="AI Concierge"  isExpanded={isExpanded} />
        </div>

        <SectionLabel label="My Platform" isExpanded={isExpanded} />

        <div className="space-y-0.5 px-1.5">
          <NavItem to="/portfolio"  icon={PieChart}    label="Portfolio"  isExpanded={isExpanded} />
          <NavItem to="/payments"   icon={CreditCard}  label="Payments"   isExpanded={isExpanded} />
          <NavItem to="/documents"  icon={FolderOpen}  label="Documents"  isExpanded={isExpanded} />
          <NavItem to="/watchlist"  icon={Bookmark}    label="Watchlist"  isExpanded={isExpanded}
            locked={!hasFeature('watchlist') && !isAdmin} requiredPlan="Portfolio Pro" />
          <NavItem to="/compare"    icon={Columns}     label="Compare"    isExpanded={isExpanded}
            locked={!hasFeature('compare') && !isAdmin} requiredPlan="Portfolio Pro" />
        </div>

        <SectionLabel label="Intelligence" isExpanded={isExpanded} />

        <div className="space-y-0.5 px-1.5">
          <NavItem to="/heatmap"             icon={Map}      label="Dubai Heatmap"       isExpanded={isExpanded}
            locked={!hasFeature('heatmap') && !isAdmin} requiredPlan="Portfolio Pro" />
          <NavItem to="/market-pulse"        icon={Activity} label="Market Pulse"        isExpanded={isExpanded}
            locked={!hasFeature('market-intelligence') && !isAdmin} requiredPlan="Portfolio Pro" />
          <NavItem to="/market-index"        icon={Layers}   label="Market Index"        isExpanded={isExpanded}
            locked={!hasFeature('market-index') && !isAdmin} requiredPlan="Portfolio Pro" />
          <NavItem to="/top-picks"           icon={Star}     label="Top Picks"           isExpanded={isExpanded}
            locked={!hasFeature('top-picks') && !isAdmin} requiredPlan="Adviser" />
          <NavItem to="/opportunity-signals" icon={Target}   label="Opportunity Signals" isExpanded={isExpanded}
            locked={!hasFeature('opportunity-signals') && !isAdmin} requiredPlan="Adviser" />
          <NavItem to="/radar"               icon={Radar}    label="Global Radar"        isExpanded={isExpanded}
            locked={!hasFeature('global-radar') && !isAdmin} requiredPlan="Adviser" />
          <NavItem to="/updates"             icon={Bell}     label="Updates"             isExpanded={isExpanded} />
        </div>

        {/* Admin section — only visible to admins */}
        {isAdmin && (
          <>
            <SectionLabel label="Admin" isExpanded={isExpanded} />
            <div className="space-y-0.5 px-1.5">
              <NavItem to="/admin/investors"     icon={Users}    label="Investors"     isExpanded={isExpanded} />
              <NavItem to="/admin/users"         icon={Shield}   label="Users"         isExpanded={isExpanded} />
              <NavItem to="/admin/projects"      icon={Building2} label="Projects"     isExpanded={isExpanded} />
              <NavItem to="/admin/dld-analytics" icon={Database} label="DLD Analytics" isExpanded={isExpanded} />
              <NavItem to="/admin/settings"      icon={Settings} label="Settings"      isExpanded={isExpanded} />
            </div>
          </>
        )}
      </nav>

      {/* Bottom — account + upgrade hint */}
      <div className="relative border-t border-white/[0.06] pt-2 pb-3 space-y-0.5 px-1.5 shrink-0">
        {!isAdmin && plan === 'free' && (
          isExpanded ? (
            <Link
              to="/billing"
              className="flex items-center gap-2.5 px-3 py-3 mx-0 rounded-2xl transition-all duration-200 mb-1 group overflow-hidden"
              style={{
                background:
                  'linear-gradient(90deg, rgba(24,214,164,0.22), rgba(24,214,164,0.06))',
                border: '1px solid rgba(24,214,164,0.35)',
              }}
            >
              <div className="w-8 h-8 rounded-xl bg-[#18d6a4] text-black flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-white leading-none">Upgrade to Pro</p>
                <p className="text-[10px] text-white/65 mt-1">$29/mo · 30-day free trial</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-white/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/billing"
                  className="flex items-center justify-center w-full py-2.5 rounded-2xl transition-colors mb-1"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(24,214,164,0.22), rgba(24,214,164,0.08))',
                    border: '1px solid rgba(24,214,164,0.35)',
                  }}
                >
                  <Sparkles className="h-4 w-4 text-[#2effc0]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-sm">
                Upgrade to Pro — $29/mo
              </TooltipContent>
            </Tooltip>
          )
        )}
        <NavItem to="/account" icon={User} label="My Account" isExpanded={isExpanded} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={signOut}
              className={cn(
                'w-full flex items-center rounded-2xl transition-all duration-150',
                'text-white/45 hover:bg-red-500/10 hover:text-red-300',
                isExpanded ? 'gap-3 px-3 py-2 mx-1' : 'justify-center py-2 mx-1',
              )}
            >
              <span
                className={cn(
                  'shrink-0 flex items-center justify-center rounded-xl w-8 h-8 transition-colors',
                  'bg-white/[0.04] border border-white/[0.06]',
                )}
              >
                <LogOut className="h-[17px] w-[17px]" />
              </span>
              {isExpanded && <span className="text-sm font-medium">Sign Out</span>}
            </button>
          </TooltipTrigger>
          {!isExpanded && <TooltipContent side="right" className="text-sm">Sign Out</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
