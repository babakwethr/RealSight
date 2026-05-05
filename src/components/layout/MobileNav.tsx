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
          Pill shape (border-radius = height/2 = 36 px), heavy blur,
          high saturation, light fill. Wide semicircular scoop at the
          top-centre keeps room for the green FAB. */}
      <div className="relative mx-2 mb-3 h-[72px] pointer-events-auto">
        {/* Glass layer — pill with a SOFT elliptical bay around the FAB.
            No hard mask cut: a feathered radial gradient creates a gentle
            valley that curves smoothly UP toward the FAB without touching
            it (per Babak's feedback — no hard half-circle). */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(10, 14, 32, 0.55)',
            backdropFilter: 'blur(50px) saturate(2.4)',
            WebkitBackdropFilter: 'blur(50px) saturate(2.4)',
            borderRadius: '36px',
            boxShadow:
              // Outer drop shadow — bar floats above content
              '0 22px 48px -16px rgba(0,0,0,0.65),' +
              // Inner top specular highlight — soft glass edge
              'inset 0 1px 0 rgba(255,255,255,0.22),' +
              // Inner bottom shadow — refraction depth
              'inset 0 -1px 0 rgba(0,0,0,0.30)',
            // Soft elliptical bay — wider and feathered so the curve
            // 'wraps' around the FAB rather than scooping a hard arc.
            // The transparent → black falloff over 78% → 100% gives the
            // gentle smooth edge Babak asked for.
            WebkitMaskImage:
              'radial-gradient(ellipse 60px 28px at 50% 0, transparent 0%, transparent 78%, #000 100%)',
            maskImage:
              'radial-gradient(ellipse 60px 28px at 50% 0, transparent 0%, transparent 78%, #000 100%)',
          }}
        />

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
