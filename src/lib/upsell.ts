/**
 * upsell.ts — single source of truth for "what plan should I sell this user next?"
 *
 * Founder note (28 Apr 2026): copy across the app drifted out of sync.
 *  • Homepage top banner said "Upgrade to Investor Pro · $4/mo"
 *  • Homepage bottom strip said "Upgrade to Portfolio Pro · $29/mo" (legacy)
 *  • Account page CTA said "Upgrade to Portfolio Pro · $29/mo" (legacy)
 *  • Some places never showed an upsell to advisers, others showed Investor Pro
 *    to a user who was clearly an adviser.
 *
 * Every upsell surface (sidebar bottom card, top banner, in-page strips, page
 * upsell modals) should call `getUpsellTarget(plan, role)` and render whatever
 * it returns. If it returns `null`, no upsell — the user is already on the
 * right tier for what they signed up to do.
 *
 * Decision matrix:
 *
 *    plan          | role         | upsell target                | reason
 *    --------------|--------------|------------------------------|--------------------------
 *    free          | investor     | Investor Pro ($4/mo launch)  | natural next step
 *    free          | adviser/admin| Adviser Pro ($99/mo launch)  | they signed up to advise; skip the investor tier
 *    investor_pro  | investor     | null                         | they're at their target tier
 *    investor_pro  | adviser/admin| Adviser Pro ($99/mo launch)  | cross-tier nudge — they may have signed up wrong
 *    adviser_pro   | any          | null                         | top tier
 *    adviser_trial | any          | null                         | already evaluating top tier; the trial conversion happens in /billing
 */

import type { PlanTier } from '@/hooks/useSubscription';

export type UpsellTarget = 'investor_pro' | 'adviser_pro';

export interface UpsellCopy {
  /** Plan key Stripe checkout will be opened with. */
  targetPlan: UpsellTarget;
  /** Short headline — used as the primary label on cards/buttons. */
  headline: string;
  /** Price line shown beneath the headline (launch promo). */
  price: string;
  /** One-line value blurb to put in tooltips / longer cards. */
  blurb: string;
  /** Visual accent colour to keep the upsell consistent with the plan. */
  accent: string;
}

const INVESTOR_PRO: UpsellCopy = {
  targetPlan: 'investor_pro',
  headline:   'Upgrade to Investor Pro',
  price:      '$4 / mo · launch',
  blurb:      'Live unit availability for every off-plan project — floor, view, real-time price.',
  accent:     '#18D6A4',
};

const ADVISER_PRO: UpsellCopy = {
  targetPlan: 'adviser_pro',
  headline:   'Upgrade to Adviser Pro',
  price:      '$99 / mo · 6 months launch',
  blurb:      'Your white-label investor platform. Subdomain · branding · invite clients · branded reports.',
  accent:     '#7B5CFF',
};

/**
 * Returns the right next-tier upsell for a user, or null if they're already
 * at the right tier for their role.
 *
 * `isAdviser` should be `true` if the user is on an adviser/admin path —
 * either `useUserRole().isAdmin` or `user_metadata.signup_role === 'advisor'`.
 */
export function getUpsellTarget(
  plan: PlanTier | null | undefined,
  isAdviser: boolean,
): UpsellCopy | null {
  if (!plan) return null;

  // Top-tier users never see an upsell.
  if (plan === 'adviser_pro' || plan === 'adviser_trial') return null;

  // Adviser-path users always upsell to Adviser Pro, regardless of intermediate plan.
  if (isAdviser) return ADVISER_PRO;

  // Investor-path: free → Investor Pro; Investor Pro is their target, no upsell.
  if (plan === 'free') return INVESTOR_PRO;
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
