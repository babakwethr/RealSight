/**
 * HeroMetricCard — reusable gradient hero card.
 *
 * Used across pages to give each one its own "brand colour" card while
 * keeping the same hierarchy (badge · label · metric · verdict · progress).
 *
 * Variants map to a gradient + accent colour. Pick a different variant per
 * page so the app feels layered, not monotonous.
 *
 * Palette: Design Package v4 — variants now map to the named gradient
 * library in `src/index.css` (.grad-hero-*). Props unchanged; call sites
 * across the app keep working with the new palette automatically.
 */
import { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export type HeroVariant =
  | 'blue' | 'mint' | 'purple' | 'amber' | 'rose' | 'cyan' | 'sunset' | 'night';

interface VariantStyle {
  gradient: string;
  accent: string;       // bright accent (verdict text, progress fill)
  softAccent: string;   // soft version for decorations (ring borders)
  textOnGradient: string;
}

/**
 * Design Package v4 mapping.
 * - `blue`   → grad-hero-aurora (blue → violet + violet glow). Default for MarketHome.
 * - `mint`   → grad-hero-emerald. Default for MarketIntelligence (Dubai-wide).
 * - `purple` → grad-hero-violet. Default for Portfolio.
 * - `amber`  → grad-hero-gold. Premium / Adviser Pro surfaces.
 * - `rose`   → design sunset (rose → violet → blue).
 * - `cyan`   → grad-hero-blue (deep blue, info tone). Default for MarketIntelligence (area).
 * - `sunset` → warm orange (kept distinct from rose for legacy call sites).
 * - `night`  → aurora-soft (near-black with violet + emerald glow).
 */
const VARIANTS: Record<HeroVariant, VariantStyle> = {
  blue: {
    gradient:
      'radial-gradient(ellipse 60% 80% at 80% 40%, rgba(123,92,255,0.45), transparent 60%), linear-gradient(105deg, #2A4BAE 0%, #3B6CE8 42%, #6F6AF6 100%)',
    accent: '#10E3B0',
    softAccent: 'rgba(255,255,255,0.18)',
    textOnGradient: '#FFFFFF',
  },
  mint: {
    gradient:
      'radial-gradient(ellipse 60% 80% at 80% 40%, rgba(16,227,176,0.45), transparent 60%), linear-gradient(115deg, #063F35 0%, #0AC291 48%, #10E3B0 100%)',
    accent: '#FFFFFF',
    softAccent: 'rgba(255,255,255,0.22)',
    textOnGradient: '#FFFFFF',
  },
  purple: {
    gradient:
      'radial-gradient(ellipse 60% 80% at 20% 30%, rgba(74,168,255,0.38), transparent 55%), linear-gradient(135deg, #1A1640 0%, #3D2A8A 45%, #7B5CFF 100%)',
    accent: '#10E3B0',
    softAccent: 'rgba(255,255,255,0.18)',
    textOnGradient: '#FFFFFF',
  },
  amber: {
    gradient:
      'radial-gradient(ellipse 70% 80% at 70% 30%, rgba(245,180,51,0.35), transparent 60%), linear-gradient(120deg, #2A1E0D 0%, #8C6B1F 50%, #C9A84C 100%)',
    accent: '#FFFFFF',
    softAccent: 'rgba(255,255,255,0.22)',
    textOnGradient: '#FFFFFF',
  },
  rose: {
    gradient: 'linear-gradient(115deg, #FF5577 0%, #7B5CFF 55%, #4AA8FF 100%)',
    accent: '#FFFFFF',
    softAccent: 'rgba(255,255,255,0.22)',
    textOnGradient: '#FFFFFF',
  },
  cyan: {
    gradient: 'linear-gradient(120deg, #08213D 0%, #1F5BA6 45%, #4AA8FF 100%)',
    accent: '#10E3B0',
    softAccent: 'rgba(255,255,255,0.20)',
    textOnGradient: '#FFFFFF',
  },
  sunset: {
    // Warm orange/amber — kept distinct from `rose` for legacy variety.
    gradient:
      'radial-gradient(ellipse 70% 80% at 70% 30%, rgba(245,180,51,0.30), transparent 60%), linear-gradient(135deg, #7C2D12 0%, #F97316 55%, #FDBA74 100%)',
    accent: '#FFFFFF',
    softAccent: 'rgba(255,255,255,0.22)',
    textOnGradient: '#FFFFFF',
  },
  night: {
    gradient:
      'radial-gradient(ellipse 60% 80% at 80% 40%, rgba(123,92,255,0.35), transparent 60%), radial-gradient(ellipse 50% 60% at 20% 60%, rgba(16,227,176,0.18), transparent 60%), linear-gradient(135deg, #1A1640 0%, #0F1D33 100%)',
    accent: '#10E3B0',
    softAccent: 'rgba(16,227,176,0.22)',
    textOnGradient: '#FFFFFF',
  },
};

interface HeroMetricCardProps {
  variant?: HeroVariant;
  /** Top-left badge, e.g. "DUBAI MARINA · 2BR" */
  badge?: string;
  /** Show a pulsing "LIVE" chip top-right */
  live?: boolean;
  /** Small label above the metric, e.g. "Deal Score" */
  label: string;
  /** The big hero number/text, e.g. "92" */
  metric: ReactNode;
  /** Suffix right after the metric, e.g. "/100" */
  metricSuffix?: string;
  /** Short verdict text, e.g. "Strong Buy" */
  verdict?: string;
  /** Direction of the verdict — renders an arrow */
  verdictDirection?: 'up' | 'down' | 'flat';
  /** Progress bar dots 0..100 */
  progress?: number;
  /** Optional extra content in the card (description, helper) */
  children?: ReactNode;
  /** Pick the decoration drawn on the right side */
  decoration?: 'rings' | 'spark' | 'none';
  className?: string;
}

export function HeroMetricCard({
  variant = 'blue',
  badge,
  live,
  label,
  metric,
  metricSuffix,
  verdict,
  verdictDirection,
  progress,
  children,
  decoration = 'rings',
  className = '',
}: HeroMetricCardProps) {
  const v = VARIANTS[variant];
  const VerdictArrow =
    verdictDirection === 'down' ? ArrowDownRight
    : verdictDirection === 'flat' ? Minus
    : ArrowUpRight;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 ${className}`}
      style={{
        background: v.gradient,
        color: v.textOnGradient,
        boxShadow: '0 20px 48px -18px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
      }}
    >
      {/* Decoration */}
      {decoration === 'spark' && (
        <svg
          aria-hidden="true"
          className="absolute right-[-10px] top-1/2 -translate-y-1/2 pointer-events-none"
          width="260" height="260" viewBox="0 0 260 260" fill="none"
          style={{ opacity: 0.22 }}
        >
          <g stroke={v.textOnGradient} strokeWidth="8" strokeLinecap="round">
            <line x1="130" y1="30" x2="130" y2="230" />
            <line x1="40" y1="130" x2="220" y2="130" />
            <line x1="60" y1="60" x2="200" y2="200" />
            <line x1="200" y1="60" x2="60" y2="200" />
          </g>
        </svg>
      )}
      {decoration === 'rings' && (
        <>
          <div aria-hidden="true" className="absolute -right-24 -top-24 w-[18rem] h-[18rem] rounded-full border-[2px]" style={{ borderColor: v.softAccent }} />
          <div aria-hidden="true" className="absolute -right-14 -top-14 w-[13rem] h-[13rem] rounded-full border-[2px]" style={{ borderColor: v.softAccent }} />
          <div aria-hidden="true" className="absolute -right-6 top-0 w-[9rem] h-[9rem] rounded-full border-[2px]" style={{ borderColor: v.softAccent }} />
        </>
      )}

      {/* Top row — badge + live */}
      <div className="relative flex items-start justify-between gap-3 mb-6">
        {badge ? (
          <span
            className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full backdrop-blur-md"
            style={{ background: 'rgba(0,0,0,0.25)', color: v.textOnGradient, border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {badge}
          </span>
        ) : <span />}
        {live && (
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: v.textOnGradient }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: v.accent }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: v.accent }} />
            </span>
            LIVE
          </span>
        )}
      </div>

      {/* Metric + verdict */}
      <div className="relative mb-5">
        <p className="text-sm font-semibold opacity-80 mb-1">{label}</p>
        <div className="flex items-end gap-2 flex-wrap">
          <span className="text-5xl sm:text-6xl font-black leading-none tracking-tight">
            {metric}
          </span>
          {metricSuffix && (
            <span className="text-xl font-bold opacity-70 pb-1.5">{metricSuffix}</span>
          )}
          {verdict && (
            <span
              className="ml-auto flex items-center gap-1 text-sm font-black"
              style={{ color: v.accent }}
            >
              <VerdictArrow className="h-4 w-4" />
              {verdict}
            </span>
          )}
        </div>
      </div>

      {/* Progress dot bar */}
      {typeof progress === 'number' && (
        <div className="relative flex items-center gap-[3px] mb-1">
          {Array.from({ length: 22 }).map((_, i) => {
            const filled = (i / 21) * 100 <= progress;
            return (
              <span
                key={i}
                className="h-2 flex-1 rounded-full transition-all"
                style={{
                  background: filled ? v.accent : 'rgba(255,255,255,0.25)',
                  boxShadow: filled ? `0 0 12px ${v.accent}80` : 'none',
                }}
              />
            );
          })}
        </div>
      )}

      {children && <div className="relative mt-3 text-sm opacity-90">{children}</div>}
    </div>
  );
}
