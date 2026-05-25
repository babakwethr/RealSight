import { SlideShell } from '../../../components/SlideShell';
import type { SlideProps, WhyNowData } from '../../../types';

/**
 * "Why now" / narrative-setup slide — paragraphs of context that
 * frame the deck before the data arrives.
 *
 * Lifted from `secondary-market-deck/src/slides/02-Shift.tsx` but
 * generalised — the reference deck used a "from / to" two-panel
 * layout; this generic version renders 1-3 paragraphs in a clean
 * column so the LLM can produce any narrative setup.
 *
 * `entry.headline` = big title; `entry.data.paragraphs` = body.
 */
export function WhyNowSlide({
  isMobile,
  entry,
  branding,
  visual,
}: SlideProps<WhyNowData>) {
  const data = entry.data ?? { paragraphs: [] };
  const paragraphs = data.paragraphs.length
    ? data.paragraphs
    : entry.body
      ? [entry.body]
      : [];

  return (
    <SlideShell
      isMobile={isMobile}
      photo={visual}
      scrim="medium"
      logo={branding.logo_url}
      agencyName={branding.agency_name}
    >
      <div className="absolute left-12 top-10 z-10 text-xs uppercase tracking-[0.3em] text-gold">
        Why now
      </div>

      <div className="absolute left-12 right-12 top-24 z-10">
        <h2 className="max-w-3xl font-serif text-5xl leading-[1.05] text-bone">
          {entry.headline ?? ''}
        </h2>
      </div>

      <div className="absolute inset-x-12 top-[250px] z-10 max-w-[760px] space-y-5">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-lg leading-relaxed text-bone/85 first-letter:font-serif first-letter:text-3xl first-letter:text-gold/90"
          >
            {p}
          </p>
        ))}
      </div>
    </SlideShell>
  );
}
