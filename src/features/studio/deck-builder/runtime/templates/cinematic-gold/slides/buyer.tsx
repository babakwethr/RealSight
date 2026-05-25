import { SlideShell } from '../../../components/SlideShell';
import type { SlideProps, BuyerData } from '../../../types';

/**
 * Buyer / persona-framework slide — two cards (resident vs overseas
 * in the original, but any 2 types now) with a tag, qualifying line,
 * and a list of plays. Lifted from `06-Buyer.tsx`.
 *
 * Not data-bearing — no citation chip.
 */
export function BuyerSlide({
  isMobile,
  entry,
  branding,
  visual,
}: SlideProps<BuyerData>) {
  const data = entry.data ?? { rows: [] };
  const rows = data.rows.slice(0, 2);

  return (
    <SlideShell
      isMobile={isMobile}
      photo={visual}
      scrim="medium"
      logo={branding.logo_url}
      agencyName={branding.agency_name}
    >
      <div className="absolute left-12 top-10 z-10 text-xs uppercase tracking-[0.3em] text-gold">
        Know your buyer
      </div>

      <div className="absolute left-12 right-12 top-24 z-10">
        <h2 className="max-w-3xl font-serif text-5xl leading-[1.05] text-bone">
          {entry.headline ?? ''}
        </h2>
        {entry.body ? (
          <p className="mt-3 max-w-2xl text-base text-bone/75">{entry.body}</p>
        ) : null}
      </div>

      <div className="absolute inset-x-12 top-[262px] z-10 grid grid-cols-2 gap-6">
        {rows.map((b, i) => (
          <div
            key={b.type}
            className={`flex min-h-[268px] flex-col rounded-sm border p-6 backdrop-blur-md ${
              i === 0
                ? 'border-bone/15 bg-ink-900/75'
                : 'border-gold/40 bg-gold/[0.08]'
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className={`font-serif text-3xl ${i === 0 ? 'text-bone' : 'text-gold'}`}>
                {b.type}
              </span>
              <span className="shrink-0 rounded-sm border border-bone/25 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-bone/70">
                {b.tag}
              </span>
            </div>
            <p className="mt-4 text-base leading-relaxed text-bone/80">{b.qualify}</p>
            <div className="mt-auto space-y-2.5 border-t border-bone/15 pt-4">
              {b.plays.map((p) => (
                <div key={p} className="flex items-start gap-3">
                  <span className="mt-1 text-gold">▸</span>
                  <span className="text-base text-bone/85">{p}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}
