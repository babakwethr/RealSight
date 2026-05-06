import { useLayoutEffect, useRef } from 'react';
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
import {
  motion,
  useMotionValue,
  useSpring,
  useVelocity,
  useTransform,
  animate,
  type MotionValue,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

// Spring used to animate the lens's X position between tabs.
// Soft + slightly under-damped so the lens visibly drags and lands
// with a jelly settle — the iOS-26 / WhatsApp 'liquid' feel.
const POS_SPRING = { type: 'spring' as const, stiffness: 185, damping: 19, mass: 1.35 };
// Snappy spring for icon press / scale-up feedback.
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

const LENS_WIDTH = 60;

interface MobileNavProps {
  onMenuClick: () => void;
}

/**
 * Mobile nav — Liquid Glass v8.
 *
 * Active-tab indicator is a SINGLE shared lens whose horizontal position
 * is driven by motion values, with a velocity-derived horizontal stretch.
 * The lens elongates while in flight (like a water droplet being pulled
 * sideways) and contracts back to its resting shape on land. This is the
 * 'true liquid' tier — distinct from the v7 layoutId approach, which
 * moved a rigid puck.
 *
 * Implementation:
 *   - Tab DOM nodes are registered in a `Map<path, HTMLAnchorElement>`
 *     via a ref callback on each NavLink.
 *   - On active-path change (or container resize) we measure the active
 *     tab's centre and `animate(x, targetX, POS_SPRING)`.
 *   - `useVelocity(x)` → `useTransform([-2200, 0, 2200], [1.34, 1, 1.34])`
 *     → `useSpring(...)` produces a smoothed `scaleX` that follows
 *     velocity. Symmetric for both directions of travel.
 *   - The lens is rendered ONCE at the container level (not per-tab),
 *     positioned absolutely with `style={{ x, scaleX, opacity }}`.
 *   - The FAB (green Analyze button) is untouched per Babak's note.
 */
export function MobileNav({ onMenuClick }: MobileNavProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const signupRole = user?.user_metadata?.signup_role;
  const isAdviserNav = isAdmin || signupRole === 'advisor';

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  // FAB is always Deal Analyzer — single highest-frequency action for
  // both investor and adviser personas.
  const fabConfig = {
    to:    '/deal-analyzer',
    label: 'Analyze',
    icon:  Sparkles,
    aria:  'Open Deal Analyzer',
  };

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

  // Tabs that can host the lens (everything routed, not the FAB or More).
  const lensTabs = [...leftTabs, ...rightTabs];
  const activePath = lensTabs.find(t => isActive(t.to))?.to ?? null;

  // ─────────────────────── Liquid lens motion plumbing ───────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const lastPathRef = useRef<string | null>(null);

  const x = useMotionValue(0);
  const opacity = useMotionValue(0);
  const velocity = useVelocity(x);
  // Velocity-driven horizontal stretch: ±2200 px/s maps to scaleX 1.34;
  // 0 px/s (rest) maps to scaleX 1. Symmetric for left + right travel.
  const stretchTarget = useTransform(velocity, [-2200, 0, 2200], [1.34, 1, 1.34]);
  // Smooth the stretch so it lags slightly behind raw velocity — gives
  // the lens 'inertia' that reads as liquid rather than a rigid scale-pop.
  const scaleX = useSpring(stretchTarget, { stiffness: 220, damping: 20, mass: 0.6 });

  // Reposition the lens whenever the active route or container size changes.
  useLayoutEffect(() => {
    if (!activePath) {
      animate(opacity, 0, { duration: 0.15 });
      lastPathRef.current = null;
      return;
    }

    const reposition = (animatePosition: boolean) => {
      const tabEl = tabRefs.current.get(activePath);
      const container = containerRef.current;
      if (!tabEl || !container) return;
      const containerRect = container.getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();
      const targetX =
        tabRect.left - containerRect.left + tabRect.width / 2 - LENS_WIDTH / 2;
      if (animatePosition) {
        animate(x, targetX, POS_SPRING);
      } else {
        x.set(targetX);
      }
    };

    const isFirstAppearance = lastPathRef.current === null;
    // First appearance: snap to position so the lens doesn't fly across
    // from x=0. Subsequent path changes: animate with the soft spring.
    reposition(!isFirstAppearance);
    if (isFirstAppearance) {
      animate(opacity, 1, { duration: 0.18 });
    } else {
      opacity.set(1);
    }
    lastPathRef.current = activePath;

    // Resize handling — keep the lens locked to the active tab if the
    // viewport (or the bar's measured width) changes. Snap, never animate.
    const ro = new ResizeObserver(() => reposition(false));
    if (containerRef.current) ro.observe(containerRef.current);
    const onWindowResize = () => reposition(false);
    window.addEventListener('resize', onWindowResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWindowResize);
    };
    // x / opacity are stable motion values — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);

  const FabIcon = fabConfig.icon;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {/* Floating Liquid-Glass bar — Apple iOS 26 language.
          Bar shape (pill + smooth bay) is an SVG mask on the bar div
          itself. Mask-image preserves backdrop-filter (clip-path under
          a filtered parent does not). */}
      <div className="relative mx-2 mb-3 h-[72px] pointer-events-auto">
        {/* Soft outer drop shadow — sibling element behind the bar. */}
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

        {/* Glass layer — backdrop-filter shaped by the bar-shape mask. */}
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
              'inset 0 1.5px 0 rgba(255,255,255,0.28),' +
              'inset 0 -1px 0 rgba(0,0,0,0.30)',
          }}
        />

        {/* Visible stroke tracing the bay's curved edge. */}
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

        {/* Tab row + single liquid lens. The lens is a sibling of the
            tab list, positioned absolutely within `containerRef`. */}
        <div ref={containerRef} className="relative h-full flex items-stretch">
          <LiquidLens x={x} scaleX={scaleX} opacity={opacity} />

          <div className="flex-1 flex items-stretch justify-around relative">
            {leftTabs.map(t => (
              <TabLink
                key={t.to}
                to={t.to}
                label={t.label}
                active={isActive(t.to)}
                icon={<t.icon className="h-[22px] w-[22px]" />}
                tabRef={el => {
                  if (el) tabRefs.current.set(t.to, el);
                  else tabRefs.current.delete(t.to);
                }}
              />
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
              <TabLink
                key={t.to}
                to={t.to}
                label={t.label}
                active={isActive(t.to)}
                icon={<t.icon className="h-[22px] w-[22px]" />}
                tabRef={el => {
                  if (el) tabRefs.current.set(t.to, el);
                  else tabRefs.current.delete(t.to);
                }}
              />
            ))}

            <TabButton label="More" onClick={onMenuClick} icon={<MoreHorizontal className="h-[22px] w-[22px]" />} />
          </div>
        </div>
      </div>
    </nav>
  );
}

/* -------------------------------- BITS -------------------------------- */

/**
 * The Liquid Lens — a single magnifier bubble whose position and
 * horizontal stretch are driven by the parent's motion values.
 *
 * Visual recipe (matches the WhatsApp iOS-26 reference):
 *   - Oval, 60×80 (taller than the bar so it bleeds top + bottom).
 *   - Soft white background tint over a strong backdrop blur + saturate
 *     for the magnifier feel.
 *   - 0.5 px white rim.
 *   - Bright top specular highlight; soft bottom inner shadow for depth.
 *   - Side-rim chromatic aberration (warm red on the left, cool cyan on
 *     the right) — visible most clearly while the lens is in flight.
 *   - Soft outer halo + drop shadow grounds the disc above the bar.
 */
function LiquidLens({
  x,
  scaleX,
  opacity,
}: {
  x: MotionValue<number>;
  scaleX: MotionValue<number>;
  opacity: MotionValue<number>;
}) {
  return (
    <motion.span
      aria-hidden="true"
      className="absolute pointer-events-none rounded-full"
      style={{
        x,
        scaleX,
        opacity,
        top: -4,
        bottom: -4,
        left: 0,
        width: LENS_WIDTH,
        transformOrigin: 'center',
        background: 'rgba(255, 255, 255, 0.16)',
        backdropFilter: 'blur(22px) saturate(2.8) brightness(1.12)',
        WebkitBackdropFilter: 'blur(22px) saturate(2.8) brightness(1.12)',
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
          // Soft outer white halo — the magnifier's presence as it slides
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
  tabRef,
}: {
  to: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  tabRef: (el: HTMLAnchorElement | null) => void;
}) {
  return (
    <NavLink
      to={to}
      ref={tabRef}
      className="flex flex-col items-center justify-center gap-1 px-2 group min-h-[48px] flex-1 relative"
    >
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
          'relative z-10 text-[10px] font-semibold tracking-wide leading-none',
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
      className="flex flex-col items-center justify-center gap-1 px-2 group min-h-[48px] flex-1 relative"
    >
      <motion.span
        whileTap={{ scale: 0.90 }}
        transition={PRESS_SPRING}
        className="relative z-10 inline-flex items-center justify-center w-11 h-11 transition-colors text-white/55 group-hover:text-white/85"
      >
        <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{icon}</span>
      </motion.span>
      <span className="relative z-10 text-[10px] font-semibold tracking-wide text-white/55 leading-none">
        {label}
      </span>
    </button>
  );
}
