import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Slim "you're offline" banner.
 *
 * RealSight needs a connection for live data + AI. When the device drops
 * offline we surface a calm, fixed banner so the user understands why a
 * screen isn't loading — instead of a silent spinner or empty state that
 * reads as "broken" (App Store Guideline 2.1). Reappears/disappears live
 * via the browser online/offline events. No-op when online.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    // Sync once in case state changed before listeners attached.
    setOffline(navigator.onLine === false);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[2147483646] flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-semibold text-white"
      style={{
        background: 'linear-gradient(90deg, #b45309 0%, #92400e 100%)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        boxShadow: '0 6px 20px -8px rgba(0,0,0,0.6)',
      }}
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>You&apos;re offline — some features need an internet connection.</span>
    </div>
  );
}
