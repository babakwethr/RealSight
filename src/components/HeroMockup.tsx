import { PhoneFrame } from './PhoneFrame';

/**
 * HeroMockup — the Reelly-AI-style hero composite.
 *
 *   • A tilted iPhone PhoneFrame in the centre, displaying a real RealSight
 *     screenshot.
 *   • Floating circular brand-badge "discs" arranged around the phone (DLD,
 *     Bayut, Property Finder, Dubizzle, plus colour discs for partners
 *     whose logos we don't ship in /public/brand yet).
 *   • Cosmic backdrop — mint glow top-left, violet glow bottom-right,
 *     anchored on the deep-navy app background.
 *
 * Used on:
 *   • Public landing (`/`) hero slot
 *   • Studio hub hero (later)
 *
 * No imagery generated at runtime — the phone screenshot is pre-captured,
 * brand logos are committed PNGs, the rest is CSS.
 */

interface BrandDiscProps {
  /** Image src OR a single-letter fallback (when we don't have the logo file yet). */
  src?: string;
  letter?: string;
  /** Background colour when using a letter (matches the brand's primary colour). */
  bg?: string;
  /** Letter colour. */
  fg?: string;
  /** Size in px. */
  size: number;
  /** Tailwind position classes — e.g. "top-12 left-4" — relative to the parent container. */
  position: string;
  /** Optional extra className for animation, etc. */
  className?: string;
}

function BrandDisc({ src, letter, bg = '#fff', fg = '#0a0420', size, position, className = '' }: BrandDiscProps) {
  return (
    <div
      className={`absolute z-20 ${position} ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
        style={{
          background: src ? '#fff' : bg,
          boxShadow:
            '0 12px 28px -8px rgba(0, 0, 0, 0.55),' +
            'inset 0 1px 0 rgba(255, 255, 255, 0.4),' +
            '0 0 0 1px rgba(255, 255, 255, 0.10)',
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-3/4 h-3/4 object-contain select-none"
            draggable={false}
          />
        ) : (
          <span
            className="font-black select-none"
            style={{
              color: fg,
              fontSize: size * 0.42,
              letterSpacing: '-0.04em',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {letter}
          </span>
        )}
      </div>
    </div>
  );
}

interface HeroMockupProps {
  /** Path to the screenshot to render inside the phone. */
  screenshotSrc: string;
  /** Alt for the screenshot. */
  screenshotAlt: string;
  /** Optional override for the phone width. Default 280px. */
  phoneWidth?: number;
  /** Render the screenshot eagerly — used for the above-the-fold hero. */
  priority?: boolean;
}

export function HeroMockup({
  screenshotSrc,
  screenshotAlt,
  phoneWidth = 280,
  priority = false,
}: HeroMockupProps) {
  return (
    <div
      className="relative w-full mx-auto"
      style={{
        // Reserve enough room for the floating discs around the phone
        maxWidth: 760,
        minHeight: phoneWidth * 1.95,
      }}
    >
      {/* Cosmic backdrop — mint glow top-left, violet glow bottom-right */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className="absolute -top-12 left-1/4 rounded-full blur-3xl"
          style={{
            width: phoneWidth * 1.2,
            height: phoneWidth * 1.2,
            background: 'radial-gradient(circle, rgba(46, 255, 192, 0.28), transparent 65%)',
          }}
        />
        <div
          className="absolute -bottom-8 right-1/4 rounded-full blur-3xl"
          style={{
            width: phoneWidth * 1.4,
            height: phoneWidth * 1.4,
            background: 'radial-gradient(circle, rgba(123, 92, 255, 0.22), transparent 65%)',
          }}
        />
      </div>

      {/* Floating brand discs — arranged organically around the phone, not symmetric.
          Sizes vary per Reelly's design language (premium / lived-in feel). */}
      {/* Top-left cluster */}
      <BrandDisc letter="E" bg="#0a0420" fg="#fff" size={64} position="top-4 left-4 sm:top-6 sm:left-12" />
      <BrandDisc letter="N" bg="#18a085" fg="#fff" size={48} position="top-32 left-2 sm:top-36 sm:left-6" />

      {/* Right cluster */}
      <BrandDisc letter="D" bg="#FF1F1F" fg="#fff" size={68} position="top-12 right-4 sm:top-14 sm:right-12" />
      <BrandDisc letter="S" bg="#000" fg="#FFD700" size={56} position="top-48 right-2 sm:top-52 sm:right-6" />

      {/* Bayut, Property Finder, Dubizzle (real logos we have committed) */}
      <BrandDisc src="/brand/bayut.png" size={56} position="bottom-32 left-6 sm:bottom-36 sm:left-16" />
      <BrandDisc src="/brand/propertyfinder.png" size={64} position="bottom-12 right-8 sm:bottom-16 sm:right-20" />
      <BrandDisc src="/brand/dubizzle.png" size={48} position="bottom-4 left-1/3 sm:bottom-8 sm:left-1/3" />

      {/* Phone — centered. Slight tilt for the Reelly-style aesthetic. */}
      <div
        className="relative z-10 mx-auto pt-6 sm:pt-8"
        style={{ width: phoneWidth }}
      >
        <PhoneFrame
          src={screenshotSrc}
          alt={screenshotAlt}
          tilt={-4}
          width={phoneWidth}
          priority={priority}
        />
      </div>
    </div>
  );
}
