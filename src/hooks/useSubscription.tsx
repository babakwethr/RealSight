import { useTenant } from './useTenant';
import { useAuth } from './useAuth';

export type PlanTier = 'free' | 'portfolio_pro' | 'adviser_starter' | 'adviser_pro' | 'adviser_trial';

const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  portfolio_pro: 1,
  adviser_starter: 2,
  adviser_pro: 3,
  adviser_trial: 3, // trial = full adviser_pro access
};

// Feature → minimum plan tier required to access it
const FEATURE_MIN_TIER: Record<string, PlanTier> = {
  // ── Portfolio Pro ($29/mo) ──────────────────────────────────
  'market-intelligence':      'portfolio_pro',
  'market-index':             'portfolio_pro',
  'heatmap':                  'portfolio_pro',
  'watchlist':                'portfolio_pro',
  'compare':                  'portfolio_pro',
  // deal-analyzer page = free for all logged-in users (Explorer+)
  // deal-analyzer-pdf = Portfolio Pro required (download gated)
  'deal-analyzer-pdf':        'portfolio_pro',
  'new-launches-units':       'portfolio_pro',   // unit availability in New Launches
  // ── Adviser Starter ($99/mo) ───────────────────────────────
  'global-radar':             'adviser_starter',
  'opportunity-signals':      'adviser_starter',
  'top-picks':                'adviser_starter',
  'new-launches-share':       'adviser_starter', // share button in New Launches
  'concierge-unlimited':      'adviser_starter',
  // ── Adviser Pro ($199/mo) ──────────────────────────────────
  'ai-investor-presentation': 'adviser_pro',
  'ai-market-analysis':       'adviser_pro',
};

export type FeatureKey = keyof typeof FEATURE_MIN_TIER;

// Plan display names
export const PLAN_LABELS: Record<PlanTier, string> = {
  free:             'Explorer (Free)',
  portfolio_pro:    'Portfolio Pro',
  adviser_starter:  'Adviser Starter',
  adviser_pro:      'Adviser Pro',
  adviser_trial:    'Adviser Pro (Trial)',
};

// Minimum plan label needed per feature
export const FEATURE_PLAN_LABEL: Record<string, string> = {
  'market-intelligence':      'Portfolio Pro',
  'market-index':             'Portfolio Pro',
  'heatmap':                  'Portfolio Pro',
  'watchlist':                'Portfolio Pro',
  'compare':                  'Portfolio Pro',
  'deal-analyzer-pdf':        'Portfolio Pro',
  'new-launches-units':       'Portfolio Pro',
  'global-radar':             'Adviser',
  'opportunity-signals':      'Adviser',
  'top-picks':                'Adviser',
  'new-launches-share':       'Adviser',
  'concierge-unlimited':      'Adviser',
  'ai-investor-presentation': 'Adviser Pro',
  'ai-market-analysis':       'Adviser Pro',
};

// Map old/legacy DB tier strings to new PlanTier values
function normalizeTier(raw: string | undefined | null): PlanTier {
  if (!raw) return 'free';
  const map: Record<string, PlanTier> = {
    // legacy names
    free:            'free',
    starter:         'free',
    pro:             'portfolio_pro',
    brokerage:       'adviser_pro',
    // new names (pass-through)
    portfolio_pro:   'portfolio_pro',
    adviser_starter: 'adviser_starter',
    adviser_pro:     'adviser_pro',
    adviser_trial:   'adviser_trial',
  };
  return map[raw] ?? 'free';
}

export function useSubscription() {
  const { tenant } = useTenant();
  const { user, loading } = useAuth();

  // Resolve current plan tier
  const plan: PlanTier = (() => {
    // 1. Tenant subscription takes priority (multi-tenant B2B orgs)
    if (tenant?.id) {
      const raw = (tenant as any).subscription_tier;
      const normalized = normalizeTier(raw);
      if (normalized !== 'free') return normalized;
    }
    // 2. Individual user metadata (direct signups)
    const userPlan = user?.user_metadata?.plan;
    if (userPlan) return normalizeTier(userPlan);

    return 'free';
  })();

  /** Returns true if the current plan can access the feature */
  const hasFeature = (feature: string): boolean => {
    const minTier = FEATURE_MIN_TIER[feature];
    if (!minTier) return true; // unrecognised features default to free
    return TIER_RANK[plan] >= TIER_RANK[minTier];
  };

  // Convenience booleans
  const isPro      = TIER_RANK[plan] >= TIER_RANK['portfolio_pro'];
  const isAdviser  = TIER_RANK[plan] >= TIER_RANK['adviser_starter'];
  const isAdviserPro = TIER_RANK[plan] >= TIER_RANK['adviser_pro'];
  const isTrial    = plan === 'adviser_trial';

  return {
    plan,
    planName: PLAN_LABELS[plan],
    hasFeature,
    isPro,
    isAdviser,
    isAdviserPro,
    isTrial,
    loading, // true while auth is resolving — use to prevent gate flash
  };
}
