import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, PieChart, CreditCard, FolderOpen,
  BarChart3, Map, Building2, Search, Bookmark, Columns,
  Bot, Bell, User, LogOut, X, Sparkles, ChevronRight, Shield,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// MobileDrawer mirrors the desktop AppSidebar's role-aware navigation.
// 28 Apr 2026 — aligned with the launch plan (LAUNCH_PLAN.md §2-5):
//   • Investors get their personal ledger inline (Portfolio + Records).
//   • Advisers get Markets tools + an Admin entry; their clients' ledgers
//     are accessed via /admin/investors → drill into a client.
//   • Deferred-from-launch items (Global Radar, Top Picks user view,
//     Opportunity Signals as a standalone page) are not in the rail.

// Adviser / Admin sections — Markets + Admin
const ADVISER_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard',           icon: LayoutDashboard, label: 'Home' },
      { to: '/deal-analyzer',       icon: Search,           label: 'Deal Analyzer' },
      { to: '/projects',            icon: Building2,        label: 'New Launches' },
    ],
  },
  {
    label: 'Markets',
    items: [
      { to: '/market-intelligence', icon: BarChart3,        label: 'Markets' },
      { to: '/heatmap',             icon: Map,              label: 'Dubai Heatmap' },
      { to: '/watchlist',           icon: Bookmark,         label: 'Watchlist' },
      { to: '/compare',             icon: Columns,          label: 'Compare' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/admin',               icon: Shield,           label: 'Workspace' },
    ],
  },
];

// Investor sections (free or Investor Pro)
const INVESTOR_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard',           icon: LayoutDashboard, label: 'Home' },
      { to: '/portfolio',           icon: PieChart,        label: 'Portfolio' },
      { to: '/deal-analyzer',       icon: Search,          label: 'Deal Analyzer' },
      { to: '/projects',            icon: Building2,       label: 'New Launches' },
      { to: '/concierge',           icon: Bot,             label: 'AI Concierge' },
    ],
  },
  {
    label: 'Markets',
    items: [
      { to: '/market-intelligence', icon: BarChart3,       label: 'Markets' },
      { to: '/heatmap',             icon: Map,             label: 'Dubai Heatmap' },
      { to: '/watchlist',           icon: Bookmark,        label: 'Watchlist' },
      { to: '/compare',             icon: Columns,         label: 'Compare' },
    ],
  },
  {
    label: 'Records',
    items: [
      { to: '/payments',            icon: CreditCard,      label: 'Payments' },
      { to: '/documents',           icon: FolderOpen,      label: 'Documents' },
      { to: '/updates',             icon: Bell,            label: 'Updates' },
    ],
  },
];

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { signOut, user } = useAuth();
  const { plan } = useSubscription();
  const { isAdmin } = useUserRole();

  const signupRole = user?.user_metadata?.signup_role;
  const isAdviserNav = isAdmin || signupRole === 'advisor';
  const SECTIONS = isAdviserNav ? ADVISER_SECTIONS : INVESTOR_SECTIONS;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[100] bg-black/70 backdrop-blur-md transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer — slides in from right */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[101] w-[300px] flex flex-col transition-transform duration-300 ease-out lg:hidden overflow-hidden',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{
          background:
            'radial-gradient(ellipse at top, #1a2a6b 0%, #0a0f2e 55%, #05070f 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.55)',
        }}
      >
        {/* Aurora accents */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[18rem] h-[18rem] rounded-full bg-[#2d5cff]/25 blur-[90px]" />
          <div className="absolute -bottom-16 -left-12 w-[14rem] h-[14rem] rounded-full bg-[#18d6a4]/18 blur-[80px]" />
          <div className="absolute top-1/3 left-1/2 w-[10rem] h-[10rem] rounded-full bg-[#7a5cff]/18 blur-[70px]" />
        </div>

        {/* Header */}
        <div
          className="relative flex items-center justify-between px-5 border-b border-white/[0.08]"
          style={{
            height: 'calc(57px + env(safe-area-inset-top, 0))',
            paddingTop: 'env(safe-area-inset-top, 0)',
          }}
        >
          <Logo variant="white" className="h-5 w-auto max-w-[120px]" />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto py-3 custom-scrollbar">
          {SECTIONS.map(section => (
            <div key={section.label} className="mb-2">
              <p className="px-5 pt-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 select-none">
                {section.label}
              </p>
              <div className="px-2 space-y-0.5">
                {section.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-3 rounded-2xl transition-all relative',
                        isActive
                          ? 'bg-white/[0.08] text-white'
                          : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#18d6a4]" />
                        )}
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                            isActive
                              ? 'bg-[#18d6a4]/15 text-[#2effc0] border border-[#18d6a4]/30'
                              : 'bg-white/[0.06] text-white/70 border border-white/10'
                          )}
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                        </div>
                        <span className={cn('text-[14px] font-semibold flex-1', isActive && 'text-white')}>
                          {item.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-white/25" />
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom — upgrade + account */}
        <div className="relative px-3 pt-3 pb-3 border-t border-white/[0.08] space-y-2">
          {/* Upgrade nudge for free users */}
          {plan === 'free' && (
            <Link
              to="/billing"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3 rounded-2xl overflow-hidden"
              style={{
                background:
                  'linear-gradient(90deg, rgba(24,214,164,0.22), rgba(24,214,164,0.06))',
                border: '1px solid rgba(24,214,164,0.35)',
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-[#18d6a4] text-black flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-white leading-none">Upgrade to Pro</p>
                <p className="text-[11px] text-white/65 mt-1">$4/mo · 30-day free trial</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/60" />
            </Link>
          )}

          {/* User */}
          {user && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-br from-[#2effc0] to-[#2d5cff] shrink-0">
                <div className="w-full h-full rounded-full bg-[#0a0f2e] flex items-center justify-center">
                  <User className="h-4 w-4 text-white/80" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white truncate">
                  {user.email?.split('@')[0]}
                </p>
                <p className="text-[11px] text-white/45 truncate">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              onClose();
              signOut();
            }}
            className="w-full flex items-center justify-center gap-2 h-[46px] rounded-full bg-white/[0.05] border border-white/10 text-white/70 text-[13px] font-semibold hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
