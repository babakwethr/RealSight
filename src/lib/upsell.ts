/**
 * upsell.ts — single source of truth for "what plan should I sell this user next?"
 *
 * Every upsell surface (sidebar bottom card, top banner, in-page strips, page
 * upsell modals) calls `getUpsellTarget(plan, role)` and renders whatever it
 * returns. If null, no upsell — the user is already on the right tier.
 *
 * Decision matrix:
 *
 *    plan          | role         | upsell target                | reason
 *    --------------|--------------|------------------------------|--------------------------
 *    free          | investor     | Investor Pro ($499/mo launch)| natural next step
 *    free          | adviser/admin| Adviser Pro ($99/mo launch)  | they signed up to advise
 *    investor_pro  | investor     | null                         | they're at their target tier
 *    investor_pro  | adviser/admin| Adviser Pro ($99/mo launch)  | cross-tier nudge
 *    adviser_pro   | any          | null                         | top tier
 *    adviser_trial | any          | null                         | already evaluating top tier
 *
 * Prices and badges come from `src/lib/pricing.ts` so the launch promo
 * (50% OFF until 31 May 2026) flows automatically.
 */

import type { PlanTier } from '@/hooks/useSubscription';
import {
  PRICING,
  fmtUsdMonthly,
  isLaunchPromoActive,
} from '@/lib/pricing';

export type UpsellTarget = 'investor_pro' | 'adviser_pro';

export interface UpsellCopy {
  /** Plan key Stripe checkout will be opened with. */
  targetPlan: UpsellTarget;
  /** Short headline — used as the primary label on cards/buttons. */
  headline: string;
  /** Active price shown big — already accounts for the promo. */
  price: string;
  /** Regular (non-promo) price for strikethrough rendering. Same as `price` once promo ends. */
  regularPrice: string;
  /** Whether the launch promo is active right now — drives discount badges. */
  promoActive: boolean;
  /** Discount percentage to display in the badge ("50% OFF"). 0 when no promo. */
  discountPct: number;
  /** One-line value blurb to put in tooltips / longer cards. */
  blurb: string;
  /** Visual accent colour to keep the upsell consistent with the plan. */
  accent: string;
}

function buildCopy(
  target: UpsellTarget,
  headline: string,
  blurb: string,
  accent: string,
): UpsellCopy {
  const def = PRICING[target];
  const promoActive = isLaunchPromoActive();
  return {
    targetPlan:   target,
    headline,
    price:        fmtUsdMonthly(promoActive ? def.launchUsd : def.regularUsd),
    regularPrice: fmtUsdMonthly(def.regularUsd),
    promoActive,
    discountPct:  promoActive ? def.discountPct : 0,
    blurb,
    accent,
  };
}

const investorBlurb =
  'Live unit availability for every off-plan project — floor, view, real-time price.';

const adviserBlurb =
  'Your white-label investor platform. Subdomain · branding · invite clients · branded reports.';

/**
 * Returns the right next-tier upsell for a user, or null if they're already
 * at the right tier for their role.
 *
 * `isAdviser` should be `true` if the user is on an adviser/admin path —
 * either `useUserRole().isAdmin` or `user_metadata.signup_role === 'advisor'`.
 *
 * Build the copy at call time (not at module load) so the promo-active flag
 * stays accurate after midnight on 31 May 2026 without a redeploy.
 */
export function getUpsellTarget(
  plan: PlanTier | null | undefined,
  isAdviser: boolean,
): UpsellCopy | null {
  if (!plan) return null;

  // Top-tier users never see an upsell.
  if (plan === 'adviser_pro' || plan === 'adviser_trial') return null;

  // Adviser-path users always upsell to Adviser Pro, regardless of intermediate plan.
  if (isAdviser) {
    return buildCopy('adviser_pro', 'Upgrade to Adviser Pro', adviserBlurb, '#FFB020');
  }

  // Investor-path: free → Investor Pro; Investor Pro is their target, no upsell.
  if (plan === 'free') {
    return buildCopy('investor_pro', 'Upgrade to Investor Pro', investorBlurb, '#18D6A4');
  }
  return null;
}

/**
 * Convenience: derive the "is this user an adviser?" boolean from
 * `useUserRole()` + auth metadata. Centralised so we don't duplicate the
 * "signup_role === 'advisor' || isAdmin" check in 6 components.
 */
export function isAdviserUser(args: {
  isAdmin: boolean;
  signupRole?: string | null;
}): boolean {
  return args.isAdmin || args.signupRole === 'advisor';
}
