import { motion } from 'framer-motion';
import { SlideShell } from '../../../components/SlideShell';
import { CitationChip } from '../../../components/CitationChip';
import { useStaticMode } from '../../../static-mode';
import { formatInt } from '../../../format';
import type { SlideProps, TopVolumeData } from '../../../types';

/**
 * Top sales-volume slide — horizontal bar ranking of areas by
 * primary metric (sales count). Optional secondary (e.g. value in
 * AED B) rendered as a right-side stat. Lifted from `07-Volume.tsx`.
 *
 * Data-bearing — citation chip in the footer line.
 */
export function TopVolumeSlide({
  isMobile,
  entry,
  branding,
  visual,
}: SlideProps<TopVolumeData>) {
  const isStatic = useStaticMode();
  const data = (entry.data ?? {}) as Partial<TopVolumeData>;
  const safeRows = Array.isArray(data.rows) ? data.rows : [];
  const rows = safeRows.slice(0, 5);
  const max = rows.length
    ? Math.max(...rows.map((r) => Number(r.primary) || 0))
    : 1;

  return (
    <SlideShell
      isMobile={isMobile}
      photo={visual}
      scrim="heavy"
      logo={branding.logo_url}
      agencyName={branding.agency_name}
    >
      <div className="absolute left-12 top-10 z-10 text-xs uppercase tracking-[0.3em] text-gold">
        Where the deals are
      </div>

      <div className="absolute left-12 right-12 top-24 z-10">
        <h2 className="max-w-3xl font-serif text-5xl leading-[1.05] text-bone">
          {entry.headline ?? ''}
        </h2>
        {entry.body ? (
          <p className="mt-3 max-w-2xl text-base text-bone/75">{entry.body}</p>
        ) : null}
      </div>

      <div className="absolute inset-x-12 top-[268px] z-10 space-y-5">
        {rows.map((a, i) => {
          const pct = (a.primary / max) * 100;
          const barCls = `h-full rounded-sm ${i === 0 ? 'bg-gold' : 'bg-bone/30'}`;
          return (
            <div key={a.area} className="flex items-center gap-4">
              <span className="w-6 text-right font-serif text-xl text-bone/45">{i + 1}</span>
              <span className="w-56 shrink-0 text-base text-bone">{a.area}</span>
              <div className="relative h-9 flex-1 overflow-hidden rounded-sm bg-ink-700/80">
                {isStatic ? (
                  <div className={barCls} style={{ width: `${pct}%` }} />
                ) : (
                  <motion.div
                    className={barCls}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </div>
              <span className="w-24 text-right font-serif text-2xl text-bone">
                {formatInt(a.primary)}
              </span>
              {a.secondary !== undefined ? (
                <span className="w-28 text-right text-sm uppercase tracking-[0.1em] text-bone/55">
                  AED {a.secondary}B
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-9 left-12 right-12 z-10 border-t border-bone/15 pt-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-bone/45 inline-flex items-center gap-2">
          {data.caption ?? `DLD home sales${data.window_label ? ` · ${data.window_label}` : ''}`}
          <CitationChip citation={entry.citation} />
        </p>
      </div>
    </SlideShell>
  );
}
