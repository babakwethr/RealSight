/**
 * useSubscription — plan gating for the launch model.
 *
 * Per LAUNCH_PLAN.md §2 the launch ships THREE plans:
 *
 *   - free          $0          Everything in the investor app (portfolio,
 *                                Deal Analyzer, branded PDF, Markets, Heatmap,
 *                                AI Concierge unlimited, off-plan projects browse,
 *                                Updates, Documents, Payments).
 *   - investor_pro  $9 (launch $4) Adds ONE feature: live unit availability
 *                                for every off-plan project (via Reelly).
 *   - adviser_pro   $199 (launch $99) White-label: subdomain, branding, invite
 *                                clients, adviser dashboard, branded reports,
 *                                opportunity signals, bulk Deal Analyzer.
 *
 * Backward-compat: legacy plan strings (`portfolio_pro`, `adviser_starter`)
 * map to the new tiers. Legacy feature keys (`heatmap`, `watchlist`,
 * `market-index` etc.) still resolve via `hasFeature(...)` so callers don't
 * break — they all collapse to "free" since the new free tier includes them.
 *
 * Existing paying users only ever gain access from this change, never lose it.
 */
import { useTenant } from './useTenant';
import { useAuth } from './useAuth';

// ─── Tier model ───────────────────────────────────────────────────────────────

export type PlanTier =
  | 'free'
  | 'investor_pro'
  | 'adviser_pro'
  | 'adviser_trial'; // 30-day trial = full Adviser Pro access

const TIER_RANK: Record<PlanTier, number> = {
  free:          0,
  investor_pro:  1,
  adviser_pro:   2,
  adviser_trial: 2,
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  free:          'Free Investor',
  investor_pro:  'Investor Pro',
  adviser_pro:   'Adviser Pro',
  adviser_trial: 'Adviser Pro (Trial)',
};

export const PLAN_PRICE_LABELS: Record<PlanTier, string> = {
  free:          '$0 forever',
  investor_pro:  '$9 / mo',
  adviser_pro:   '$199 / mo',
  adviser_trial: '30-day trial',
};

// ─── Feature → minimum-tier map ───────────────────────────────────────────────
//
// Two namespaces live here:
//   1. Launch-spec feature keys (use these going forward)
//   2. Legacy keys preserved as `free` so existing code keeps working — every
//      "Portfolio Pro" feature is now part of the free tier.
//
const FEATURE_MIN_TIER: Record<string, PlanTier> = {
  // ── Launch features ───────────────────────────────────────────────────────
  // Investor Pro — the one paid investor feature
  'unit-availability':       'investor_pro',  // live off-plan unit inventory (Reelly)

  // Adviser Pro — the white-label / sales tooling
  'white-label':             'adviser_pro',
  'subdomain':               'adviser_pro',
  'branded-reports':         'adviser_pro',
  'invite-clients':          'adviser_pro',
  'adviser-dashboard':       'adviser_pro',
  'opportunity-signals':     'adviser_pro',
  'bulk-deal-analyzer':      'adviser_pro',
  'whatsapp-share':          'adviser_pro',
  'lead-gen-page':           'adviser_pro',
  'priority-support':        'adviser_pro',

  // Area Pricing Report PDF (per §15) is an adviser sales tool
  'area-pricing-report':     'adviser_pro',

  // ── Legacy keys — collapsed to free (existing callers keep working) ──────
  'market-intelligence':     'free',
  'market-index':            'free',
  'heatmap':                 'free',
  'watchlist':               'free',
  'compare':                 'free',
  'deal-analyzer-pdf':       'free',
  'concierge-unlimited':     'free',
  'top-picks':               'free',

  // Legacy adviser keys → now require Adviser Pro (collapsed from Starter+Pro)
  'global-radar':            'adviser_pro',
  'new-launches-share':      'adviser_pro',
  'new-launches-units':      'investor_pro',
  'ai-investor-presentation': 'adviser_pro',
  'ai-market-analysis':      'adviser_pro',
};

export type FeatureKey = keyof typeof FEATURE_MIN_TIER;

/** Plan label shown in upsell prompts when a feature is locked. */
export const FEATURE_PLAN_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(FEATURE_MIN_TIER).map(([key, tier]) => [key, PLAN_LABELS[tier]]),
);

// ─── Tier normalisation (legacy → new) ────────────────────────────────────────

function normalizeTier(raw: string | undefined | null): PlanTier {
  if (!raw) return 'free';
  const map: Record<string, PlanTier> = {
    // legacy string names
    free:            'free',
    starter:         'free',
    pro:             'free',           // legacy "Portfolio Pro" → folded into free
    portfolio_pro:   'free',           // legacy → folded into free
    adviser_starter: 'adviser_pro',    // legacy Starter → collapsed to Adviser Pro
    brokerage:       'adviser_pro',
    // current tier names (pass-through)
    investor_pro:    'investor_pro',
    adviser_pro:     'adviser_pro',
    adviser_trial:   'adviser_trial',
  };
  return map[raw] ?? 'free';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

import { useFounder } from '@/hooks/useFounder';

export function useSubscription() {
  const { tenant } = useTenant();
  const { user, loading } = useAuth();
  // Founders (profiles.is_founder = true) always get top-tier access.
  // This means the team can dogfood every paid feature without having to
  // touch user_metadata.plan or tenants.subscription_tier — and any new
  // founder added later (via the is_founder flag) gets the same treatment
  // automatically. Single source of truth: the database flag.
  const { isFounder } = useFounder();

  // Resolve current plan tier
  const plan: PlanTier = (() => {
    // 0. Founders always get full Adviser Pro access for testing.
    if (isFounder) return 'adviser_pro';

    // 1. Tenant subscription takes priority (multi-tenant B2B orgs)
    if (tenant?.id) {
      const raw = (tenant as { subscription_tier?: string | null }).subscription_tier;
      const normalized = normalizeTier(raw);
      if (normalized !== 'free') return normalized;
    }
    // 2. Individual user metadata (direct signups)
    const userPlan = user?.user_metadata?.plan;
    if (userPlan) return normalizeTier(userPlan);

    return 'free';
  })();

  /** Returns true if the current plan can access the feature. */
  const hasFeature = (feature: string): boolean => {
    const minTier = FEATURE_MIN_TIER[feature];
    if (!minTier) return true; // unknown features default to free
    return TIER_RANK[plan] >= TIER_RANK[minTier];
  };

  // Convenience booleans
  const isInvestorPro = TIER_RANK[plan] >= TIER_RANK['investor_pro'];
  const isAdviserPro  = TIER_RANK[plan] >= TIER_RANK['adviser_pro'];
  const isPro         = isInvestorPro;       // any paid plan
  const isAdviser     = isAdviserPro;        // legacy alias — kept for old callers
  const isTrial       = plan === 'adviser_trial';

  return {
    plan,
    planName:  PLAN_LABELS[plan],
    planPrice: PLAN_PRICE_LABELS[plan],
    hasFeature,
    isInvestorPro,
    isAdviserPro,
    isPro,
    isAdviser,    // ← legacy alias for backward compat (= isAdviserPro)
    isTrial,
    loading,      // true while auth is resolving — use to prevent gate flash
  };
}
