import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Shield, Star, Package, Building2, Database,
  Activity, Layers, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AdminTabs — secondary horizontal navigation for `/admin/*` pages.
 *
 * Per the 28 Apr 2026 chrome redesign: the primary sidebar now collapses
 * all admin sub-pages under a single "Admin · Workspace" entry. Once a user
 * is inside the admin context, this tab bar gives them quick access to every
 * sub-section without crowding the main sidebar. Same pattern as
 * Stripe Dashboard / Linear / Notion settings.
 *
 * Active tab gets the violet accent that matches the sidebar's "Admin"
 * section colour, so the visual link reads instantly.
 *
 * Usage: rendered at the top of every admin page below the AdminLayout's
 * "Admin Mode" sticky strip. (Or inside AdminWorkspace which sits at /admin.)
 */

interface Tab {
  to: string;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { to: '/admin',                label: 'Overview',      icon: LayoutDashboard },
  { to: '/admin/investors',      label: 'Investors',     icon: Users      },
  { to: '/admin/users',          label: 'User Roles',    icon: Shield     },
  { to: '/admin/monthly-picks',  label: 'Top Picks',     icon: Star       },
  { to: '/admin/inventory',      label: 'Portal Inv.',   icon: Package    },
  { to: '/admin/projects',       label: 'Manual Inv.',   icon: Building2  },
  { to: '/admin/dld-analytics',  label: 'DLD Data',      icon: Database   },
  { to: '/admin/market-pulse',   label: 'Market Pulse',  icon: Activity   },
  { to: '/admin/market-index',   label: 'Market Index',  icon: Layers     },
  { to: '/admin/settings',       label: 'Settings',      icon: Settings   },
];

export function AdminTabs() {
  return (
    <div className="-mx-4 sm:-mx-6 mb-5 px-4 sm:px-6">
      <div className="overflow-x-auto scrollbar-none -mb-px">
        <nav className="flex items-center gap-1 min-w-max border-b border-white/[0.06] pb-px">
          {TABS.map((t) => {
            const Icon = t.icon;
            // `end` on Overview makes it match exactly /admin (not /admin/anything).
            const isOverview = t.to === '/admin';
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={isOverview}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap transition-all duration-150 border-b-2 -mb-px',
                    isActive
                      ? 'text-[#b6a4ff] border-[#7B5CFF]'
                      : 'text-muted-foreground/85 border-transparent hover:text-foreground hover:border-white/15',
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/**
 * AdminShell — layout route wrapper that renders <AdminTabs /> once above
 * any admin page's content. Used in App.tsx so individual admin pages don't
 * need to import or render AdminTabs themselves.
 *
 * Renders an "Admin Mode · {section}" sticky strip + the tab bar + the
 * outlet for the active sub-page.
 */
import { Shield } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '@/hooks/useTenant';

export function AdminShell() {
  const location = useLocation();
  const { tenant } = useTenant();

  // Friendly section name for the sticky strip — "Admin Mode · Investors"
  // reads as "the section you're on", not as a generic shell.
  const sectionTitle = (() => {
    const seg = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
    if (!seg) return 'Workspace';
    return seg
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  })();

  return (
    <>
      <div
        className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-3 px-4 sm:px-6 py-2.5 flex items-center gap-3 border-b border-[#7B5CFF]/15"
        style={{
          background:
            'linear-gradient(90deg, rgba(123,92,255,0.10) 0%, rgba(123,92,255,0.04) 50%, transparent 100%)',
        }}
      >
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.18em] bg-[#7B5CFF]/15 text-[#b6a4ff] border border-[#7B5CFF]/30">
          <Shield className="h-3 w-3" />
          Admin Mode
        </span>
        <span className="text-sm font-semibold text-foreground/90 truncate">
          {sectionTitle}
        </span>
        {tenant?.broker_name ? (
          <span className="hidden sm:inline text-xs text-muted-foreground truncate">
            · {tenant.broker_name}
          </span>
        ) : null}
      </div>

      <AdminTabs />
      <Outlet />
    </>
  );
}
