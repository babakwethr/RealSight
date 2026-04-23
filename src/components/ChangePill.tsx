/**
 * ChangePill — compact % change indicator.
 *
 * Emerald for positive, red for negative. Lucide arrow icon + tabular numeric
 * readout. Auto-detects sign from the value, or pass `tone` to override
 * (useful when a negative number should read as "good", e.g. a drop in DOM).
 *
 * Ported from the RealSight design package (rs-primitives.jsx · ChangePill)
 * and adapted for the RealSight codebase (lucide icons, Tailwind, TS).
 *
 * Example:
 *   <ChangePill value={14.2} />           // +14.2% emerald
 *   <ChangePill value="-3%" />            // -3.0%  red
 *   <ChangePill value={-12} tone="good" /> // -12.0% emerald (DOM dropped → good)
 */
import { ArrowUp, ArrowDown } from 'lucide-react';

export type ChangeTone = 'auto' | 'good' | 'bad' | 'neutral';

interface ChangePillProps {
  /** Numeric change, or a string like "+12.4%" / "-3%". */
  value: number | string;
  /** Font size in px — also scales padding. Defaults 10. */
  size?: number;
  /** Color tone override. `auto` picks emerald for ≥0 and red for <0. */
  tone?: ChangeTone;
  /** Number of decimals shown. Defaults to 1. */
  decimals?: number;
  /** Extra className for layout tweaks. */
  className?: string;
  /** Hide the arrow icon. */
  hideIcon?: boolean;
}

function parseValue(v: number | string): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/[^-\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const PALETTE = {
  good:    { bg: 'rgba(16,227,176,0.12)',  fg: '#10E3B0' },
  bad:     { bg: 'rgba(255,85,119,0.12)',  fg: '#FCA5A5' },
  neutral: { bg: 'rgba(232,244,255,0.06)', fg: '#B8C9DC' },
} as const;

export function ChangePill({
  value,
  size = 10,
  tone = 'auto',
  decimals = 1,
  className,
  hideIcon = false,
}: ChangePillProps) {
  const n = parseValue(value);
  const up = n >= 0;
  const resolvedTone: Exclude<ChangeTone, 'auto'> =
    tone === 'auto' ? (up ? 'good' : 'bad') : tone;
  const { bg, fg } = PALETTE[resolvedTone];

  const Arrow = up ? ArrowUp : ArrowDown;
  const iconSize = Math.max(8, size);
  const padY = size < 11 ? 2 : 3;
  const padX = size < 11 ? 6 : 8;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: `${padY}px ${padX}px`,
        borderRadius: 999,
        fontSize: size,
        fontWeight: 700,
        background: bg,
        color: fg,
        letterSpacing: 0.2,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {!hideIcon && <Arrow size={iconSize} strokeWidth={2.2} />}
      {up ? '+' : ''}
      {n.toFixed(decimals)}%
    </span>
  );
}

export default ChangePill;
