import { Maximize } from 'lucide-react';

/**
 * Toggles browser fullscreen. Sits above the PrintButton, bottom-left.
 * Hidden on mobile (the iOS / Capacitor shell handles fullscreen
 * differently). Lifted from the reference deck.
 */
export function FullscreenButton() {
  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };
  return (
    <button
      onClick={toggle}
      title="Fullscreen (F)"
      aria-label="Toggle fullscreen"
      className="print:hidden fixed bottom-[52px] left-3 z-40 hidden h-8 w-8 items-center justify-center rounded-full border border-bone/15 bg-ink-800/70 text-bone/55 backdrop-blur-md transition hover:border-gold/40 hover:text-gold lg:flex"
    >
      <Maximize size={13} />
    </button>
  );
}
