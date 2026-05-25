import { motion } from 'framer-motion';
import { useStaticMode } from '../static-mode';

export interface Bar {
  label: string;
  value: number;
  highlight?: boolean;
}

interface BarSeriesProps {
  data: Bar[];
  /** Value mapped to zero height. Lift it to exaggerate a narrow range. */
  baseline?: number;
  /** Plot-area height in px. */
  height?: number;
  /** Show the x-axis label every N bars (first and last always shown). */
  labelEvery?: number;
}

/**
 * Minimal column chart. Bars grow from zero with a staggered cascade
 * when the slide mounts — except in static mode (print / PDF), where
 * they render at final height immediately so the PDF captures
 * finished bars, not mid-animation frames.
 *
 * Lifted verbatim from the reference deck (only the import path of
 * useStaticMode differs).
 */
export function BarSeries({ data, baseline = 0, height = 260, labelEvery = 1 }: BarSeriesProps) {
  const isStatic = useStaticMode();
  const max = Math.max(...data.map((d) => d.value));
  const span = max - baseline || 1;
  const last = data.length - 1;

  return (
    <div className="w-full">
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => {
          const pct = Math.max(0.03, (d.value - baseline) / span);
          const cls = `w-full origin-bottom rounded-[2px] ${
            d.highlight ? 'bg-gold' : 'bg-bone/25'
          }`;
          return (
            <div key={i} className="flex flex-1 items-end self-stretch">
              {isStatic ? (
                <div className={cls} style={{ height: `${pct * 100}%` }} />
              ) : (
                <motion.div
                  className={cls}
                  style={{ height: `${pct * 100}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    duration: 0.65,
                    delay: 0.15 + i * 0.035,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex gap-[3px]">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[11px] uppercase tracking-[0.1em] text-bone/55"
          >
            {i % labelEvery === 0 || i === last ? d.label : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
