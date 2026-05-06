/**
 * PhoneFrame — reusable iPhone-style mockup frame around a screenshot.
 *
 * Designed for the imagery rollout (see plan):
 *   - Used by `HeroMockup` and `FeatureHighlight` to display real captured
 *     RealSight screens inside a phone-shaped frame.
 *   - Pure CSS — no external dependencies. The frame is a rounded rectangle
 *     with a black bezel, a notch at the top, and a soft drop shadow.
 *   - Rotation is supported so the phone can be tilted ~12° in hero
 *     compositions (Reelly-AI reference style).
 *
 * The content of the phone is always a real screenshot — never a generated
 * fake UI (per the "premium principles" section of the plan).
 */

interface PhoneFrameProps {
  /** Image source — typically a captured RealSight screen at iPhone-class resolution. */
  src: string;
  /** Alt text for accessibility. */
  alt: string;
  /** Tilt angle in degrees. 0 for upright, 12 for the Reelly-style hero tilt. */
  tilt?: number;
  /** Pixel width of the phone. Aspect ratio is 9:19 (iPhone 14 Pro). */
  width?: number;
  /** Optional Tailwind className additions. */
  className?: string;
  /** Render eagerly for above-the-fold heroes. Default lazy. */
  priority?: boolean;
}

export function PhoneFrame({
  src,
  alt,
  tilt = 0,
  width = 280,
  className = '',
  priority = false,
}: PhoneFrameProps) {
  // Aspect ratio matches the iPhone 14 Pro physical screen
  // (9:19.5 — close enough for visual fidelity).
  const aspectRatio = '9 / 19.5';

  return (
    <div
      className={`relative ${className}`}
      style={{ width, aspectRatio, perspective: '1200px' }}
    >
      {/* Outer bezel — black with a hairline white border for the "metal rim" feel */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          borderRadius: width * 0.16, // ~44px on a 280px-wide frame
          background: '#0a0420',
          border: `${Math.max(6, width * 0.026)}px solid #0a0420`,
          boxShadow:
            // Outer drop shadow grounds the phone above the page
            '0 40px 80px -20px rgba(0, 0, 0, 0.7),' +
            // Subtle highlight on the top edge — light catching the bezel
            'inset 0 1px 0 rgba(255, 255, 255, 0.08),' +
            // Hairline outer ring for the "Apple aluminum" look
            '0 0 0 1px rgba(255, 255, 255, 0.06)',
          transform: tilt !== 0 ? `rotate(${tilt}deg)` : undefined,
          transformOrigin: 'center center',
        }}
      >
        {/* Dynamic Island / notch */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{
            top: width * 0.025, // ~7px on a 280px-wide frame
            width: width * 0.32, // ~90px
            height: width * 0.085, // ~24px
            background: '#000',
            borderRadius: 999,
          }}
        />

        {/* Screen — the actual screenshot */}
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-top select-none"
          draggable={false}
        />

        {/* Specular reflection — soft white sheen from top-left to give a glassy feel */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            background:
              'linear-gradient(155deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 28%)',
          }}
        />
      </div>
    </div>
  );
}
