import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Home as HomeIcon,
  BarChart3,
  PieChart,
  MoreHorizontal,
  Sparkles,
  MessageCircle,
  Radar as RadarIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface MobileNavProps {
  onMenuClick: () => void;
}

/**
 * V3 mobile nav — Apple-style glass bar with a protruding FAB.
 *
 * Role-based layout:
 *   • Adviser / Admin: Home → Market → [Analyze FAB → /deal-analyzer] → Radar → More
 *   • Investor:        Home → Portfolio → [Ask AI FAB → /concierge]    → Market → More
 *
 * The FAB label ("Analyze" or "Ask AI") now sits INSIDE the bar alongside
 * the other tab labels. The bar uses Apple's hallmark frosted-glass look
 * (backdrop-filter blur + saturate over a translucent dark fill).
 */
export function MobileNav({ onMenuClick }: MobileNavProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const signupRole = user?.user_metadata?.signup_role;
  // Treat admins + explicit advisors as adviser nav; everyone else = investor nav
  const isAdviserNav = isAdmin || signupRole === 'advisor';

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  // ---- Role-aware config ----------------------------------------------------
  const fabConfig = isAdviserNav
    ? { to: '/deal-analyzer', label: 'Analyze', icon: Sparkles, aria: 'Open Deal Analyzer' }
    : { to: '/concierge',     label: 'Ask AI',  icon: MessageCircle, aria: 'Open AI Concierge' };

  // Left two + right two tabs around the center FAB
  const leftTabs = isAdviserNav
    ? [
        { to: '/dashboard',           label: 'Home',   icon: HomeIcon },
        { to: '/market-intelligence', label: 'Market', icon: BarChart3 },
      ]
    : [
        { to: '/dashboard',           label: 'Home',      icon: HomeIcon },
        { to: '/portfolio',           label: 'Portfolio', icon: PieChart },
      ];

  const rightTabs = isAdviserNav
    ? [
        { to: '/radar',               label: 'Radar',  icon: RadarIcon },
      ]
    : [
        { to: '/market-intelligence', label: 'Market', icon: BarChart3 },
      ];

  const FabIcon = fabConfig.icon;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {/* Floating glass bar — rounded rectangle like the reference,
          with a wide semicircular scoop at top-center for the FAB. */}
      <div className="relative mx-2 mb-3 h-[72px] pointer-events-auto">
        {/* Glass layer with border-radius + mask notch */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(15, 20, 40, 0.55)',
            backdropFilter: 'blur(30px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(30px) saturate(1.6)',
            borderRadius: '26px',
            boxShadow: '0 18px 40px -14px rgba(0,0,0,0.55)',
            // Wider scoop — fits the FAB snugly like the reference
            WebkitMaskImage:
              'radial-gradient(circle 40px at 50% 0, transparent 39px, #000 40px)',
            maskImage:
              'radial-gradient(circle 40px at 50% 0, transparent 39px, #000 40px)',
          }}
        />

        {/* Top hairlines — two straight halves that stop before the notch */}
        <div
          aria-hidden="true"
          className="absolute top-0 h-px pointer-events-none"
          style={{
            left: '26px',
            right: 'calc(50% + 40px)',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute top-0 h-px pointer-events-none"
          style={{
            left: 'calc(50% + 40px)',
            right: '26px',
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.22) 0%, transparent 100%)',
          }}
        />

        {/* Curved hairline tracing the inside of the notch */}
        <svg
          aria-hidden="true"
          className="absolute pointer-events-none"
          width="82"
          height="42"
          viewBox="0 0 82 42"
          style={{ left: 'calc(50% - 41px)', top: 0 }}
        >
          <path
            d="M 1 0 A 40 40 0 0 0 81 0"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1"
          />
        </svg>

        {/* Tab row */}
        <div className="relative h-full flex items-stretch">
          <div className="flex-1 flex items-stretch justify-around">
            {leftTabs.map(t => (
              <TabLink key={t.to} to={t.to} label={t.label} active={isActive(t.to)} icon={<t.icon className="h-[22px] w-[22px]" />} />
            ))}

            {/* Center FAB slot — orb protrudes above, label sits inside the bar */}
            <Link
              to={fabConfig.to}
              aria-label={fabConfig.aria}
              className="flex flex-col items-center justify-end pb-2 min-h-[48px] relative w-[72px] shrink-0"
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="relative w-[56px] h-[56px] -mt-8 mb-0.5 rounded-full flex items-center justify-center"
              >
                {/* Halo */}
                <div className="absolute inset-0 rounded-full bg-[#18d6a4] blur-[16px] opacity-55 animate-pulse" />
                {/* Orb */}
                <div
                  className="relative w-[52px] h-[52px] rounded-full flex items-center justify-center"
                  style={{
                    background:
                      'radial-gradient(circle at 30% 20%, #2effc0 0%, #18d6a4 45%, #059669 100%)',
                    boxShadow:
                      '0 8px 24px rgba(24,214,164,0.45), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -5px 8px rgba(0,0,0,0.22)',
                  }}
                >
                  <FabIcon className="h-[22px] w-[22px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                </div>
              </motion.div>
              <span className="text-[10px] font-bold tracking-wide text-white leading-none whitespace-nowrap">
                {fabConfig.label}
              </span>
            </Link>

            {rightTabs.map(t => (
              <TabLink key={t.to} to={t.to} label={t.label} active={isActive(t.to)} icon={<t.icon className="h-[22px] w-[22px]" />} />
            ))}

            <TabButton label="More" onClick={onMenuClick} icon={<MoreHorizontal className="h-[22px] w-[22px]" />} />
          </div>
        </div>
      </div>
    </nav>
  );
}

/* -------------------------------- BITS -------------------------------- */

function TabLink({
  to,
  label,
  active,
  icon,
}: {
  to: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className="flex flex-col items-center justify-center gap-1 px-2 group min-h-[48px] flex-1"
    >
      <motion.span
        whileTap={{ scale: 0.85 }}
        className={cn(
          'transition-colors',
          active ? 'text-white' : 'text-white/50 group-hover:text-white/80'
        )}
      >
        {icon}
      </motion.span>
      <span
        className={cn(
          'text-[10px] font-semibold tracking-wide transition-colors leading-none',
          active ? 'text-white' : 'text-white/45'
        )}
      >
        {label}
      </span>
      {active && (
        <span className="absolute h-1 w-1 rounded-full bg-[#18d6a4] translate-y-[26px]" />
      )}
    </NavLink>
  );
}

function TabButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 px-2 group min-h-[48px] flex-1"
    >
      <motion.span
        whileTap={{ scale: 0.85 }}
        className="transition-colors text-white/50 group-hover:text-white/80"
      >
        {icon}
      </motion.span>
      <span className="text-[10px] font-semibold tracking-wide text-white/45 leading-none">
        {label}
      </span>
    </button>
  );
}
