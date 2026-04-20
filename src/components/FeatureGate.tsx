import { ReactNode } from 'react';
import { useSubscription, FEATURE_PLAN_LABEL } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import { Lock, Sparkles, ArrowRight, BarChart3, Map, Search, Bookmark,
         Columns, Star, Target, Radar, Bot, Building2, FileText, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  /** If true, shows blurred preview instead of lock overlay (not currently used) */
  blur?: boolean;
}

// Value stacking: what else is included in each plan
const PLAN_ALSO_INCLUDED: Record<string, { icon: React.ElementType; label: string }[]> = {
  'Portfolio Pro': [
    { icon: BarChart3, label: 'Market Intelligence' },
    { icon: Map,       label: 'Dubai Heatmap' },
    { icon: Search,    label: 'Deal Analyzer' },
    { icon: Bookmark,  label: 'Watchlist' },
    { icon: Columns,   label: 'Compare Projects' },
    { icon: Building2, label: 'New Launches units' },
  ],
  'Adviser': [
    { icon: Star,      label: 'Top Picks' },
    { icon: Target,    label: 'Opportunity Signals' },
    { icon: Radar,     label: 'Global Radar' },
    { icon: Bot,       label: 'Unlimited AI Concierge' },
    { icon: Building2, label: 'New Launches share' },
  ],
  'Adviser Pro': [
    { icon: FileText,  label: 'AI Investor Presentation' },
    { icon: BarChart3, label: 'AI Market Analysis' },
  ],
};

const PLAN_PRICE: Record<string, string> = {
  'Portfolio Pro': '$29/mo',
  'Adviser':       '$99/mo',
  'Adviser Pro':   '$199/mo',
};

// Accent colour per plan tier — matches UpsellBanner / MarketHome treatment
const PLAN_ACCENT: Record<string, string> = {
  'Portfolio Pro': '#18D6A4', // mint
  'Adviser':       '#3B82F6', // blue
  'Adviser Pro':   '#A855F7', // purple
};

export function FeatureGate({ feature, children }: FeatureGateProps) {
  const { hasFeature, planName, loading } = useSubscription();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  // While auth is resolving, render children transparently — prevents the
  // gate from flashing for a split second before the real plan is known.
  if (loading) return <>{children}</>;

  // Admins always bypass gates
  if (isAdmin || hasFeature(feature)) {
    return <>{children}</>;
  }

  const requiredPlan = FEATURE_PLAN_LABEL[feature] || 'Portfolio Pro';
  const price = PLAN_PRICE[requiredPlan] || '';
  const alsoIncluded = PLAN_ALSO_INCLUDED[requiredPlan] || [];
  const accent = PLAN_ACCENT[requiredPlan] || '#18D6A4';

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4 sm:p-6 animate-fade-in">
      <div
        className="relative overflow-hidden w-full max-w-md rounded-3xl p-6 sm:p-8 text-center"
        style={{
          background: `linear-gradient(135deg, ${accent}1f 0%, rgba(10,14,32,0.65) 55%, rgba(10,14,32,0.55) 100%)`,
          border: `1px solid ${accent}40`,
          boxShadow: `0 20px 50px -20px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
        }}
      >
        {/* Aurora halos */}
        <div aria-hidden="true" className="absolute -top-20 -left-16 w-[18rem] h-[18rem] rounded-full blur-[90px] pointer-events-none" style={{ background: `${accent}30` }} />
        <div aria-hidden="true" className="absolute -bottom-24 -right-14 w-[16rem] h-[16rem] rounded-full blur-[90px] pointer-events-none" style={{ background: `${accent}20` }} />

        <div className="relative">
          {/* Lock badge */}
          <div
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full mb-5"
            style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}50` }}
          >
            <Lock className="h-3 w-3" />
            {requiredPlan} · {price}
          </div>

          {/* Orb */}
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: `linear-gradient(135deg, ${accent}40 0%, ${accent}15 100%)`,
              border: `1px solid ${accent}55`,
              boxShadow: `0 10px 28px -10px ${accent}90, inset 0 1px 0 rgba(255,255,255,0.1)`,
            }}
          >
            <Sparkles className="h-7 w-7" style={{ color: accent }} />
          </div>

          {/* Headline */}
          <h2 className="text-xl sm:text-2xl font-black text-foreground mb-2 leading-tight">
            Upgrade to unlock this feature
          </h2>
          <p className="text-sm text-muted-foreground mb-1 leading-relaxed">
            Available on{' '}
            <span className="font-bold" style={{ color: accent }}>{requiredPlan}</span>.
          </p>
          <p className="text-xs text-muted-foreground/50 mb-6">
            Your plan: <span className="font-semibold text-foreground/70">{planName}</span>
          </p>

          {/* Value stacking — also included */}
          {alsoIncluded.length > 0 && (
            <div
              className="mb-6 p-4 rounded-2xl text-left"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.15em] font-black text-muted-foreground/70 mb-3">
                Everything else you get
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {alsoIncluded.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}
                    >
                      <Check className="h-3 w-3" style={{ color: accent }} />
                    </div>
                    <span className="text-[11px] text-foreground/80 leading-tight flex items-center gap-1">
                      <Icon className="h-3 w-3 opacity-60" />
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-full text-sm font-black text-black transition-transform hover:-translate-y-[1px] active:translate-y-0"
            style={{
              background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`,
              boxShadow: `0 14px 32px -10px ${accent}90`,
            }}
          >
            <Sparkles className="h-4 w-4" />
            Start 30-day free trial
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-[11px] text-muted-foreground/60 mt-3">
            Cancel anytime · No card charged for 30 days
          </p>
        </div>
      </div>
    </div>
  );
}

/** Small lock badge used in sidebar */
export function ProBadge({ plan = 'Pro' }: { plan?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
      <Lock className="h-2.5 w-2.5" />
      {plan}
    </span>
  );
}
