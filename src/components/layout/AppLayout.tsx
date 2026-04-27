import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { MobileDrawer } from './MobileDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { getUpsellTarget, isAdviserUser } from '@/lib/upsell';
import { Sparkles, ArrowRight, X } from 'lucide-react';

/**
 * AppLayout — root chrome for every authenticated page.
 *
 * Background composition (28 Apr 2026 redesign):
 *   1. Page-wide `cinematic-bg` class on the root provides the base layer
 *      (radial-gradient stack on `#07040F`).
 *   2. `cinematic-bg::before` and `::after` (in `src/index.css`) add the
 *      aurora orbs as `position: fixed` pseudo-elements pinned to the
 *      viewport — they don't get clipped by any inner overflow boundary
 *      and don't scroll with content.
 *   3. We do NOT add additional aurora orbs here. The previous build had
 *      three blurred orbs inside an `overflow-hidden absolute inset-0` div,
 *      which produced a visible diagonal "cut" at the top-right corner where
 *      one orb's bounding box met the upgrade-banner border (founder QA, 28
 *      Apr 2026). Removing the inner aurora div + dropping `overflow-hidden`
 *      from the root cleared the issue.
 *
 * `isolation: isolate` keeps the sidebar's z-stack independent of any
 * z-indexed content the page renders inside <Outlet />.
 */
export function AppLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [stripDismissed, setStripDismissed] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { plan, loading } = useSubscription();
  // Plan-aware upsell (single source of truth across all surfaces).
  // Returns null for top-tier users → strip stays hidden for them.
  const upsell = getUpsellTarget(
    plan,
    isAdviserUser({ isAdmin, signupRole: user?.user_metadata?.signup_role }),
  );
  const showUpgradeBanner = !loading && upsell && !stripDismissed;

  return (
    <div
      className="relative min-h-screen cinematic-bg flex w-full"
      style={{ isolation: 'isolate' }}
    >
      {/* Desktop sidebar — always-expanded fixed-width rail. Sticky to viewport. */}
      <div className="relative hidden lg:block shrink-0 sticky top-0 h-screen z-20">
        <AppSidebar />
      </div>

      <main className="relative flex-1 flex flex-col min-h-screen min-w-0 z-10">
        {/* Upgrade strip — plan-aware via getUpsellTarget(). Investor-path
            users see "Investor Pro · $4/mo"; adviser-path users see "Adviser
            Pro · $99/mo"; top-tier users see nothing. */}
        {showUpgradeBanner && upsell && (() => {
          const isAdviserUpsell = upsell.targetPlan === 'adviser_pro';
          const planName = isAdviserUpsell ? 'Adviser Pro' : 'Investor Pro';
          const featureLine = isAdviserUpsell
            ? 'White-label · Custom subdomain · Invite clients · Branded reports'
            : 'Live unit availability · Floor & view · Real-time prices';
          const accent = upsell.accent;
          const buttonGradient = isAdviserUpsell
            ? 'linear-gradient(90deg,#7B5CFF 0%, #5C3FFF 100%)'
            : 'linear-gradient(90deg,#2effc0 0%, #18d6a4 55%, #059669 100%)';
          const stripGradient = isAdviserUpsell
            ? 'linear-gradient(90deg, rgba(123,92,255,0.16) 0%, rgba(123,92,255,0.05) 60%, transparent 100%)'
            : 'linear-gradient(90deg, rgba(24,214,164,0.14) 0%, rgba(24,214,164,0.05) 60%, transparent 100%)';
          return (
            <div
              className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2.5 border-b border-white/[0.06]"
              style={{ background: stripGradient }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" style={{ color: accent }} />
                {/* Mobile: slim one-liner */}
                <p className="sm:hidden text-[11px] text-white/80 truncate">
                  <span className="font-semibold text-white">{planName}</span>
                  {upsell.promoActive && (
                    <>
                      <span className="text-white/55"> · </span>
                      <span className="font-black" style={{ color: accent }}>{upsell.discountPct}% OFF</span>
                    </>
                  )}
                </p>
                {/* Desktop: rich banner with strikethrough regular price */}
                <p className="hidden sm:block text-xs text-white/85 truncate">
                  <span className="font-bold text-white">{planName}</span>
                  <span className="text-white/60">{' '}— {featureLine} ·{' '}</span>
                  {upsell.promoActive && (
                    <>
                      <span
                        className="font-black px-1.5 py-0.5 rounded text-[10px] mr-1.5"
                        style={{
                          background: `${accent}25`,
                          color: accent,
                          border: `1px solid ${accent}55`,
                        }}
                      >
                        {upsell.discountPct}% OFF
                      </span>
                      <span className="text-white/45 line-through mr-1">{upsell.regularPrice}</span>
                    </>
                  )}
                  <span className="font-bold" style={{ color: accent }}>{upsell.price}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2 sm:ml-3">
                <Link
                  to="/billing"
                  className="flex items-center gap-1 sm:gap-1.5 text-[10.5px] sm:text-xs font-bold sm:font-black px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full transition-transform hover:-translate-y-[1px] whitespace-nowrap"
                  style={{
                    background: buttonGradient,
                    color: isAdviserUpsell ? '#FFFFFF' : '#000000',
                    boxShadow: `0 4px 14px -4px ${accent}80`,
                  }}
                >
                  Upgrade <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Link>
                <button
                  onClick={() => setStripDismissed(true)}
                  aria-label="Dismiss upgrade banner"
                  className="text-white/40 hover:text-white/80 transition-colors p-0.5 sm:p-1"
                >
                  <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Content area — extra bottom padding on mobile to clear the curved nav */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[120px] lg:pb-6 custom-scrollbar mobile-scroll-pad">
          <Outlet />
        </div>
      </main>

      <MobileNav onMenuClick={() => setIsDrawerOpen(true)} />
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
}
