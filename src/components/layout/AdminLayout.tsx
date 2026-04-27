import { Outlet, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { UpsellBanner } from '@/components/UpsellBanner';
import { useTenant } from '@/hooks/useTenant';

/**
 * AdminLayout — the back-office shell.
 *
 * Per founder QA 27 Apr 2026: previously this layout swapped to a separate
 * `AdminSidebar`, which was disorienting — entering an /admin/* page felt
 * like switching to a different app. Now we render the SAME `AppSidebar`
 * everywhere; admin items live as their own colour-accented section in the
 * unified rail. The only thing that changes between user and admin views is
 * the page content + the small "Admin Mode" context banner at the top so
 * you always know which hat you're wearing.
 *
 * Per LAUNCH_PLAN.md §13.3: white-label features are gated behind Adviser Pro.
 * `<UpsellBanner feature="white-label" />` returns null automatically once the
 * tenant is on Adviser Pro, so paying admins see no banner.
 */
export function AdminLayout() {
  const location = useLocation();
  const { tenant } = useTenant();

  // Friendly section title from the URL — "Admin Mode · Investors" reads
  // less like a generic shell and more like the page you're actually on.
  const sectionTitle = (() => {
    const seg = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
    if (!seg) return 'Workspace';
    return seg
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  })();

  return (
    <div className="min-h-screen cinematic-bg flex w-full">
      {/* Same persistent sidebar as the rest of the app. Admin items appear
          inline in their own colour-accented section. */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AppSidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Admin-mode context strip — sticky so it's always in peripheral
            vision while you scroll. Subtle violet accent matches the
            sidebar's "Admin" section so the visual link reads instantly. */}
        <div
          className="sticky top-0 z-30 px-4 sm:px-6 py-2.5 flex items-center gap-3 border-b border-[#7B5CFF]/15 backdrop-blur-md"
          style={{
            background:
              'linear-gradient(90deg, rgba(123,92,255,0.10) 0%, rgba(123,92,255,0.04) 50%, transparent 100%)',
          }}
        >
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.18em] bg-[#7B5CFF]/15 text-[#b6a4ff] border border-[#7B5CFF]/30">
            <Shield className="h-3 w-3" />
            Admin Mode
          </span>
          <span className="text-sm font-semibold text-foreground/90 truncate">
            {sectionTitle}
          </span>
          {tenant?.broker_name ? (
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">
              · {tenant.broker_name}
            </span>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-4">
            <UpsellBanner feature="white-label" variant="compact" />
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
