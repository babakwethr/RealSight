import { SlideShell } from '../../../components/SlideShell';
import type { SlideProps, CoverData } from '../../../types';

/**
 * Cover slide — full-bleed cinematic photo + centred title/subtitle.
 * Lifted from `secondary-market-deck/src/slides/01-Cover.tsx`.
 *
 * Hardcoded `DECK` constants → driven by `entry.headline / body /
 * data` so this layout works for any topic the adviser picks.
 *
 * `entry.headline` is the big title; `entry.data.subtitle_accent`
 * (optional) renders italic gold as the "Market" emphasis in the
 * original. `entry.body` becomes the bottom subtitle line.
 */
export function CoverSlide({
  isMobile,
  entry,
  branding,
  visual,
}: SlideProps<CoverData>) {
  const data = entry.data ?? {};
  const title = entry.headline ?? data.title ?? '';
  const subtitle = entry.body ?? data.subtitle ?? '';
  const eyebrow = data.eyebrow ?? '';
  const presenter = data.presenter ?? '';
  const dataSource = data.data_source_label ?? 'Dubai Land Department · via RealSight';

  return (
    <SlideShell
      isMobile={isMobile}
      photo={visual}
      scrim="cover"
      logo={branding.logo_url}
      agencyName={branding.agency_name}
    >
      {/* Central spotlight scrim. */}
      <div
        className="absolute inset-0 z-[5]"
        style={{
          background:
            'radial-gradient(ellipse 600px 380px at 50% 47%, rgba(10,10,11,0.82) 0%, rgba(10,10,11,0.4) 52%, rgba(10,10,11,0) 80%)',
        }}
      />

      {eyebrow ? (
        <div className="absolute left-12 top-10 z-10 text-xs uppercase tracking-[0.3em] text-bone/65">
          {eyebrow}
        </div>
      ) : null}

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-12 text-center">
        <div className="mb-6 text-sm uppercase tracking-[0.34em] text-gold">
          Resale &nbsp;·&nbsp; Rental &nbsp;·&nbsp; Strategy
        </div>
        <h1 className="font-serif text-7xl leading-[0.95] tracking-tight text-bone drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)]">
          {title}
        </h1>
        <div className="mt-8 h-px w-24 bg-gold/70" />
        {subtitle ? (
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-bone/85">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="absolute bottom-10 left-12 right-12 z-10 flex items-end justify-between">
        <span className="font-serif text-2xl tracking-wide text-bone">
          {presenter}
        </span>
        <span className="text-xs uppercase tracking-[0.28em] text-bone/65">
          {dataSource}
        </span>
      </div>
    </SlideShell>
  );
}
