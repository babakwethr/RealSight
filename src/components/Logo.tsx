// Vercel serves /assets/* with 1-year immutable caching, so cache-bust by
// bumping the version query string whenever the SVG file is updated.
const LOGO_VERSION = '2';
const LOGO_WHITE = `/assets/realsight/realsight-logo-white.svg?v=${LOGO_VERSION}`;
const LOGO_BLACK = `/assets/realsight/realsight-logo-black.svg?v=${LOGO_VERSION}`;

interface LogoProps {
  variant?: 'white' | 'black';
  className?: string;
  alt?: string;
  // legacy props — silently ignored
  showTagline?: boolean;
  height?: string;
}

export function Logo({ variant = 'white', className, height, alt = 'RealSight' }: LogoProps) {
  const src = variant === 'black' ? LOGO_BLACK : LOGO_WHITE;
  const sizeClass = className ?? (height ? `${height} w-auto` : 'h-8 w-auto');
  // `block` removes the descender gap that `<img>` ships with by default,
  // so flex `items-center` actually lands the wordmark on the row's centre line.
  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClass} block select-none`}
      draggable={false}
    />
  );
}
