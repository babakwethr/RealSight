/**
 * UpsellBanner — contextual upgrade prompt per PRODUCT_PLAN.md §4 (Feature Gate Behaviour)
 * Add to every major feature page. Always shows AFTER auth is resolved (prevents flash).
 * Usage: <UpsellBanner feature="heatmap" />
 */
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

interface BannerConfig {
  headline: string;
  description: string;
  plan: string;
  price: string;
  planKey: string;
  icon?: string;
}

// Per LAUNCH_PLAN.md §2 — only TWO upsell paths exist now:
//   • Investor Pro ($9/mo, launch $4) — unlocks live unit availability
//   • Adviser Pro  ($199/mo, launch $99) — white-label + sales tooling
//
// Legacy feature keys (heatmap, watchlist, etc.) are now FREE, so this
// banner naturally returns null for them via the `hasFeature` check upstream.
const BANNER_CONFIG: Record<string, BannerConfig> = {
  // ── Investor Pro upsell ──────────────────────────────────────────────────
  'unit-availability': {
    headline: 'See live unit availability',
    description: 'Free shows you the project. Pro shows you exactly which units, floors, and views are still available — with real-time pricing.',
    plan: 'Investor Pro',
    price: '$4/mo (launch)',
    planKey: 'investor_pro',
    icon: '🏗️',
  },
  // ── Adviser Pro upsell ───────────────────────────────────────────────────
  'opportunity-signals': {
    headline: 'AI flags units that match your clients',
    description: 'Opportunity Signals scans new launches and surfaces units that fit each client\'s yield, location, and price criteria — before competitors see them.',
    plan: 'Adviser Pro',
    price: '$99/mo (launch)',
    planKey: 'adviser_pro',
    icon: '🎯',
  },
  'white-label': {
    headline: 'Your brand. Your workspace URL.',
    description: 'Your logo, colours, and contact on every page and every PDF. Public lead-gen page at realsight.app/a/you. RealSight powers everything invisibly.',
    plan: 'Adviser Pro',
    price: '$99/mo (launch)',
    planKey: 'adviser_pro',
    icon: '🎨',
  },
  'invite-clients': {
    headline: 'Invite unlimited investor clients',
    description: 'Onboard your investors with branded invites. Manage every client\'s portfolio from one dashboard. No per-seat fees, no caps.',
    plan: 'Adviser Pro',
    price: '$99/mo (launch)',
    planKey: 'adviser_pro',
    icon: '👥',
  },
  'bulk-deal-analyzer': {
    headline: 'Bulk Deal Analyzer',
    description: 'Analyse multiple properties at once. Compare yields, run AI verdicts side-by-side, and export branded reports for every client meeting.',
    plan: 'Adviser Pro',
    price: '$99/mo (launch)',
    planKey: 'adviser_pro',
    icon: '⚡',
  },
  'area-pricing-report': {
    headline: 'Generate the Area Pricing Report',
    description: 'A 6-page branded PDF with DPI chart, recent sales, MOUs, surveyor valuations, and AI verdict. Replaces Property Monitor — fully co-branded with you.',
    plan: 'Adviser Pro',
    price: '$99/mo (launch)',
    planKey: 'adviser_pro',
    icon: '📑',
  },
};

interface UpsellBannerProps {
  feature: string;
  className?: string;
  /** compact = slim inline bar, default = full card */
  variant?: 'compact' | 'card';
}

export function UpsellBanner({ feature, className = '', variant = 'card' }: UpsellBannerProps) {
  const { hasFeature, loading } = useSubscription();
  const { user } = useAuth();

  // Don't flash — wait until plan is resolved
  if (loading) return null;
  // Already has access — don't show
  if (hasFeature(feature)) return null;

  const config = BANNER_CONFIG[feature];
  if (!config) return null;

  // Accent color driven by plan tier — used for halos, badges, and the CTA.
  // investor_pro = mint, adviser_pro = amber/gold (premium upgrade tone, more
  // eye-catchy than violet against the dark navy UI).
  const accentColor =
    config.planKey === 'adviser_pro' ? '#FFB020' : '#18D6A4';

  if (variant === 'compact') {
    return (
      <div
        className={`relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3 rounded-2xl ${className}`}
        style={{
          background: `linear-gradient(90deg, ${accentColor}22 0%, ${accentColor}0A 55%, transparent 100%)`,
          border: `1px solid ${accentColor}40`,
          boxShadow: `0 8px 22px -14px ${accentColor}55`,
        }}
      >
        <div className="flex-1 min-w-0">
          <span
            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-1"
            style={{ background: `${accentColor}1f`, color: accentColor, border: `1px solid ${accentColor}50` }}
          >
            <Lock className="h-2.5 w-2.5" />
            {config.plan}
          </span>
          <p className="text-sm font-bold text-foreground leading-snug">{config.headline}</p>
          <p className="text-[11px] text-muted-foreground/80 line-clamp-1 hidden sm:block">{config.description}</p>
        </div>
        <Link
          to="/billing"
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-black text-black whitespace-nowrap transition-transform hover:-translate-y-[1px]"
          style={{
            background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
            boxShadow: `0 8px 20px -6px ${accentColor}90`,
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {user ? `Upgrade · ${config.price}` : 'Start Free Trial'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  // Full card — premium glass look, no emoji icon, clean hierarchy
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${accentColor}1a 0%, rgba(10,14,32,0.55) 55%, rgba(10,14,32,0.45) 100%)`,
        border: `1px solid ${accentColor}40`,
        boxShadow: `0 14px 40px -16px ${accentColor}55, inset 0 1px 0 rgba(255,255,255,0.05)`,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      {/* Accent halos */}
      <div aria-hidden="true" className="absolute -top-16 -left-10 w-[14rem] h-[14rem] rounded-full blur-[70px] pointer-events-none" style={{ background: `${accentColor}25` }} />
      <div aria-hidden="true" className="absolute -bottom-20 -right-10 w-[14rem] h-[14rem] rounded-full blur-[80px] pointer-events-none" style={{ background: `${accentColor}18` }} />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full mb-2"
            style={{ background: `${accentColor}1f`, color: accentColor, border: `1px solid ${accentColor}50` }}
          >
            <Lock className="h-2.5 w-2.5" />
            {config.plan} · {config.price}
          </div>
          <p className="text-base sm:text-lg font-black text-foreground leading-tight">{config.headline}</p>
          <p className="text-xs sm:text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{config.description}</p>
        </div>
        <Link
          to="/billing"
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full text-sm font-black text-black whitespace-nowrap transition-transform hover:-translate-y-[1px] active:translate-y-0 w-full sm:w-auto"
          style={{
            background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
            boxShadow: `0 12px 28px -8px ${accentColor}90`,
          }}
        >
          <Sparkles className="h-4 w-4" />
          {user ? `Start 30-day trial` : `Start Free — 30 days`}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
