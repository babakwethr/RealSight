import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Home as HomeIcon,
  BarChart3,
  PieChart,
  MoreHorizontal,
  Sparkles,
  Bot,
  Shield,
} from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

// Spring used by every Liquid-Glass animation in the bar.
// Lower stiffness + higher mass + lower damping = the viscous, syrupy
// 'fluid magnifier' feel. The lens visibly drags as it slides between
// tabs and settles with a subtle bounce — not a hard snap.
const LIQUID_SPRING = { type: 'spring' as const, stiffness: 240, damping: 26, mass: 1.0 };
// A snappier spring for the icon scale/press — keeps press feedback
// instant even while the lens itself is in slow-flow motion.
const PRESS_SPRING = { type: 'spring' as const, stiffness: 500, damping: 32 };

interface MobileNavProps {
  onMenuClick: () => void;
}

/**
 * Mobile nav — Apple-style glass bar with a protruding FAB.
 *
 * 28 Apr 2026 redesign — aligned with the role-aware desktop sidebar:
 *
 *   INVESTOR (free + Investor Pro):
 *     Home · Portfolio · [Deal Analyzer FAB] · AI Concierge · More
 *
 *   ADVISER (Adviser Pro / admin):
 *     Home · Markets · [Deal Analyzer FAB] · Admin · More
 *
 * The Deal Analyzer FAB is consistent across both roles — it's the single
 * highest-frequency action either user takes. The 4 tabs around the FAB
 * vary by role to surface the most-used surfaces for that user type.
 *
 * The bar uses the macOS frosted-glass look — translucent dark fill +
 * strong backdrop blur + saturate.
 */
export function MobileNav({ onMenuClick }: MobileNavProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const signupRole = user?.user_metadata?.signup_role;
  const isAdviserNav = isAdmin || signupRole === 'advisor';

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  // FAB is always Deal Analyzer — the single most-used action for both
  // investors (analyse a property they're considering) and advisers
  // (analyse on behalf of a client). Consistent gesture across roles.
  const fabConfig = {
    to:    '/deal-analyzer',
    label: 'Analyze',
    icon:  Sparkles,
    aria:  'Open Deal Analyzer',
  };

  // Left two + right two tabs around the center FAB.
  // Choices follow the desktop sidebar's role split.
  const leftTabs = isAdviserNav
    ? [
        { to: '/dashboard',           label: 'Home',    icon: HomeIcon },
        { to: '/market-intelligence', label: 'Markets', icon: BarChart3 },
      ]
    : [
        { to: '/dashboard',           label: 'Home',      icon: HomeIcon },
        { to: '/portfolio',           label: 'Portfolio', icon: PieChart },
      ];

  const rightTabs = isAdviserNav
    ? [
        { to: '/admin',               label: 'Admin',   icon: Shield },
      ]
    : [
        { to: '/concierge',           label: 'AI Chat', icon: Bot },
      ];

  const FabIcon = fabConfig.icon;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {/* Floating Liquid-Glass bar — Apple iOS 26 language.
          Pill shape (full height = 72, corner radius = 36 = pure pill).
          The FAB bay is a real path with rounded corners (cubic-bezier
          curves with horizontal tangents at every join) — not a fade,
          not a hard half-circle. Drawn via SVG clip-path so the curves
          stay smooth at every screen width. */}
      <div className="relative mx-2 mb-3 h-[72px] pointer-events-auto" style={{ filter: 'drop-shadow(0 18px 32px rgba(0,0,0,0.55))' }}>
        {/* Hidden SVG defining the clip-path. The path is in objectBoundingBox
            (0–1) units so it scales with the bar's actual width.
            Bar outline: pill corners + smooth bay at top centre. */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <clipPath id="liquid-bar-clip" clipPathUnits="objectBoundingBox">
              <path d="M 0.095 0 L 0.34 0 C 0.40 0, 0.40 0.31, 0.46 0.31 L 0.54 0.31 C 0.60 0.31, 0.60 0, 0.66 0 L 0.905 0 A 0.095 0.5 0 0 1 1 0.5 A 0.095 0.5 0 0 1 0.905 1 L 0.095 1 A 0.095 0.5 0 0 1 0 0.5 A 0.095 0.5 0 0 1 0.095 0 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* Glass layer — backdrop-filter clipped by the path above.
            Inset shadows still render (they're inside the clip).
            Outer drop shadow comes from the parent's `filter: drop-shadow()`. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(10, 14, 32, 0.55)',
            backdropFilter: 'blur(50px) saturate(2.4)',
            WebkitBackdropFilter: 'blur(50px) saturate(2.4)',
            clipPath: 'url(#liquid-bar-clip)',
            WebkitClipPath: 'url(#liquid-bar-clip)',
            boxShadow:
              // Inner top specular highlight — bright glass edge
              'inset 0 1.5px 0 rgba(255,255,255,0.28),' +
              // Inner bottom shadow — refraction depth
              'inset 0 -1px 0 rgba(0,0,0,0.30)',
          }}
        />

        {/* Visible STROKE tracing the entire bar outline (sides, top with
            the bay, pill corners). Drawn in a separate SVG so the stroke
            stays a constant 1 px regardless of viewport scaling. */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 1 1"
          aria-hidden="true"
        >
          <path
            d="M 0.34 0 C 0.40 0, 0.40 0.31, 0.46 0.31 L 0.54 0.31 C 0.60 0.31, 0.60 0, 0.66 0"
            fill="none"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="1"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Tab row — wrapped in LayoutGroup so the active "Liquid Lens"
            animates smoothly between tabs (shared layoutId). */}
        <div className="relative h-full flex items-stretch">
          <LayoutGroup id="mobile-nav-lens">
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
          </LayoutGroup>
        </div>
      </div>
    </nav>
  );
}

/* -------------------------------- BITS -------------------------------- */

/**
 * The Liquid Lens — Apple iOS 26 active-tab indicator (v3).
 *
 * Studied the WhatsApp / iOS 26 reference more carefully:
 *   - The lens is BRIGHTER than the bar (acts as a magnifier).
 *   - Chromatic effect is SUBTLE — a thin red kiss on the top rim and
 *     a blue kiss on the bottom rim. NOT a rainbow halo.
 *   - No outer glow — the lens is self-contained.
 *   - Strong specular highlight on the top edge (white glass rim).
 *   - It looks 'physical' — like a real glass disc placed over the icon.
 *
 * Marked with `layoutId="liquid-lens"` and wrapped by a `LayoutGroup` in
 * the parent — Framer Motion smoothly animates the same disc from one
 * tab to the next when the user navigates.
 */
/**
 * The Liquid Lens — a magnifier disc that slides between tabs.
 * v4: lower-frequency motion (viscous spring) + stronger backdrop
 * refraction + a soft white wash that follows the disc, reading as
 * the magnifier moving over the bar.
 */
function LiquidLens() {
  return (
    <motion.span
      layoutId="liquid-lens"
      aria-hidden="true"
      transition={LIQUID_SPRING}
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        // Lighter than the bar — magnifier brightens what's beneath
        background: 'rgba(255, 255, 255, 0.16)',
        // Heavier blur + brightness lift = visible magnification
        backdropFilter: 'blur(24px) saturate(2.6) brightness(1.10)',
        WebkitBackdropFilter: 'blur(24px) saturate(2.6) brightness(1.10)',
        // Clean defined rim
        border: '0.5px solid rgba(255, 255, 255, 0.42)',
        boxShadow:
          // Subtle warm chromatic on top rim (refraction at glass edge)
          'inset 0 0.5px 0 rgba(255, 140, 160, 0.50),' +
          // Bright top specular — light catching the rim
          'inset 0 2px 0.5px -1.5px rgba(255, 255, 255, 0.90),' +
          // Subtle cool chromatic on bottom rim
          'inset 0 -0.5px 0 rgba(130, 160, 255, 0.50),' +
          // Soft inner bottom shadow — depth
          'inset 0 -2px 1px -1.5px rgba(0, 0, 0, 0.32),' +
          // Soft outer white wash — the 'magnifier moving over the bar'
          // halo that makes the disc feel physically present as it slides
          '0 0 18px -2px rgba(255, 255, 255, 0.32),' +
          // Soft drop shadow grounds the disc above the bar
          '0 5px 14px -4px rgba(0, 0, 0, 0.45)',
      }}
    />
  );
}

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
      className="flex flex-col items-center justify-center gap-1 px-2 group min-h-[48px] flex-1 relative"
    >
      <motion.span
        whileTap={{ scale: 0.90 }}
        transition={PRESS_SPRING}
        className={cn(
          'relative inline-flex items-center justify-center w-11 h-11 transition-colors',
          active ? 'text-white' : 'text-white/55 group-hover:text-white/85'
        )}
      >
        {active && <LiquidLens />}
        <motion.span
          // Subtle pop on the icon itself when this tab becomes active.
          animate={active ? { scale: 1.06 } : { scale: 1 }}
          transition={PRESS_SPRING}
          className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
        >
          {icon}
        </motion.span>
      </motion.span>
      <motion.span
        animate={active ? { opacity: 1 } : { opacity: 0.65 }}
        transition={PRESS_SPRING}
        className={cn(
          'text-[10px] font-semibold tracking-wide leading-none',
          active ? 'text-white' : 'text-white/55'
        )}
      >
        {label}
      </motion.span>
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
        whileTap={{ scale: 0.90 }}
        transition={PRESS_SPRING}
        className="relative inline-flex items-center justify-center w-11 h-11 transition-colors text-white/55 group-hover:text-white/85"
      >
        <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{icon}</span>
      </motion.span>
      <span className="text-[10px] font-semibold tracking-wide text-white/55 leading-none">
        {label}
      </span>
    </button>
  );
}
