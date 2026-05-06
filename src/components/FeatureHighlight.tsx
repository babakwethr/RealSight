import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { cn } from '@/lib/utils';

/**
 * FeatureHighlight — a Linear / Apple / Stripe-style scroll-stop section.
 *
 *   Title (specific, value-led — e.g. "Score any Dubai property in 7 seconds")
 *   1-line value statement
 *   Anchoring detail (a metric, quote, or chip)
 *   CTA link
 *   Phone mockup with a real captured screenshot
 *
 * Layout:
 *   • Desktop: side-by-side. Alternating per-section so the page has rhythm
 *     (text-left / mockup-right, then mockup-left / text-right).
 *   • Mobile: stacked — mockup on top, text below.
 *
 * The screenshot inside the phone is always a REAL captured RealSight screen
 * (not a generated fake UI) — see the "premium principles" section of the plan.
 */

interface FeatureHighlightProps {
  /** Eyebrow tag — e.g. "DEAL ANALYZER". Renders in the section's accent colour. */
  eyebrow: string;
  /** The big title — keep specific and value-led, not generic. */
  title: string;
  /** 1–2 line value statement underneath the title. */
  description: string;
  /** Optional anchor: a metric, chip, or quote — gives the section weight. */
  anchor?: string;
  /** CTA label, e.g. "Try it →". */
  ctaLabel?: string;
  /** CTA href. */
  ctaTo?: string;
  /** Path to the iPhone-style screenshot. */
  screenshotSrc: string;
  /** Alt for the screenshot. */
  screenshotAlt: string;
  /** Which side is the mockup on (alternate per section in the parent for rhythm). */
  reverse?: boolean;
  /** Accent colour — drives eyebrow, anchor chip, and the soft halo behind the phone. */
  accent?: 'mint' | 'cobalt' | 'violet' | 'gold' | 'rose';
}

const ACCENTS: Record<NonNullable<FeatureHighlightProps['accent']>, { text: string; chip: string; halo: string }> = {
  mint:   { text: '#2effc0', chip: 'bg-[#18d6a4]/15 text-[#2effc0] border-[#18d6a4]/30',  halo: 'rgba(46, 255, 192, 0.30)' },
  cobalt: { text: '#7aa6ff', chip: 'bg-[#4aa8ff]/15 text-[#7aa6ff] border-[#4aa8ff]/30',  halo: 'rgba(74, 168, 255, 0.30)' },
  violet: { text: '#b6a4ff', chip: 'bg-[#7B5CFF]/15 text-[#b6a4ff] border-[#7B5CFF]/30',  halo: 'rgba(123, 92, 255, 0.30)' },
  gold:   { text: '#ffd97a', chip: 'bg-[#c9a84c]/15 text-[#ffd97a] border-[#c9a84c]/30',  halo: 'rgba(201, 168, 76, 0.30)' },
  rose:   { text: '#f9a8d4', chip: 'bg-[#ec4899]/15 text-[#f9a8d4] border-[#ec4899]/30',  halo: 'rgba(236, 72, 153, 0.30)' },
};

export function FeatureHighlight({
  eyebrow,
  title,
  description,
  anchor,
  ctaLabel,
  ctaTo,
  screenshotSrc,
  screenshotAlt,
  reverse = false,
  accent = 'mint',
}: FeatureHighlightProps) {
  const a = ACCENTS[accent];

  return (
    <section className="relative w-full py-16 sm:py-24 lg:py-28">
      <div
        className={cn(
          'mx-auto max-w-6xl px-4 sm:px-6 grid gap-10 sm:gap-12 lg:gap-16 items-center',
          'grid-cols-1 lg:grid-cols-12',
        )}
      >
        {/* Text column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'lg:col-span-6 order-2',
            reverse ? 'lg:order-2' : 'lg:order-1',
          )}
        >
          <p
            className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] font-black uppercase tracking-[0.22em] mb-4"
            style={{ color: a.text }}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: a.text, boxShadow: `0 0 8px ${a.text}` }}
            />
            {eyebrow}
          </p>
          <h2 className="text-[28px] sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-[1.05] mb-4 text-balance">
            {title}
          </h2>
          <p className="text-[14.5px] sm:text-base lg:text-lg text-muted-foreground leading-relaxed mb-5 max-w-xl">
            {description}
          </p>
          {anchor && (
            <span
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-full text-[11.5px] sm:text-xs font-bold border',
                a.chip,
              )}
            >
              {anchor}
            </span>
          )}
          {ctaLabel && ctaTo && (
            <div className="mt-6 sm:mt-7">
              <Link
                to={ctaTo}
                className="inline-flex items-center gap-1.5 text-[13px] sm:text-sm font-bold transition-colors group"
                style={{ color: a.text }}
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </motion.div>

        {/* Mockup column */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className={cn(
            'lg:col-span-6 order-1 relative flex items-center justify-center',
            reverse ? 'lg:order-1' : 'lg:order-2',
          )}
        >
          {/* Soft accent halo behind the phone */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(60% 60% at 50% 50%, ${a.halo}, transparent 70%)`,
            }}
          />
          <PhoneFrame
            src={screenshotSrc}
            alt={screenshotAlt}
            width={260}
            tilt={reverse ? 4 : -4}
          />
        </motion.div>
      </div>
    </section>
  );
}
