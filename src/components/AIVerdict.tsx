/**
 * AIVerdict — reusable "RealSight AI · Verdict" card.
 *
 * Purpose: wrap an AI-generated takeaway in a consistent, trust-signaling
 * component so we can sprinkle AI-flavored context anywhere data is shown
 * (deal analysis, portfolio, market intel, etc).
 *
 * Visual: mint-accented glass panel with an AI sparkle chip, a short
 * headline verdict, the explanation/body, and optional bullet factors.
 */
import { ReactNode } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export type VerdictTone = 'positive' | 'caution' | 'negative' | 'neutral';

interface ToneStyle {
  accent: string;        // main accent colour
  glow: string;          // rgba glow
  soft: string;          // soft tinted background
  Icon: typeof CheckCircle2;
  label: string;         // default headline if none provided
}

const TONE_STYLES: Record<VerdictTone, ToneStyle> = {
  positive: {
    accent: '#18D6A4',
    glow: 'rgba(24,214,164,0.35)',
    soft: 'rgba(24,214,164,0.10)',
    Icon: CheckCircle2,
    label: 'Strong Buy',
  },
  caution: {
    accent: '#F59E0B',
    glow: 'rgba(245,158,11,0.35)',
    soft: 'rgba(245,158,11,0.10)',
    Icon: AlertTriangle,
    label: 'Proceed with Caution',
  },
  negative: {
    accent: '#F43F5E',
    glow: 'rgba(244,63,94,0.35)',
    soft: 'rgba(244,63,94,0.10)',
    Icon: XCircle,
    label: 'Avoid',
  },
  neutral: {
    accent: '#3B82F6',
    glow: 'rgba(59,130,246,0.32)',
    soft: 'rgba(59,130,246,0.10)',
    Icon: Info,
    label: 'Neutral',
  },
};

interface AIVerdictProps {
  /** Overall tone — drives the accent colour + icon */
  tone?: VerdictTone;
  /** Short headline, e.g. "Strong Buy", "Cooling market" */
  headline?: string;
  /** The body text — the actual AI explanation */
  children: ReactNode;
  /** Optional bullet factors that contributed to the verdict */
  factors?: string[];
  /** Optional eyebrow text, defaults to "RealSight AI · Verdict" */
  eyebrow?: string;
  /** Compact layout (less padding) — good for cards inside pages */
  compact?: boolean;
  className?: string;
}

export function AIVerdict({
  tone = 'positive',
  headline,
  children,
  factors,
  eyebrow = 'RealSight AI · Verdict',
  compact = false,
  className = '',
}: AIVerdictProps) {
  const t = TONE_STYLES[tone];
  const Icon = t.Icon;
  const title = headline ?? t.label;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${compact ? 'p-4' : 'p-5'} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${t.soft} 0%, rgba(10,14,32,0.55) 70%)`,
        border: `1px solid ${t.accent}55`,
        boxShadow: `0 14px 32px -14px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      {/* Aurora halo */}
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 w-[12rem] h-[12rem] rounded-full blur-[70px] pointer-events-none"
        style={{ background: `${t.accent}30` }}
      />

      <div className="relative">
        {/* Eyebrow — AI chip */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-full"
            style={{
              background: `${t.accent}1f`,
              color: t.accent,
              border: `1px solid ${t.accent}50`,
            }}
          >
            <Sparkles className="h-3 w-3" />
            {eyebrow}
          </span>
        </div>

        {/* Headline + icon */}
        <div className="flex items-start gap-2.5 mb-2">
          <div
            className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `${t.accent}22`,
              border: `1px solid ${t.accent}55`,
            }}
          >
            <Icon className="h-4 w-4" style={{ color: t.accent }} />
          </div>
          <h3
            className={`${compact ? 'text-base' : 'text-lg'} font-black leading-tight text-foreground`}
          >
            {title}
          </h3>
        </div>

        {/* Body */}
        <div className="text-sm text-foreground/80 leading-relaxed">
          {children}
        </div>

        {/* Factors */}
        {factors && factors.length > 0 && (
          <ul className="mt-3.5 space-y-1.5">
            {factors.map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12.5px] text-foreground/75 leading-snug"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: t.accent, boxShadow: `0 0 8px ${t.glow}` }}
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
