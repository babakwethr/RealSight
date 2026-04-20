import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

/**
 * AdminLayout — matches AppLayout pattern per DESIGN.md
 * Sticky sidebar (pushes content, no overlay). Same cinematic background.
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
          <Outlet />
        </div>
      </main>
    </div>
  );
}
