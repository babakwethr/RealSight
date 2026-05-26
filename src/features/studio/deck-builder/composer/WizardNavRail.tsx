/**
 * WizardNavRail — slim icon-only sidebar visible inside the deck
 * builder wizard. The full AppSidebar is intentionally NOT mounted
 * (cinematic-bg + backdrop-blur side-effects were the OOM culprit on
 * low-power tabs). This is a lightweight static replacement:
 *
 *   - Solid dark background, no backdrop-filter
 *   - No hooks beyond useUserRole (which is hot-cached at this point
 *     in the session anyway)
 *   - 56px wide icon rail with tooltips on hover
 *   - Hidden on mobile (the wizard top bar already has a Studio crumb)
 *
 * Mirrors the most-used nav targets from AppSidebar so the adviser
 * doesn't feel stranded inside the deck builder.
 */

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Building2,
  Eye,
  Wand2,
  Globe,
  PieChart,
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

interface RailItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const ADVISER_ITEMS: RailItem[] = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Home' },
  { to: '/markets',           icon: Map,             label: 'Markets' },
  { to: '/uae-market',        icon: Building2,       label: 'UAE Market' },
  { to: '/off-plan',          icon: Building2,       label: 'Off-Plan' },
  { to: '/global-heatmap',    icon: Globe,           label: 'Global Heatmap' },
  { to: '/watchlist',         icon: Eye,             label: 'Watchlist' },
  { to: '/studio',            icon: Wand2,           label: 'Studio' },
];

const INVESTOR_ITEMS: RailItem[] = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Home' },
  { to: '/portfolio',         icon: PieChart,        label: 'Portfolio' },
  { to: '/markets',           icon: Map,             label: 'Markets' },
  { to: '/uae-market',        icon: Building2,       label: 'UAE Market' },
  { to: '/watchlist',         icon: Eye,             label: 'Watchlist' },
];

export function WizardNavRail() {
  const { isAdmin } = useUserRole();
  const location = useLocation();
  const items = isAdmin ? ADVISER_ITEMS : INVESTOR_ITEMS;

  return (
    <aside
      className="hidden lg:flex h-[100dvh] w-[60px] shrink-0 flex-col items-center border-r border-white/[0.06] py-3"
      style={{ background: 'rgba(7, 4, 15, 0.6)' }}
      aria-label="Workspace navigation"
    >
      {/* Brand mark — links home */}
      <Link
        to="/dashboard"
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-white/[0.05]"
        title="RealSight home"
      >
        <Logo variant="white" className="h-5 w-auto" />
      </Link>

      <div className="my-1 h-px w-7 bg-white/[0.06]" />

      <nav className="mt-2 flex flex-col items-center gap-1">
        {items.map((item) => {
          const isActive =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + '/');
          // Studio is the current section — highlight it whenever we're
          // anywhere under /studio.
          const isStudio = item.to === '/studio' && location.pathname.startsWith('/studio');
          const active = isActive || isStudio;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={cn(
                'group relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                active
                  ? 'bg-[#18d6a4]/15 text-[#2effc0] ring-1 ring-inset ring-[#18d6a4]/35'
                  : 'text-white/55 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              <Icon className="h-[15px] w-[15px]" />
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#18d6a4]"
                />
              ) : null}
              {/* Tooltip on hover — pure CSS, no portal */}
              <span
                className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/[0.10] bg-[#0c0a1a] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white opacity-0 transition-opacity group-hover:opacity-100"
                style={{ zIndex: 50 }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
