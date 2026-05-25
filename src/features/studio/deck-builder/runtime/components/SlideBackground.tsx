interface SlideBackgroundProps {
  /** Image URL — from `studio_decks.visuals[index].src` (upload or
   *  curated stock). The reference deck imported these as static
   *  asset URLs; here they come from props. */
  photo: string;
  /** How dark to wash the photo — heavier on data slides for legibility. */
  scrim?: 'cover' | 'light' | 'medium' | 'heavy';
}

// Vertical scrims: dark at top (eyebrow + headline) and bottom (takeaway),
// clearer through the middle so the photo still reads.
const SCRIM: Record<NonNullable<SlideBackgroundProps['scrim']>, string> = {
  cover:
    'linear-gradient(180deg, rgba(10,10,11,0.82) 0%, rgba(10,10,11,0) 18%, rgba(10,10,11,0) 80%, rgba(10,10,11,0.9) 100%)',
  light:
    'linear-gradient(180deg, rgba(10,10,11,0.74) 0%, rgba(10,10,11,0.20) 33%, rgba(10,10,11,0.24) 64%, rgba(10,10,11,0.82) 100%)',
  medium:
    'linear-gradient(180deg, rgba(10,10,11,0.88) 0%, rgba(10,10,11,0.46) 40%, rgba(10,10,11,0.50) 70%, rgba(10,10,11,0.91) 100%)',
  heavy:
    'linear-gradient(180deg, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.83) 42%, rgba(10,10,11,0.85) 70%, rgba(10,10,11,0.96) 100%)',
};

/**
 * Full-bleed cinematic photo background with a slow Ken-Burns zoom
 * and a darkening scrim. Lifted from the reference deck — only
 * change is `photo` is now a prop, not a static import.
 */
export function SlideBackground({ photo, scrim = 'medium' }: SlideBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink-900">
      <div
        className="ken-burns absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${photo})`,
          filter: 'brightness(1.2) saturate(1.28) contrast(1.04)',
        }}
      />
      <div className="absolute inset-0" style={{ background: SCRIM[scrim] }} />
      {scrim !== 'cover' ? <div className="absolute inset-0 vignette" /> : null}
    </div>
  );
}
