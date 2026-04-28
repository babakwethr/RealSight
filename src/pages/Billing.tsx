/**
 * Billing / Pricing page — the canonical 3-plan view per LAUNCH_PLAN.md §2.
 *
 *   Free User    $0 forever
 *   Investor Pro     $9 / mo  (launch $4 + 1st month free)
 *   Adviser Pro      $199 / mo (launch $99 first 6 months · 30-day trial)
 *
 * Redesigned 28 Apr 2026 to match the rest of the app's design language —
 * the previous build looked flat compared to the cinematic landing/dashboard
 * surfaces. Key moves:
 *
 *   • Generous 3-column grid with the Adviser Pro card visually elevated
 *     (taller, brighter halo, pill ribbon).
 *   • Aurora glow behind the card row so the section feels integrated with
 *     the cinematic background, not pasted onto it.
 *   • Feature lists grouped by category (Core / Intelligence / White-label /
 *     Adviser tools) — easier to scan than a flat 13-item list.
 *   • Comparison table now has section headers + hover rows.
 *   • Two callouts at the bottom: "Why Free stays generous" + a
 *     "Need help choosing?" matrix the user can self-route through.
 */
import { useState, useEffect } from 'react';
import {
  CheckCircle, Sparkles, ArrowRight, Lock, Check, Loader2, Building2, User,
  Crown, Gift, Bot, Zap, Shield, Globe, Users, FileText, Star,
  TrendingUp, MessageSquare,
} from 'lucide-react';
import { useSubscription, type PlanTier } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  PRICING,
  isLaunchPromoActive,
  promoDaysRemaining,
  formatPromoEndDate,
  fmtUsd,
} from '@/lib/pricing';

// ─── Plan definitions ─────────────────────────────────────────────────────────

type LaunchTier = Extract<PlanTier, 'free' | 'investor_pro' | 'adviser_pro'>;

interface FeatureGroup {
  label: string;
  items: { icon: typeof Check; text: string }[];
}

interface PlanDef {
  key: LaunchTier;
  icon: typeof User;
  name: string;
  tagline: string;
  price: string;
  priceLaunch?: string;
  priceSuffix: string;
  promo?: string;
  trial?: string;
  highlight?: 'investor' | 'adviser' | null;
  ribbon?: string;
  accent: string;
  accentSoft: string;
  groups: FeatureGroup[];
  ctaIfFree: string;
  ctaIfPaid: string;
}

const PLANS: PlanDef[] = [
  {
    key: 'free',
    icon: User,
    name: 'Free User',
    tagline: 'Everything you need to track and grow your portfolio.',
    price: '$0',
    priceSuffix: 'forever',
    accent: '#9CA3AF',
    accentSoft: 'rgba(156,163,175,0.10)',
    groups: [
      {
        label: 'Core',
        items: [
          { icon: Check, text: 'Unlimited properties in your portfolio' },
          { icon: FileText, text: 'Documents & payment tracking' },
          { icon: TrendingUp, text: 'Capital gain & monthly portfolio report' },
        ],
      },
      {
        label: 'Intelligence',
        items: [
          { icon: Globe, text: 'Markets — full DLD coverage' },
          { icon: Sparkles, text: 'Dubai Heatmap' },
          { icon: Bot, text: 'AI Concierge — unlimited' },
          { icon: FileText, text: 'Unlimited Deal Analyzer + branded PDF' },
          { icon: Building2, text: 'Off-plan projects browser' },
        ],
      },
    ],
    ctaIfFree: 'Your plan',
    ctaIfPaid: 'Included above',
  },
  {
    key: 'investor_pro',
    icon: Sparkles,
    name: 'Investor Pro',
    tagline: 'Free shows you the project. Pro shows you which units you can still buy — institutional-grade intelligence for serious investors.',
    // Prices come from src/lib/pricing.ts. Anchor $999, launch $499 (50% OFF).
    price:        fmtUsd(PRICING.investor_pro.regularUsd),
    priceLaunch:  fmtUsd(PRICING.investor_pro.launchUsd),
    priceSuffix:  '/ mo',
    promo:        `Launch promo · 50% OFF · ends ${formatPromoEndDate()}`,
    trial:        '30-day free trial · cancel anytime',
    highlight: 'investor',
    accent: '#18D6A4',
    accentSoft: 'rgba(24,214,164,0.10)',
    groups: [
      {
        label: 'Everything in Free, plus',
        items: [
          { icon: Zap, text: 'Live unit availability for every off-plan project' },
          { icon: Building2, text: 'Floor, view, and real-time price per unit' },
          { icon: Globe, text: 'Powered by Reelly inventory feed' },
          { icon: MessageSquare, text: 'New unit alerts' },
        ],
      },
    ],
    ctaIfFree: 'Try free for 30 days',
    ctaIfPaid: `Upgrade — ${fmtUsd(PRICING.investor_pro.launchUsd)} / mo`,
  },
  {
    key: 'adviser_pro',
    icon: Building2,
    name: 'Adviser Pro',
    tagline: 'Your white-label investor platform. Your brand. Your clients. Gift each client $499/mo of software — included in your seat.',
    // Prices from src/lib/pricing.ts. Anchor $199, launch $99 (50% OFF).
    price:        fmtUsd(PRICING.adviser_pro.regularUsd),
    priceLaunch:  fmtUsd(PRICING.adviser_pro.launchUsd),
    priceSuffix:  '/ mo',
    promo:        `Launch promo · 50% OFF · ends ${formatPromoEndDate()}`,
    trial:        '30-day free trial · cancel anytime',
    highlight: 'adviser',
    ribbon: 'The money product',
    accent: '#FFB020',
    accentSoft: 'rgba(255,176,32,0.10)',
    groups: [
      {
        label: 'Everything in Investor Pro, plus',
        items: [
          { icon: Globe, text: 'Branded workspace at realsight.app/a/yourname' },
          { icon: Sparkles, text: 'Your logo, brand colours, photo on every report' },
        ],
      },
      {
        label: 'Adviser tools',
        items: [
          { icon: Users, text: 'Unlimited investor clients' },
          { icon: Shield, text: 'Adviser dashboard — all clients in one view' },
          { icon: FileText, text: 'Branded reports + Area Pricing Report PDF' },
          { icon: Star, text: 'Opportunity Signals — AI flags units per client' },
          { icon: Globe, text: 'Public lead-gen page' },
          { icon: Zap, text: 'Bulk Deal Analyzer + WhatsApp share' },
          { icon: Crown, text: 'Priority support' },
        ],
      },
    ],
    ctaIfFree: 'Start 30-day free trial',
    ctaIfPaid: `Upgrade — ${fmtUsd(PRICING.adviser_pro.launchUsd)} / mo`,
  },
];

// ─── Comparison table data ───────────────────────────────────────────────────

interface CompareRow { feature: string; access: [boolean, boolean, boolean] }
interface CompareSection { label: string; rows: CompareRow[] }

const COMPARE_TABLE: CompareSection[] = [
  {
    label: 'Core',
    rows: [
      { feature: 'Unlimited portfolio · payments · documents', access: [true, true, true] },
      { feature: 'Markets, Dubai Heatmap, AI Concierge',       access: [true, true, true] },
      { feature: 'Deal Analyzer + branded PDF',                access: [true, true, true] },
      { feature: 'Off-plan projects browser',                  access: [true, true, true] },
    ],
  },
  {
    label: 'Live data',
    rows: [
      { feature: 'Live unit availability (Reelly)',            access: [false, true, true] },
      { feature: 'New unit alerts',                            access: [false, true, true] },
    ],
  },
  {
    label: 'White-label',
    rows: [
      { feature: 'Branded workspace URL + colours/logo',       access: [false, false, true] },
      { feature: 'Your logo & contact on every PDF',           access: [false, false, true] },
      { feature: 'Public lead-gen page',                       access: [false, false, true] },
    ],
  },
  {
    label: 'Adviser tools',
    rows: [
      { feature: 'Invite unlimited investor clients',          access: [false, false, true] },
      { feature: 'Adviser dashboard (all clients)',            access: [false, false, true] },
      { feature: 'Area Pricing Report PDF',                    access: [false, false, true] },
      { feature: 'Opportunity Signals (AI client matches)',    access: [false, false, true] },
      { feature: 'Bulk Deal Analyzer + WhatsApp share',        access: [false, false, true] },
      { feature: 'Priority support',                           access: [false, false, true] },
    ],
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
    <div className="relative pb-16 animate-fade-in">
      {/* Aurora glow underneath the plan row — matches the cinematic-bg of
          the rest of the app so the section reads as one piece, not pasted. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full blur-[120px] opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(24,214,164,0.18) 0%, rgba(123,92,255,0.10) 45%, transparent 70%)' }} />
      </div>

      {/* ───── HEADER ─────────────────────────────────────────────────── */}
      <section className="text-center max-w-3xl mx-auto pt-4 pb-10">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
          Simple, honest pricing.
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
          Free for investors. Real revenue from advisers. No tiers, no traps.
        </p>

        {/* Current-plan ribbon */}
        {currentPlan !== 'free' && (
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-bold text-primary">
            <CheckCircle className="h-3.5 w-3.5" />
            You're on <span className="text-foreground">{planName}</span>
          </div>
        )}
      </section>

      {/* ───── LAUNCH PROMO BANNER ──────────────────────────────────────
          Anchor pricing + 50% OFF · ends 31 May 2026. The countdown drives
          decision urgency; the side-by-side strikethrough shows what they
          save. Banner self-removes after the promo end-date. */}
      {isLaunchPromoActive() && (() => {
        const daysLeft = promoDaysRemaining();
        return (
          <section className="max-w-6xl mx-auto mb-12 px-1">
            <div
              className="relative rounded-2xl px-5 sm:px-6 py-4 sm:py-5 overflow-hidden"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,143,30,0.18) 0%, rgba(24,214,164,0.14) 50%, rgba(255,176,32,0.20) 100%)',
                border: '1px solid rgba(255,143,30,0.35)',
                boxShadow: '0 8px 40px -12px rgba(255,143,30,0.35)',
              }}
            >
              <div className="absolute inset-y-0 left-0 w-1.5"
                style={{ background: 'linear-gradient(180deg, #FFD25E, #FF8B25)' }} />

              <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FFD25E]/15 border border-[#FFD25E]/40 flex items-center justify-center">
                    <Crown className="h-4 w-4 text-[#FFD25E]" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-foreground">
                      Launch promo · 50% OFF
                    </p>
                    <p className="text-[10px] text-muted-foreground/85">
                      Ends {formatPromoEndDate()} · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                    </p>
                  </div>
                </div>

                <div className="hidden lg:block w-px h-10 bg-white/[0.08]" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2 flex-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#2effc0] shrink-0" />
                    <div>
                      <span className="text-foreground/90">Investor Pro · </span>
                      <span className="text-muted-foreground/55 line-through mr-1">{fmtUsd(PRICING.investor_pro.regularUsd)}</span>
                      <strong className="text-[#2effc0]">{fmtUsd(PRICING.investor_pro.launchUsd)}/mo</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-[#FFD15C] shrink-0" />
                    <div>
                      <span className="text-foreground/90">Adviser Pro · </span>
                      <span className="text-muted-foreground/55 line-through mr-1">{fmtUsd(PRICING.adviser_pro.regularUsd)}</span>
                      <strong className="text-[#FFD15C]">{fmtUsd(PRICING.adviser_pro.launchUsd)}/mo</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="h-3.5 w-3.5 text-[#FFD25E] shrink-0" />
                    <div>
                      <span className="text-foreground/90">Refer-a-friend · </span>
                      <strong className="text-[#FFD25E]">1 free month, both sides</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ───── PLAN CARDS ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-1 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {PLANS.map((plan, idx) => {
            const isCurrent      = plan.key === currentPlan;
            const isDowngrade    = idx < currentIndex;
            const isLoading      = upgrading === plan.key;
            const isFeatured     = plan.highlight === 'adviser';
            const Icon           = plan.icon;

            return (
              <div
                key={plan.key}
                className={cn(
                  'relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 group',
                  'hover:-translate-y-1',
                  isFeatured ? 'lg:-mt-4 lg:mb-0' : '',
                )}
                style={{
                  background: isFeatured
                    ? 'linear-gradient(165deg, rgba(255,176,32,0.18) 0%, rgba(15,18,40,0.96) 50%, rgba(10,12,30,0.98) 100%)'
                    : 'linear-gradient(165deg, rgba(255,255,255,0.05) 0%, rgba(15,18,40,0.85) 100%)',
                  border: `1px solid ${
                    isFeatured ? 'rgba(255,176,32,0.50)'
                      : isCurrent ? 'rgba(255,255,255,0.20)'
                        : 'rgba(255,255,255,0.08)'
                  }`,
                  boxShadow: isFeatured
                    ? '0 0 60px rgba(255,176,32,0.28), 0 16px 50px rgba(0,0,0,0.40)'
                    : '0 8px 28px rgba(0,0,0,0.25)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                }}
              >
                {/* Ribbon for the featured plan */}
                {plan.ribbon && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-b-lg text-[10px] font-black uppercase tracking-[0.18em] z-10"
                    style={{
                      background: 'linear-gradient(180deg, #FFD15C, #FF8A1F)',
                      color: '#0a0814',
                      boxShadow: '0 4px 14px rgba(255,176,32,0.55)',
                    }}
                  >
                    {plan.ribbon}
                  </div>
                )}

                {/* Top accent bar */}
                <div
                  className="h-[3px] w-full shrink-0"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${plan.accent}, transparent)`,
                  }}
                />

                {/* Card body */}
                <div className={cn(
                  'flex flex-col flex-1 p-7 sm:p-8',
                  plan.ribbon ? 'pt-9' : '',
                )}>
                  {/* Icon + 'your plan' / '50% OFF' badge */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{
                        background: `${plan.accent}1F`,
                        border: `1px solid ${plan.accent}40`,
                        color: plan.accent,
                        boxShadow: `0 4px 18px -6px ${plan.accent}55`,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {isCurrent ? (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.15em] bg-white/[0.07] text-white/70 border border-white/15">
                        Your plan
                      </span>
                    ) : (plan.priceLaunch && isLaunchPromoActive()) ? (
                      <span
                        className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.15em]"
                        style={{
                          background: `${plan.accent}25`,
                          color: plan.accent,
                          border: `1px solid ${plan.accent}60`,
                          boxShadow: `0 4px 14px -4px ${plan.accent}80`,
                        }}
                      >
                        50% OFF
                      </span>
                    ) : null}
                  </div>

                  {/* Name + tagline */}
                  <h3
                    className="text-2xl font-black tracking-tight text-foreground mb-2"
                    style={{ letterSpacing: '-0.025em' }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 min-h-[40px]">
                    {plan.tagline}
                  </p>

                  {/* Price */}
                  <div className="mb-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className="text-[56px] leading-none font-black text-foreground"
                        style={{ letterSpacing: '-0.05em' }}
                      >
                        {plan.priceLaunch ?? plan.price}
                      </span>
                      <span className="text-base text-muted-foreground font-medium">
                        {plan.priceSuffix}
                      </span>
                      {plan.priceLaunch && (
                        <span className="text-sm text-muted-foreground/55 line-through ml-1">
                          {plan.price}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Promo + trial */}
                  <div className="space-y-1 min-h-[42px] mb-7">
                    {plan.promo && (
                      <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: plan.accent }}>
                        {plan.promo}
                      </p>
                    )}
                    {plan.trial && (
                      <p className="text-[11px] text-muted-foreground/85">
                        {plan.trial}
                      </p>
                    )}
                  </div>

                  {/* Feature groups */}
                  <div className="space-y-5 mb-8 flex-1">
                    {plan.groups.map((g, gi) => (
                      <div key={gi}>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45 mb-2.5">
                          {g.label}
                        </p>
                        <ul className="space-y-2">
                          {g.items.map((f, fi) => {
                            const FIcon = f.icon;
                            return (
                              <li key={fi} className="flex items-start gap-2.5">
                                <span
                                  className="shrink-0 mt-0.5 flex items-center justify-center w-4 h-4 rounded"
                                  style={{
                                    background: `${plan.accent}22`,
                                    color: plan.accent,
                                  }}
                                >
                                  <FIcon className="h-3 w-3" />
                                </span>
                                <span className="text-[13px] text-foreground/85 leading-relaxed">
                                  {f.text}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold border border-white/[0.10] text-foreground/80 bg-white/[0.04] cursor-default"
                    >
                      <CheckCircle className="h-4 w-4 text-primary" /> {plan.ctaIfFree}
                    </button>
                  ) : isDowngrade ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-muted-foreground/40 bg-white/[0.02] border border-white/[0.04] cursor-default"
                    >
                      <Lock className="h-4 w-4" /> Included above
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={!!upgrading}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all duration-200 disabled:opacity-50',
                        isFeatured ? 'hover:-translate-y-[1px]' : 'hover:-translate-y-[1px]',
                      )}
                      style={
                        isFeatured
                          ? {
                              background: `linear-gradient(135deg, ${plan.accent}, #5C3FFF)`,
                              color: '#FFFFFF',
                              border: `1px solid ${plan.accent}80`,
                              boxShadow: `0 8px 32px ${plan.accent}55`,
                            }
                          : {
                              background: `${plan.accent}18`,
                              color: plan.accent,
                              border: `1px solid ${plan.accent}50`,
                            }
                      }
                    >
                      {isLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Sparkles className="h-4 w-4" />}
                      <span>
                        {isLoading
                          ? 'Redirecting…'
                          : currentPlan === 'free' ? plan.ctaIfFree : plan.ctaIfPaid}
                      </span>
                      {!isLoading && <ArrowRight className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───── COMPARISON TABLE ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-1 mb-14">
        <div className="rounded-3xl bg-white/[0.025] border border-white/[0.07] overflow-hidden backdrop-blur-md">
          <div className="px-6 sm:px-8 py-5 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight text-foreground">
              Compare every feature
            </h3>
            <p className="hidden sm:block text-xs text-muted-foreground">
              All prices are launch promo · USD
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.015]">
                  <th className="px-6 sm:px-8 py-4 text-left text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground/85">
                    Feature
                  </th>
                  {PLANS.map(p => (
                    <th
                      key={p.key}
                      className="px-3 py-4 text-center text-[12px] font-black uppercase tracking-[0.12em]"
                      style={{ color: p.accent }}
                    >
                      <div>{p.name}</div>
                      <div className="text-[10px] font-bold text-muted-foreground/70 normal-case mt-1">
                        {p.priceLaunch
                          ? <>{p.priceLaunch}<span className="text-[9px] ml-0.5">{p.priceSuffix.replace('/ ', '/')}</span></>
                          : p.price === '$0' ? 'free' : p.price}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_TABLE.flatMap((section) => [
                  // Section header — full-width row above the section's items
                  <tr key={`${section.label}-header`}>
                    <td colSpan={4} className="px-6 sm:px-8 pt-6 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/55">
                        {section.label}
                      </span>
                    </td>
                  </tr>,
                  // Section rows
                  ...section.rows.map((row, ri) => (
                    <tr
                      key={`${section.label}-${ri}`}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 sm:px-8 py-3 text-[13px] text-foreground/85 font-medium">
                        {row.feature}
                      </td>
                      {row.access.map((a, ai) => (
                        <td key={ai} className="px-3 py-3 text-center">
                          {a ? (
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                              style={{
                                background: `${PLANS[ai].accent}22`,
                                color: PLANS[ai].accent,
                              }}
                            >
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="text-white/15 text-base leading-none">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ───── BOTTOM CALLOUTS ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-1 grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
        {/* Why free stays generous */}
        <div
          className="relative rounded-3xl p-7 overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(24,214,164,0.10), rgba(15,18,40,0.85))',
            border: '1px solid rgba(24,214,164,0.22)',
          }}
        >
          <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-[#18d6a4]/12 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#18d6a4]/15 border border-[#18d6a4]/35 flex items-center justify-center">
                <Bot className="h-4 w-4 text-[#2effc0]" />
              </div>
              <h4 className="text-base font-black tracking-tight text-foreground">
                Why Free stays generous
              </h4>
            </div>
            <p className="text-[13px] text-foreground/80 leading-relaxed">
              The whole investor app is free, forever. Investors invite advisers,
              advisers convert to Adviser Pro — that's our business. We never paywall
              the tools you need to track and protect your own money.
            </p>
          </div>
        </div>

        {/* Need help choosing? */}
        <div
          className="relative rounded-3xl p-7 overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(255,176,32,0.10), rgba(15,18,40,0.85))',
            border: '1px solid rgba(255,176,32,0.24)',
          }}
        >
          <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-[#FFB020]/15 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#FFB020]/15 border border-[#FFB020]/40 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#FFD15C]" />
              </div>
              <h4 className="text-base font-black tracking-tight text-foreground">
                Not sure which plan?
              </h4>
            </div>
            <ul className="space-y-2.5 text-[13px] text-foreground/80 leading-relaxed">
              <li className="flex gap-2">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-white/30 mt-1.5" />
                <span>
                  <strong className="text-foreground">Investing for yourself?</strong>{' '}
                  Stay on Free. Add Investor Pro only when you start tracking off-plan.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#2effc0] mt-1.5" />
                <span>
                  <strong className="text-foreground">Buying off-plan?</strong>{' '}
                  Investor Pro pays for itself the first time you spot a unit before it sells.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#b6a4ff] mt-1.5" />
                <span>
                  <strong className="text-foreground">Advising clients?</strong>{' '}
                  Adviser Pro replaces 4 tools you're already paying for. 30-day trial, then $99/mo.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ───── FOOTER LINE ───────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground/85 text-center max-w-2xl mx-auto px-4">
        All prices in USD · Cancel any time · No long-term contracts · 30-day free trial on Adviser Pro
        <br />
        <span className="text-muted-foreground/55">
          Stripe-secured checkout · receipts emailed instantly · we never see your card
        </span>
      </p>
    </div>
  );
}
