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
// 'fluid magnifier' feel from the iOS 26 / WhatsApp reference. The lens
// visibly drags as it slides between tabs and lands with a soft jelly
// overshoot — not a hard snap. v7 tuning is softer than v6.
const LIQUID_SPRING = { type: 'spring' as const, stiffness: 185, damping: 19, mass: 1.35 };
// A snappier spring for the icon scale/press — keeps press feedback
// instant even while the lens itself is in slow-flow motion.
const PRESS_SPRING = { type: 'spring' as const, stiffness: 500, damping: 32 };

// Bar shape — pill (radius 36 px on a typical 380 px-wide bar) with a smooth
// bay at top centre. Cubic-bezier curves with horizontal tangents at every
// join so the bay enters the flat top with rounded corners (no sharp angle).
// Used as a mask-image so backdrop-filter survives (clip-path + parent
// filter combos break the glass effect).
const BAR_SHAPE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 72" preserveAspectRatio="none">' +
  '<path fill="white" d="' +
  // Top edge: starts after pill corner, dips into bay, comes back, runs to other pill corner
  'M 9.5 0 L 34.21 0 ' +
  'C 38.16 0, 38.16 22, 42.11 22 ' +
  'L 57.89 22 ' +
  'C 61.84 22, 61.84 0, 65.79 0 ' +
  'L 90.5 0 ' +
  // Right pill corner (elliptical arc, scales with width but renders ~circular)
  'A 9.5 36 0 0 1 100 36 ' +
  'A 9.5 36 0 0 1 90.5 72 ' +
  'L 9.5 72 ' +
  // Left pill corner
  'A 9.5 36 0 0 1 0 36 ' +
  'A 9.5 36 0 0 1 9.5 0 Z' +
  '"/></svg>';

const BAR_MASK_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(BAR_SHAPE_SVG)}")`;

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
          The bar shape (pill + smooth bay) is defined as an SVG mask
          on the bar div itself. Mask-image does NOT break backdrop-
          filter (clip-path + parent filter did), so the glass blur
          stays intact while the bay still has rounded-corner curves. */}
      <div className="relative mx-2 mb-3 h-[72px] pointer-events-auto">
        {/* Soft outer drop shadow — sibling element behind the bar.
            Same mask shape, dark fill, blurred + offset to read as
            a soft shadow under the pill. Lives behind the bar so its
            blur doesn't break the bar's backdrop-filter. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            maskImage: BAR_MASK_URL,
            WebkitMaskImage: BAR_MASK_URL,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            filter: 'blur(18px)',
            transform: 'translateY(10px)',
            opacity: 0.75,
          }}
        />

        {/* Glass layer — backdrop-filter shaped by the bar-shape mask.
            Mask-image preserves backdrop-filter (unlike clip-path under
            a filtered parent). Inset highlights stay; outer shadow is
            the sibling element above. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(10, 14, 32, 0.55)',
            backdropFilter: 'blur(50px) saturate(2.4)',
            WebkitBackdropFilter: 'blur(50px) saturate(2.4)',
            maskImage: BAR_MASK_URL,
            WebkitMaskImage: BAR_MASK_URL,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            boxShadow:
              // Inner top specular highlight — bright glass edge
              'inset 0 1.5px 0 rgba(255,255,255,0.28),' +
              // Inner bottom shadow — refraction depth
              'inset 0 -1px 0 rgba(0,0,0,0.30)',
          }}
        />

        {/* Visible STROKE tracing the bay's curved edge.
            Drawn in a separate SVG so the stroke stays constant 1 px
            regardless of viewport scaling. */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 100 72"
          aria-hidden="true"
        >
          <path
            d="M 34.21 0 C 38.16 0, 38.16 22, 42.11 22 L 57.89 22 C 61.84 22, 61.84 0, 65.79 0"
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
 * The Liquid Lens — v7, redrawn from the WhatsApp iOS 26 reference video.
 *
 * Key changes from v6:
 *   - Bigger than the icon cell. The lens is an OVAL (60×80) that
 *     overflows the bar's vertical bounds — it visibly bleeds above
 *     and below the pill, like a glass bubble sitting on top of the bar.
 *   - Side-rim chromatic aberration. A warm red kiss on the LEFT inner
 *     rim and a cool cyan kiss on the RIGHT inner rim — that's where
 *     the WhatsApp lens shows the most visible fringing as it travels
 *     horizontally.
 *   - Softer, jelly-er spring (see LIQUID_SPRING) so the lens visibly
 *     overshoots and settles when it lands.
 *   - Brighter inner wash + stronger backdrop saturate to make the
 *     magnifier effect read clearly on the dark bar.
 *
 * Implementation note: the lens is positioned as a direct absolute
 * child of the parent NavLink (NOT inside the icon cell), so it can
 * be larger than the icon and overflow the bar without being clipped.
 * Centered with `left: 'calc(50% - 30px)'` to avoid a `transform`
 * that would fight with Framer's own layoutId transform.
 */
function LiquidLens() {
  return (
    <motion.span
      layoutId="liquid-lens"
      aria-hidden="true"
      transition={LIQUID_SPRING}
      className="absolute pointer-events-none rounded-full"
      style={{
        top: -4,
        bottom: -4,
        left: 'calc(50% - 30px)',
        width: 60,
        // Brighter than the bar — magnifier lifts what's beneath
        background: 'rgba(255, 255, 255, 0.16)',
        // Heavier blur + saturate + brightness = visible magnification
        backdropFilter: 'blur(22px) saturate(2.8) brightness(1.12)',
        WebkitBackdropFilter: 'blur(22px) saturate(2.8) brightness(1.12)',
        // Clean defined rim — the glass edge
        border: '0.5px solid rgba(255, 255, 255, 0.48)',
        boxShadow:
          // Bright top specular — light catching the upper rim
          'inset 0 2px 1px -1px rgba(255, 255, 255, 0.85),' +
          // Soft inner bottom shadow — depth, the bottom curve
          'inset 0 -2px 2px -1px rgba(0, 0, 0, 0.32),' +
          // LEFT rim chromatic — warm red/orange refraction
          'inset 1.5px 0 1px -0.5px rgba(255, 95, 110, 0.55),' +
          // RIGHT rim chromatic — cool cyan/blue refraction
          'inset -1.5px 0 1px -0.5px rgba(95, 170, 255, 0.55),' +
          // Soft outer white halo — the 'magnifier moving over the bar'
          // glow that makes the disc feel physically present as it slides
          '0 0 22px -4px rgba(255, 255, 255, 0.30),' +
          // Drop shadow grounds the disc above the bar
          '0 6px 18px -6px rgba(0, 0, 0, 0.55)',
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
      {/* Liquid lens lives at the NavLink level (not inside the icon cell)
          so it can be larger than the icon and overflow the bar's bounds. */}
      {active && <LiquidLens />}
      <motion.span
        whileTap={{ scale: 0.90 }}
        transition={PRESS_SPRING}
        className={cn(
          'relative z-10 inline-flex items-center justify-center w-11 h-11 transition-colors',
          active ? 'text-white' : 'text-white/55 group-hover:text-white/85'
        )}
      >
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
