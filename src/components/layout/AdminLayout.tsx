import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { UpsellBanner } from '@/components/UpsellBanner';

/**
 * AdminLayout — matches AppLayout pattern per DESIGN.md
 * Sticky sidebar (pushes content, no overlay). Same cinematic background.
 *
 * Per LAUNCH_PLAN.md §13.3 — white-label / invite-clients are Adviser Pro features.
 * The UpsellBanner here returns null automatically once the tenant is on Adviser Pro
 * (or trial), so paid admins see nothing. Free / unpaid admins see the upgrade prompt
 * sitting above every admin page until they convert. We don't HARD-block route access
 * (so the master RealSight back-office keeps working) — the banner is a soft nudge.
 */
export function AdminLayout() {
  return (
    <div className="min-h-screen cinematic-bg flex w-full">
      {/* Sticky sidebar — pushes content */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AdminSidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
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
