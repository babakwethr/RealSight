const LOGO_WHITE = '/assets/realsight/realsight-logo-white.svg';
const LOGO_BLACK = '/assets/realsight/realsight-logo-black.svg';

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
  return (
    <img
      src={src}
      alt={alt}
      className={sizeClass}
      draggable={false}
    />
  );
}
