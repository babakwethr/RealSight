import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation as useTabLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Shield, Star, Package, Building2, Database,
  Activity, Layers, Settings, ChevronDown, Check,
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
  const location = useTabLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Find the currently active tab so the mobile dropdown shows it as the trigger.
  const activeTab = TABS.find((t) => {
    if (t.to === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(t.to);
  }) || TABS[0];
  const ActiveIcon = activeTab.icon;

  // Click outside / Esc to close dropdown
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="mb-5">
      {/* ── MOBILE: dropdown menu instead of horizontal-scroll tabs ── */}
      <div ref={ref} className="lg:hidden relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Admin section"
          className="w-full flex items-center justify-between gap-2 h-12 px-4 rounded-2xl text-[14px] font-bold transition-all"
          style={{
            background: 'linear-gradient(180deg, rgba(123,92,255,0.10), rgba(15,18,40,0.55))',
            border: '1px solid rgba(123,92,255,0.20)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px -12px rgba(123,92,255,0.20)',
          }}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white"
              style={{ background: 'linear-gradient(135deg, #7B5CFF 0%, #5C3FFF 100%)' }}
            >
              <ActiveIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-foreground truncate">{activeTab.label}</span>
          </span>
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>

        {open && (
          <>
            {/* backdrop dim */}
            <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" aria-hidden="true" onClick={() => setOpen(false)} />
            <div
              role="menu"
              className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
              style={{
                background: 'rgba(15,18,40,0.97)',
                border: '1px solid rgba(123,92,255,0.30)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 20px 50px -10px rgba(0,0,0,0.6)',
              }}
            >
              <nav className="p-1.5 max-h-[60vh] overflow-y-auto">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab.to === t.to;
                  return (
                    <Link
                      key={t.to}
                      to={t.to}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 h-11 px-3 rounded-xl text-[13.5px] font-semibold transition-colors',
                        isActive
                          ? 'text-white'
                          : 'text-foreground/80 hover:bg-white/[0.04]',
                      )}
                      style={isActive
                        ? { background: 'linear-gradient(135deg, rgba(123,92,255,0.20) 0%, rgba(92,63,255,0.14) 100%)' }
                        : {}
                      }
                    >
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={isActive
                          ? { background: 'linear-gradient(135deg, #7B5CFF 0%, #5C3FFF 100%)', color: '#fff' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)' }
                        }
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 text-left truncate">{t.label}</span>
                      {isActive && <Check className="h-4 w-4 text-[#b6a4ff] shrink-0" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </>
        )}
      </div>

      {/* ── DESKTOP: existing horizontal pill bar — unchanged ── */}
      <div
        className="hidden lg:block rounded-2xl p-1.5 overflow-x-auto scrollbar-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(123,92,255,0.10), rgba(15,18,40,0.55))',
          border: '1px solid rgba(123,92,255,0.20)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 8px 24px -12px rgba(123,92,255,0.20)',
        }}
      >
        <nav className="flex items-center gap-1 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isOverview = t.to === '/admin';
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={isOverview}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all duration-150',
                    isActive
                      ? 'text-white shadow-[0_4px_14px_-4px_rgba(123,92,255,0.55)]'
                      : 'text-muted-foreground/90 hover:text-foreground hover:bg-white/[0.04]',
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        background:
                          'linear-gradient(135deg, #7B5CFF 0%, #5C3FFF 100%)',
                      }
                    : {}
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
