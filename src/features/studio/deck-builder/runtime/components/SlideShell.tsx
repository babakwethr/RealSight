import type { ReactNode } from 'react';
import { SlideBackground } from './SlideBackground';

interface SlideShellProps {
  children: ReactNode;
  className?: string;
  isMobile?: boolean;
  /** Optional full-bleed cinematic photo background. */
  photo?: string;
  scrim?: 'cover' | 'light' | 'medium' | 'heavy';
  /** Agency logo URL — top-right corner mark. Optional; some templates
   *  (Investor Brief) leave it off. */
  logo?: string;
  /** Tenant agency name — alt text for the logo. */
  agencyName?: string;
}

/**
 * Slide canvas. Two layouts:
 *  - Desktop: absolute inset-0, fills the viewport (driven by Stage.tsx).
 *  - Mobile / print: relative h-screen, stacks vertically.
 *
 * The print stylesheet pins `.slide-print` to a fixed 1280×800 canvas
 * and clips overflow, so each slide becomes exactly one A4-landscape
 * page.
 *
 * Lifted from the reference deck. One adaptation: the agency logo is
 * a prop (`logo`) instead of a hardcoded `XR_LOGO` import — that's
 * how white-label per-tenant branding flows in.
 */
export function SlideShell({
  children,
  className = '',
  isMobile = false,
  photo,
  scrim,
  logo,
  agencyName,
}: SlideShellProps) {
  const layout = isMobile
    ? 'relative h-screen min-h-[600px] w-full'
    : 'absolute inset-0';

  return (
    <section className={`slide-print ${layout} overflow-hidden bg-ink-900 ${className}`}>
      {photo ? <SlideBackground photo={photo} scrim={scrim} /> : null}
      {children}
      {logo ? (
        <img
          src={logo}
          alt={agencyName || 'Agency logo'}
          className="absolute right-11 top-9 z-20 h-[26px] w-[26px] opacity-90 object-contain"
        />
      ) : null}
    </section>
  );
}
