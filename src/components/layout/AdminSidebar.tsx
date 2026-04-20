/**
 * AdminSidebar — matches the main AppSidebar design system
 * (see DESIGN.md §4 Navigation Sidebar). Sticky, icon-rail collapsed,
 * expand-on-hover with pin. Same glass treatment.
 */
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Users, Shield, Star, Settings, Activity, Layers,
  Package, Building2, LogOut, ArrowLeft, LayoutDashboard,
  Database, Bell,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

// ─── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({
  to, icon: Icon, label, isExpanded,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  isExpanded: boolean;
}) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  const inner = (
    <NavLink to={to}
      className={cn(
        'flex items-center rounded-xl transition-all duration-150 group/nav relative',
        isExpanded ? 'gap-3 px-3 py-2.5 mx-1' : 'justify-center py-2.5 mx-1',
        isActive
          ? 'bg-primary/[0.12] text-foreground'
          : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
      )}>
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />}
      <Icon className={cn(
        'h-[18px] w-[18px] shrink-0 transition-colors',
        isActive ? 'text-primary' : 'group-hover/nav:text-primary',
      )} />
      {isExpanded && (
        <span className={cn('text-sm flex-1 truncate', isActive ? 'font-semibold text-foreground' : 'font-medium')}>
          {label}
        </span>
      )}
    </NavLink>
  );

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-sm">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ label, isExpanded }: { label: string; isExpanded: boolean }) {
  if (!isExpanded) return <div className="my-2 mx-3 h-px bg-white/[0.06]" />;
  return (
    <p className="px-4 pt-5 pb-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/35 select-none">
      {label}
    </p>
  );
}

// ─── Main admin sidebar ────────────────────────────────────────────────────────
export function AdminSidebar() {
  const { signOut } = useAuth();

  const [isPinned, setIsPinned] = useState(() => {
    try { return localStorage.getItem('rs-admin-sidebar-pinned') === 'true'; } catch { return false; }
  });
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered;

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    try { localStorage.setItem('rs-admin-sidebar-pinned', String(next)); } catch {}
  };

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-[#0A0F1A] border-r border-white/[0.05]',
        'transition-[width] duration-200 ease-in-out',
        isExpanded ? 'w-56' : 'w-[60px]',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo + admin badge */}
      <div className={cn(
        'flex items-center h-[57px] border-b border-white/[0.05] shrink-0 overflow-hidden',
        isExpanded ? 'px-4 gap-2' : 'justify-center',
      )}>
        <Link to="/admin/investors" className="flex items-center min-w-0">
          <Logo variant="white" className={cn('w-auto transition-all duration-200 shrink-0', isExpanded ? 'h-6' : 'h-5')} />
        </Link>
        {isExpanded && (
          <>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 ml-auto shrink-0">
              ADMIN
            </span>
            <button onClick={togglePin} title={isPinned ? 'Unpin' : 'Pin open'}
              className={cn('p-1.5 rounded-lg transition-colors shrink-0',
                isPinned ? 'text-primary bg-primary/10' : 'text-muted-foreground/30 hover:text-muted-foreground hover:bg-white/[0.05]')}>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 scrollbar-none">

        {/* CRM / People */}
        <div className="space-y-0.5 px-1.5">
          <NavItem to="/admin/investors" icon={Users}  label="Investors"  isExpanded={isExpanded} />
          <NavItem to="/admin/users"     icon={Shield} label="User Roles" isExpanded={isExpanded} />
        </div>

        <SectionLabel label="Content" isExpanded={isExpanded} />

        <div className="space-y-0.5 px-1.5">
          <NavItem to="/admin/monthly-picks" icon={Star}      label="Top Picks"         isExpanded={isExpanded} />
          <NavItem to="/admin/inventory"     icon={Package}   label="Portal Inventory"  isExpanded={isExpanded} />
          <NavItem to="/admin/projects"      icon={Building2} label="Manual Inventory"  isExpanded={isExpanded} />
        </div>

        <SectionLabel label="Intelligence" isExpanded={isExpanded} />

        <div className="space-y-0.5 px-1.5">
          <NavItem to="/admin/dld-analytics" icon={Database} label="DLD Analytics" isExpanded={isExpanded} />
          <NavItem to="/admin/market-pulse"  icon={Activity} label="Market Pulse"  isExpanded={isExpanded} />
          <NavItem to="/admin/market-index"  icon={Layers}   label="Market Index"  isExpanded={isExpanded} />
        </div>

        <SectionLabel label="System" isExpanded={isExpanded} />

        <div className="space-y-0.5 px-1.5">
          <NavItem to="/admin/settings" icon={Settings} label="Settings" isExpanded={isExpanded} />
        </div>

      </nav>

      {/* Bottom — back to app + sign out */}
      <div className="border-t border-white/[0.05] pt-2 pb-3 space-y-0.5 px-1.5 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/dashboard"
              className={cn(
                'flex items-center rounded-xl transition-all duration-150',
                'text-muted-foreground/70 hover:bg-white/[0.05] hover:text-foreground',
                isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5',
              )}>
              <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
              {isExpanded && <span className="text-sm font-medium">Back to App</span>}
            </Link>
          </TooltipTrigger>
          {!isExpanded && <TooltipContent side="right" className="text-sm">Back to App</TooltipContent>}
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={signOut}
              className={cn(
                'w-full flex items-center rounded-xl transition-all duration-150',
                'text-muted-foreground/50 hover:bg-red-500/10 hover:text-red-400',
                isExpanded ? 'gap-3 px-3 py-2.5 mx-0' : 'justify-center py-2.5',
              )}>
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {isExpanded && <span className="text-sm font-medium">Sign Out</span>}
            </button>
          </TooltipTrigger>
          {!isExpanded && <TooltipContent side="right" className="text-sm">Sign Out</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
