import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { MobileDrawer } from './MobileDrawer';
import { useSubscription } from '@/hooks/useSubscription';
import { Sparkles, ArrowRight, X } from 'lucide-react';

export function AppLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [stripDismissed, setStripDismissed] = useState(false);
  const { plan, loading } = useSubscription();
  const showUpgradeBanner = !loading && plan === 'free' && !stripDismissed;

  return (
    <div className="relative min-h-screen cinematic-bg flex w-full overflow-hidden">
      {/* Ambient aurora — layered on top of cinematic-bg for extra depth on both mobile + desktop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute -top-40 -left-24 w-[36rem] h-[36rem] rounded-full bg-[#2d5cff]/18 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 w-[36rem] h-[36rem] rounded-full bg-[#18d6a4]/14 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[24rem] h-[24rem] rounded-full bg-[#7a5cff]/12 blur-[100px]" />
      </div>

      {/* Desktop Sidebar */}
      <div className="relative hidden lg:block shrink-0 sticky top-0 h-screen z-20">
        <AppSidebar />
      </div>

      <main className="relative flex-1 flex flex-col min-h-screen min-w-0 z-10">
        {/* Upgrade strip — slim on mobile, richer on desktop */}
        {showUpgradeBanner && (
          <div
            className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2.5 border-b border-white/[0.06]"
            style={{
              background:
                'linear-gradient(90deg, rgba(24,214,164,0.14) 0%, rgba(24,214,164,0.05) 60%, transparent 100%)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#2effc0] shrink-0" />
              {/* Mobile: slim one-liner */}
              <p className="sm:hidden text-[11px] text-white/80 truncate">
                <span className="font-semibold text-white">Portfolio Pro</span>
                <span className="text-white/55"> · </span>
                <span className="text-[#2effc0] font-semibold">30 days free</span>
              </p>
              {/* Desktop: rich banner */}
              <p className="hidden sm:block text-xs text-white/85 truncate">
                <span className="font-bold text-white">Portfolio Pro</span>
                <span className="text-white/60">
                  {' '}
                  — Market Intelligence · Deal Analyzer PDF · Dubai Heatmap ·{' '}
                </span>
                <span className="text-[#2effc0] font-bold">30 days free trial</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2 sm:ml-3">
              <Link
                to="/billing"
                className="flex items-center gap-1 sm:gap-1.5 text-[10.5px] sm:text-xs font-bold sm:font-black text-black px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full transition-transform hover:-translate-y-[1px] whitespace-nowrap"
                style={{
                  background:
                    'linear-gradient(90deg,#2effc0 0%, #18d6a4 55%, #059669 100%)',
                  boxShadow: '0 4px 14px -4px rgba(24,214,164,0.45)',
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
        )}

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
