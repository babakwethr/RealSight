/**
 * Billing / Pricing page — the canonical 3-plan view per LAUNCH_PLAN.md §2.
 *
 *   Free Investor    $0 forever          Mass signup. The whole investor app.
 *   Investor Pro     $9 / mo (launch $4) Adds live off-plan unit availability.
 *   Adviser Pro      $199 / mo (launch $99 first 6 months)  White-label.
 *
 * Launch promos are real ribbons on the cards — first 1,000 users get
 * "Founder" status, refer-a-friend gives 1 free month, etc. (see §6).
 *
 * Stripe wiring is kept as-is; checkout will start working once we configure
 * the price IDs on the edge function (§13.3).
 */
import { useState, useEffect } from 'react';
import {
  CheckCircle, Sparkles, ArrowRight, Lock, Check, Loader2, Building2, User,
  Crown, Gift, Bot,
} from 'lucide-react';
import { useSubscription, type PlanTier } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

// ─── Plan definitions ─────────────────────────────────────────────────────────

type LaunchTier = Extract<PlanTier, 'free' | 'investor_pro' | 'adviser_pro'>;

interface PlanDef {
  key: LaunchTier;
  icon: typeof User;
  name: string;
  tagline: string;
  price: string;
  priceLaunch?: string;
  priceSuffix: string;
  promo?: string;
  highlight?: 'investor' | 'adviser' | null;
  accent: string;
  features: string[];
  ctaIfFree: string;
  ctaIfPaid: string;
}

const PLANS: PlanDef[] = [
  {
    key: 'free',
    icon: User,
    name: 'Free Investor',
    tagline: 'Everything you need to track and grow your portfolio.',
    price: '$0',
    priceSuffix: 'forever',
    accent: '#64748B',
    features: [
      'Unlimited properties in your portfolio',
      'Unlimited Deal Analyzer + branded PDF',
      'Markets — full DLD coverage',
      'Dubai Heatmap',
      'AI Concierge — unlimited',
      'Documents + Payment tracking',
      'Off-plan projects browser',
      'Capital gain & monthly portfolio report',
    ],
    ctaIfFree: 'Your plan',
    ctaIfPaid: 'Included above',
  },
  {
    key: 'investor_pro',
    icon: Sparkles,
    name: 'Investor Pro',
    tagline: 'Free shows you the project. Pro shows you which units you can still buy.',
    price: '$9',
    priceLaunch: '$4',
    priceSuffix: '/ mo',
    promo: 'Launch price · first month free',
    highlight: 'investor',
    accent: '#18D6A4',
    features: [
      'Everything in Free Investor',
      'Live unit availability for every off-plan project',
      'Floor, view, and real-time price per unit',
      'Powered by Reelly inventory feed',
      'New unit alerts',
    ],
    ctaIfFree: 'Try free for 30 days',
    ctaIfPaid: 'Upgrade — $9 / mo',
  },
  {
    key: 'adviser_pro',
    icon: Building2,
    name: 'Adviser Pro',
    tagline: 'Your white-label investor platform. Your brand. Your clients.',
    price: '$199',
    priceLaunch: '$99',
    priceSuffix: '/ mo',
    promo: 'Launch price · first 6 months · 30-day free trial',
    highlight: 'adviser',
    accent: '#7B5CFF',
    features: [
      'Everything in Investor Pro',
      'Custom subdomain (you.realsight.app)',
      'Your logo, brand colours, photo on every report',
      'Unlimited investor clients',
      'Adviser dashboard — all clients in one view',
      'Branded reports + Area Pricing Report PDF',
      'Opportunity Signals — AI flags units per client',
      'Public lead-gen page',
      'Bulk Deal Analyzer + WhatsApp share',
      'Priority support',
    ],
    ctaIfFree: 'Start 30-day free trial',
    ctaIfPaid: 'Upgrade — $199 / mo',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Billing() {
  const { plan: currentPlan, planName } = useSubscription();
  const [upgrading, setUpgrading] = useState<LaunchTier | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      toast.success('Plan upgraded — your new features are live.', { duration: 6000 });
    }
  }, [searchParams]);

  const handleUpgrade = async (planKey: LaunchTier) => {
    if (planKey === 'free' || planKey === currentPlan) return;
    setUpgrading(planKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan: planKey,
            success_url: `${window.location.origin}/billing?upgraded=1`,
            cancel_url:  `${window.location.origin}/billing`,
          }),
        }
      );
      const payload = await res.json().catch(() => ({}));
      const { url, error } = payload as { url?: string; error?: string };
      if (error) throw new Error(error);
      if (!url) {
        toast.error(
          'Checkout is launching soon. Email support@realsight.app to start your subscription manually.',
          { duration: 7000 }
        );
        return;
      }
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start checkout.';
      toast.error(msg);
    } finally {
      setUpgrading(null);
    }
  };

  const tierIndex: Record<LaunchTier, number> = { free: 0, investor_pro: 1, adviser_pro: 2 };
  const currentIndex = tierIndex[(currentPlan as LaunchTier) ?? 'free'] ?? 0;

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Header + launch promo banner */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pricing</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Free for investors. Real revenue from advisers. No tiers, no traps.
        </p>
      </div>

      {/* Launch promo banner — visible during the first 90 days */}
      <div
        className="rounded-2xl px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2"
        style={{
          background: 'linear-gradient(90deg, rgba(24,214,164,0.18), rgba(123,92,255,0.12))',
          border: '1px solid rgba(24,214,164,0.30)',
        }}
      >
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-[#FFD25E]" />
          <span className="text-xs font-black uppercase tracking-[0.15em] text-foreground">Launch promo · first 90 days</span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground/80">
          <span>First 1,000 signups get <strong className="text-[#FFD25E]">Founder status</strong></span>
          <span>Investor Pro <strong className="text-[#2effc0]">$4 / mo + 1st month free</strong></span>
          <span>Adviser Pro <strong className="text-[#b6a4ff]">$99 / mo for 6 months</strong></span>
          <span><Gift className="inline h-3.5 w-3.5 mr-1 text-[#FFD25E]" />Refer a friend = 1 free month (both sides)</span>
        </div>
      </div>

      {/* Current plan ribbon */}
      {currentPlan !== 'free' && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            <CheckCircle className="h-3.5 w-3.5" />
            Current plan: <span className="text-foreground">{planName}</span>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan, idx) => {
          const isCurrent  = plan.key === currentPlan;
          const isDowngrade = idx < currentIndex;
          const isLoading  = upgrading === plan.key;
          const isHighlighted = plan.highlight === 'adviser';
          const Icon = plan.icon;

          return (
            <div
              key={plan.key}
              className="relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: isHighlighted
                  ? 'linear-gradient(160deg, rgba(123,92,255,0.12) 0%, rgba(15,28,46,0.98) 45%)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isHighlighted ? 'rgba(123,92,255,0.40)' : isCurrent ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isHighlighted
                  ? '0 0 40px rgba(123,92,255,0.18), 0 8px 32px rgba(0,0,0,0.3)'
                  : '0 4px 24px rgba(0,0,0,0.2)',
              }}
            >
              {/* Top accent bar */}
              <div
                className="h-[3px] w-full"
                style={{ background: `linear-gradient(90deg, ${plan.accent}80, ${plan.accent}, ${plan.accent}80)` }}
              />

              <div className="p-6 flex flex-col flex-1">
                {/* Top row — icon + 'Most popular' or current badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${plan.accent}15`, border: `1px solid ${plan.accent}30`, color: plan.accent }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {isHighlighted ? (
                    <span
                      className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider"
                      style={{ background: `${plan.accent}20`, color: plan.accent, border: `1px solid ${plan.accent}40` }}
                    >
                      The money product
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-white/10 text-white/60 border border-white/10">
                      Your plan
                    </span>
                  ) : null}
                </div>

                {/* Name + tagline */}
                <h3 className="text-lg font-black text-foreground mb-1">{plan.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-5 min-h-[36px]">{plan.tagline}</p>

                {/* Price */}
                <div className="mb-1">
                  {plan.priceLaunch ? (
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-5xl font-black text-foreground"
                        style={{ fontFamily: 'Berkeley Mono, monospace', letterSpacing: '-0.04em' }}
                      >
                        {plan.priceLaunch}
                      </span>
                      <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                      <span className="text-xs text-muted-foreground line-through ml-1">{plan.price}</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-5xl font-black text-foreground"
                        style={{ fontFamily: 'Berkeley Mono, monospace', letterSpacing: '-0.04em' }}
                      >
                        {plan.price}
                      </span>
                      <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                    </div>
                  )}
                </div>
                {plan.promo && (
                  <p className="text-[10px] font-bold mb-5" style={{ color: plan.accent }}>{plan.promo}</p>
                )}
                {!plan.promo && <div className="mb-5" />}

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-foreground/80">
                      <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: plan.accent }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border border-white/[0.08] text-muted-foreground bg-white/[0.03] cursor-default"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-primary" /> {plan.ctaIfFree}
                  </button>
                ) : isDowngrade ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-muted-foreground/30 cursor-default"
                  >
                    <Lock className="h-3.5 w-3.5" /> {plan.ctaIfPaid}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={!!upgrading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-50"
                    style={{
                      background: isHighlighted ? plan.accent : `${plan.accent}20`,
                      color: isHighlighted ? '#FFFFFF' : plan.accent,
                      border: `1px solid ${plan.accent}40`,
                      boxShadow: isHighlighted ? `0 4px 20px ${plan.accent}40` : 'none',
                    }}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isLoading ? 'Redirecting…' : currentPlan === 'free' ? plan.ctaIfFree : plan.ctaIfPaid}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <h3 className="text-base font-black text-foreground">Compare plans</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                <th className="px-6 py-3 text-left text-xs font-black text-muted-foreground">Feature</th>
                {PLANS.map(p => (
                  <th key={p.key} className="px-4 py-3 text-center text-xs font-black" style={{ color: p.accent }}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Unlimited portfolio + payments + documents', access: [true, true, true] },
                { feature: 'Markets, Dubai Heatmap, AI Concierge', access: [true, true, true] },
                { feature: 'Deal Analyzer + branded PDF', access: [true, true, true] },
                { feature: 'Off-plan projects browser', access: [true, true, true] },
                { feature: 'Live unit availability (Reelly)', access: [false, true, true] },
                { feature: 'Custom subdomain + branding', access: [false, false, true] },
                { feature: 'Invite unlimited investor clients', access: [false, false, true] },
                { feature: 'Adviser dashboard (all clients)', access: [false, false, true] },
                { feature: 'Area Pricing Report PDF', access: [false, false, true] },
                { feature: 'Opportunity Signals (AI client matches)', access: [false, false, true] },
                { feature: 'Bulk Deal Analyzer + WhatsApp share', access: [false, false, true] },
                { feature: 'Public lead-gen page', access: [false, false, true] },
                { feature: 'Priority support', access: [false, false, true] },
              ].map((row, ri) => (
                <tr key={ri} className={`border-b border-white/[0.04] ${ri % 2 !== 0 ? 'bg-white/[0.01]' : ''}`}>
                  <td className="px-6 py-3 text-xs text-foreground/80 font-medium">{row.feature}</td>
                  {row.access.map((a, ai) => (
                    <td key={ai} className="px-4 py-3 text-center">
                      {a === true ? (
                        <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-white/15 text-lg leading-none">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* The free moat callout */}
      <div className="rounded-2xl p-6 flex items-start gap-4" style={{ background: 'rgba(24,214,164,0.06)', border: '1px solid rgba(24,214,164,0.18)' }}>
        <Bot className="h-6 w-6 text-[#2effc0] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black text-foreground mb-1">Why Free stays generous</p>
          <p className="text-xs text-foreground/75 leading-relaxed">
            The whole investor app is free, forever. Investors invite advisers, advisers
            convert to Adviser Pro — that's our business. We never paywall the tools you
            need to track and protect your own money.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        All prices in USD · Cancel any time · No long-term contracts · 30-day free trial on Adviser Pro
      </p>
    </div>
  );
}
