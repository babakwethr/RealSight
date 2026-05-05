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

// Spring used by every Liquid-Glass animation in the bar — matches the
// 'fluid droplet' physics Apple ship in iOS 26: snappy but with a kiss
// of overshoot so the lens visibly settles into place.
const LIQUID_SPRING = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

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
        {/* Glass layer — pill with a centre scoop for the FAB. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            // Slightly darker fill so the brighter lens contrasts cleanly
            background: 'rgba(10, 14, 32, 0.55)',
            backdropFilter: 'blur(50px) saturate(2.4)',
            WebkitBackdropFilter: 'blur(50px) saturate(2.4)',
            borderRadius: '36px',
            boxShadow:
              // Outer drop shadow — bar floats above content
              '0 22px 48px -16px rgba(0,0,0,0.65),' +
              // Inner top specular highlight — bright glass edge
              'inset 0 1px 0 rgba(255,255,255,0.22),' +
              // Inner bottom shadow — refraction depth
              'inset 0 -1px 0 rgba(0,0,0,0.30)',
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
            left: '36px',
            right: 'calc(50% + 40px)',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.42) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute top-0 h-px pointer-events-none"
          style={{
            left: 'calc(50% + 40px)',
            right: '36px',
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.42) 0%, transparent 100%)',
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
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="1"
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
function LiquidLens() {
  return (
    <motion.span
      layoutId="liquid-lens"
      aria-hidden="true"
      transition={LIQUID_SPRING}
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{
        // Brighter than the bar — acts as a magnifying lens
        background: 'rgba(255, 255, 255, 0.18)',
        backdropFilter: 'blur(20px) saturate(2.4) brightness(1.05)',
        WebkitBackdropFilter: 'blur(20px) saturate(2.4) brightness(1.05)',
        // Clean white rim — gives the disc a defined edge
        border: '0.5px solid rgba(255, 255, 255, 0.40)',
        boxShadow:
          // Top-rim chromatic kiss (red — subtle, just a thin line)
          'inset 0 0.5px 0 rgba(255, 130, 150, 0.55),' +
          // Top specular — bright glass highlight catching ambient light
          'inset 0 2px 0.5px -1.5px rgba(255, 255, 255, 0.85),' +
          // Bottom-rim chromatic kiss (blue/violet — subtle)
          'inset 0 -0.5px 0 rgba(120, 150, 255, 0.55),' +
          // Bottom shadow — gives depth, like the disc is slightly raised
          'inset 0 -2px 1px -1.5px rgba(0, 0, 0, 0.30),' +
          // Soft drop shadow under the disc
          '0 4px 12px -3px rgba(0, 0, 0, 0.45)',
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
        whileTap={{ scale: 0.88 }}
        transition={LIQUID_SPRING}
        className={cn(
          'relative inline-flex items-center justify-center w-11 h-11 transition-colors',
          active ? 'text-white' : 'text-white/55 group-hover:text-white/85'
        )}
      >
        {active && <LiquidLens />}
        <motion.span
          // Subtle bounce on the icon itself when this tab becomes active.
          animate={active ? { scale: 1.08 } : { scale: 1 }}
          transition={LIQUID_SPRING}
          className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
        >
          {icon}
        </motion.span>
      </motion.span>
      <motion.span
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0.6, y: 0 }}
        transition={LIQUID_SPRING}
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
        whileTap={{ scale: 0.88 }}
        transition={LIQUID_SPRING}
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
