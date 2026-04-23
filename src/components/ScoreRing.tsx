/**
 * ScoreRing — signature Market Pulse gradient ring.
 *
 * Circular progress ring with an emerald → blue → violet gradient stroke,
 * a center numeric readout, and a small uppercase label underneath.
 *
 * Ported from the RealSight design package (rs-primitives.jsx · ScoreRing).
 * Use it as the hero metric on MarketIntelligence, Deal Analyzer verdicts,
 * Portfolio health, and anywhere a 0–N scored value needs a premium feel.
 *
 * Example:
 *   <ScoreRing score={7.8} label="Market Score" />
 *   <ScoreRing score={82} max={100} label="Deal Score" size={140} />
 */
import { useId } from 'react';

interface ScoreRingProps {
  /** The current score. */
  score: number;
  /** Upper bound — defaults to 10 (matches design package). */
  max?: number;
  /** Outer diameter in px. Defaults to 120. */
  size?: number;
  /** Stroke thickness in px. Defaults to 8. */
  thick?: number;
  /** Uppercase label below the score. Defaults to "Market Score". */
  label?: string;
  /** Override the gradient stops (3-stop). Defaults emerald → blue → violet. */
  gradient?: readonly [string, string, string];
  /** Number of decimals shown in the center value. Defaults to 1. */
  decimals?: number;
  /** Optional className on the wrapping div. */
  className?: string;
}

export function ScoreRing({
  score,
  max = 10,
  size = 120,
  thick = 8,
  label = 'Market Score',
  gradient = ['#10E3B0', '#4AA8FF', '#7B5CFF'] as const,
  decimals = 1,
  className,
}: ScoreRingProps) {
  const r = size / 2 - thick;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / max));
  const offset = circumference * (1 - pct);
  // useId → stable SSR-safe unique gradient id
  const gradId = useId().replace(/:/g, '');
  const centerFontSize = size * 0.3;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size }}
      role="img"
      aria-label={`${label}: ${score.toFixed(decimals)} out of ${max}`}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradient[0]} />
            <stop offset="60%" stopColor={gradient[1]} />
            <stop offset="100%" stopColor={gradient[2]} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(232,244,255,0.06)"
          strokeWidth={thick}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={thick}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: 'drop-shadow(0 0 8px rgba(16,227,176,0.4))' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="font-display"
          style={{
            fontSize: centerFontSize,
            fontWeight: 700,
            letterSpacing: -1,
            color: '#E8F4FF',
            lineHeight: 1,
          }}
        >
          {score.toFixed(decimals)}
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#7D8FA3',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

export default ScoreRing;
