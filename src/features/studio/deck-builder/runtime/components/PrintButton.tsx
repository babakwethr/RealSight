import { Printer } from 'lucide-react';

/**
 * Triggers the browser print dialog. The StaticModeProvider auto-
 * applies (via runtime.css's @media print) so animations freeze on
 * their final frame. Lifted from the reference deck.
 */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      title="Save as PDF (Cmd/Ctrl+P)"
      aria-label="Save as PDF"
      className="print:hidden fixed bottom-4 left-3 z-40 hidden h-8 w-8 items-center justify-center rounded-full border border-bone/15 bg-ink-800/70 text-bone/55 backdrop-blur-md transition hover:border-gold/40 hover:text-gold lg:flex"
    >
      <Printer size={13} />
    </button>
  );
}
