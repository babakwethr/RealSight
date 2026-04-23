/**
 * Spark — tiny inline sparkline (SVG, no deps).
 *
 * Lightweight cousin of `PortfolioSparkline` in `components/charts/`.
 * Use this one for row-level / card-level micro-trends where a full
 * recharts surface is overkill — deal rows, ticker bands, KPI footers.
 *
 * Stroke defaults to emerald `#10E3B0`. Pass any brand hex to tint.
 * The subtle under-fill is on by default; disable with `fill={false}`.
 *
 * Ported from the RealSight design package (rs-primitives.jsx · Spark)
 * and converted to TypeScript + SSR-safe unique ids via `useId`.
 *
 * Example:
 *   <Spark data={[820, 870, 910, 880, 960, 1020, 990]} />
 *   <Spark data={prices} stroke="#7B5CFF" glow w={120} h={36} />
 */
import { useId } from 'react';

interface SparkProps {
  /** Numeric series (≥ 2 points). */
  data: readonly number[];
  /** Width in px. Defaults 80. */
  w?: number;
  /** Height in px. Defaults 28. */
  h?: number;
  /** Stroke color. Defaults emerald #10E3B0. */
  stroke?: string;
  /** Show the gradient under-fill. Defaults true. */
  fill?: boolean;
  /** Add a soft drop-shadow glow on the stroke. Defaults false. */
  glow?: boolean;
  /** Stroke width. Defaults 1.6. */
  strokeWidth?: number;
  /** Extra className on the SVG. */
  className?: string;
  /** A11y label (announced to screen readers). */
  ariaLabel?: string;
}

export function Spark({
  data,
  w = 80,
  h = 28,
  stroke = '#10E3B0',
  fill = true,
  glow = false,
  strokeWidth = 1.6,
  className,
  ariaLabel,
}: SparkProps) {
  const gradId = useId().replace(/:/g, '');

  if (!data || data.length < 2) {
    return <svg width={w} height={h} className={className} aria-hidden />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i): [number, number] => [
    i * step,
    h - ((v - min) / range) * (h - 4) - 2,
  ]);
  const d = pts
    .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ');
  const fillD = `${d} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg
      width={w}
      height={h}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={fillD} fill={`url(#${gradId})`} />}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={glow ? { filter: `drop-shadow(0 0 4px ${stroke})` } : undefined}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default Spark;
