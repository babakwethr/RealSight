/**
 * pricing.ts — single source of truth for plan prices, the launch promo
 * end date, and the helpers every UI surface needs.
 *
 * Founder strategic decision (28 Apr 2026): pivot to anchor-pricing with
 * a hard time-bound 50% OFF launch discount. The high anchor positions
 * RealSight as institutional-grade software (Bloomberg / DXBInteract Pro
 * tier) and turns the Adviser Pro pitch into "you're gifting your client
 * $499/mo of software" — a 5-12× ROI argument depending on client count.
 *
 * Every other module — the Stripe edge function (server-side, USD cents),
 * the Billing page, every upsell card, marketing copy, the Terms page —
 * reads from this file. Don't hard-code prices anywhere else.
 *
 * The promo end-date is a real date in Dubai time. After the date passes:
 *   • UI strips the strikethrough + 50% OFF badge
 *   • Strikethrough regular price becomes the only price shown
 *   • Stripe `amount` in the edge function does NOT auto-flip — the founder
 *     must consciously redeploy with the new amount when ready.
 */

/** Hard end of the launch promo. Dubai timezone. */
export const LAUNCH_PROMO_END = new Date('2026-05-31T23:59:59+04:00');

/** Plan-side pricing data — USD whole-dollar amounts. */
export const PRICING = {
  investor_pro: {
    label:        'Investor Pro',
    regularUsd:   999,
    launchUsd:    499,
    discountPct:  50,
    interval:     'month' as const,
  },
  adviser_pro: {
    label:        'Adviser Pro',
    regularUsd:   199,
    launchUsd:    99,
    discountPct:  50,
    interval:     'month' as const,
  },
} as const;

export type PaidPlanKey = keyof typeof PRICING;

/**
 * True until the end of the launch promo, false after.
 * Used to swap between launch and regular pricing UI / badges.
 */
export function isLaunchPromoActive(now: Date = new Date()): boolean {
  return now <= LAUNCH_PROMO_END;
}

/**
 * Days remaining in the promo (rounded up). Returns 0 once expired.
 * Used in the Billing page hero countdown ("Launch ends in 33 days").
 */
export function promoDaysRemaining(now: Date = new Date()): number {
  const ms = LAUNCH_PROMO_END.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Resolves the right price to charge / display for a given plan, accounting
 * for the launch-promo window. Always returns whole-dollar USD.
 */
export function effectivePrice(plan: PaidPlanKey, now: Date = new Date()): number {
  return isLaunchPromoActive(now) ? PRICING[plan].launchUsd : PRICING[plan].regularUsd;
}

/** Format helpers — keep "$499" / "$1,299" rendering consistent everywhere. */
export function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

export function fmtUsdMonthly(n: number): string {
  return `${fmtUsd(n)}/mo`;
}

/**
 * "Ends 31 May 2026" — formatted in the user's locale-natural way.
 * Used on lower-urgency surfaces where a hard countdown would feel cheesy.
 */
export function formatPromoEndDate(): string {
  return LAUNCH_PROMO_END.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
