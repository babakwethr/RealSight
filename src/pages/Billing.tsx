import { useState, useEffect } from 'react';
import {
  CheckCircle, Sparkles, ArrowRight, Lock, Check, Zap, Loader2,
} from 'lucide-react';
import { useSubscription, PlanTier } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

// ─── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'free' as PlanTier,
    name: 'Explorer',
    price: null,
    label: 'Free forever',
    color: 'text-muted-foreground',
    border: 'border-border/30',
    features: [
      'Dashboard & Portfolio tracking',
      'Market Pulse (live DLD data)',
      'New Launches browsing',
      'AI Concierge (limited)',
      'Payment schedule tracking',
    ],
  },
  {
    key: 'portfolio_pro' as PlanTier,
    name: 'Portfolio Pro',
    price: 29,
    label: '$29 / month',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    badge: 'Most Popular',
    features: [
      'Everything in Explorer',
      'Market Intelligence & Index',
      'Dubai Heatmap',
      'Deal Analyzer',
      'Watchlist & Compare Projects',
      'New Launches — unit availability',
    ],
  },
  {
    key: 'adviser_starter' as PlanTier,
    name: 'Adviser Starter',
    price: 99,
    label: '$99 / month',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    features: [
      'Everything in Portfolio Pro',
      'Global Investment Radar',
      'Opportunity Signals',
      'Top Picks curation',
      'Unlimited AI Concierge',
      'New Launches — share feature',
    ],
  },
  {
    key: 'adviser_pro' as PlanTier,
    name: 'Adviser Pro',
    price: 199,
    label: '$199 / month',
    color: 'text-primary',
    border: 'border-primary/30',
    features: [
      'Everything in Adviser Starter',
      'AI Investor Presentation (PDF)',
      'AI Market Analysis',
      'WhatsApp + email sharing',
      'Priority support',
    ],
  },
]

export default function Billing() {
  const { plan: currentPlan, planName } = useSubscription()
  const [upgrading, setUpgrading] = useState<PlanTier | null>(null)
  const [searchParams] = useSearchParams()
  const currentIndex = PLANS.findIndex(p => p.key === currentPlan)

  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      toast.success('Plan upgraded! Your new features are now active.', { duration: 6000 })
    }
  }, [searchParams])

  const handleUpgrade = async (planKey: PlanTier) => {
    if (planKey === 'free' || planKey === currentPlan) return
    setUpgrading(planKey)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: planKey,
            success_url: `${window.location.origin}/billing?upgraded=1`,
            cancel_url:  `${window.location.origin}/billing`,
          }),
        }
      )
      const payload = await res.json().catch(() => ({}))
      const { url, error } = payload as { url?: string; error?: string }
      if (error) throw new Error(error)
      if (!url) {
        // The edge function returned no URL — almost always because Stripe isn't configured yet.
        toast.error(
          'Checkout is not available yet. Please contact support to enable upgrades.',
          { duration: 6000 }
        )
        return
      }
      window.location.href = url
    } catch (err: any) {
      toast.error(err.message || 'Could not start checkout. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  const spotlights = [
    {
      emoji: '🎯',
      title: 'Deal Analyzer',
      desc: 'Paste any Bayut or Property Finder link. Get an AI investment verdict, area comps, yield scenarios, and a branded PDF report in seconds.',
      badge: 'Exclusive',
      color: '#22C55E',
    },
    {
      emoji: '⚡',
      title: 'Market Score',
      desc: 'A proprietary 0–10 score computed from live DLD data. Know exactly whether Dubai is a Strong Buy, Bullish, Neutral, or Cautious market today.',
      badge: 'Exclusive',
      color: '#A855F7',
    },
    {
      emoji: '📊',
      title: 'AI Investor Presentation',
      desc: 'Generate a professional 8-slide branded PDF for any property in seconds. Your name, phone, and agency on every page. Ready to send to clients.',
      badge: 'Adviser Pro',
      color: '#F59E0B',
    },
    {
      emoji: '🗺️',
      title: 'Interactive Dubai Heatmap',
      desc: '5 data layers — price growth, rental yield, demand, liquidity, and price trend. Every area color-coded and ranked in real time.',
      badge: 'Portfolio Pro',
      color: '#3B82F6',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-1">
            Pick the plan that matches how you use RealSight. Upgrade or cancel any time.
          </p>
        </div>
      </div>

      <div className="space-y-16 pt-2">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-5">
            <CheckCircle className="h-3.5 w-3.5" />
            30-day free trial · No credit card required · Cancel anytime
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4" style={{ letterSpacing: '-0.03em' }}>
            Invest smarter.<br />
            <span className="gradient-heading">Start free today.</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
            Real DLD transaction data, AI-powered deal analysis, and professional reports —
            built for Dubai investors and real estate advisers.
          </p>
          {currentPlan !== 'free' && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Current plan: <span className="text-primary">{planName}</span></span>
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map((plan, idx) => {
            const isCurrent = plan.key === currentPlan
            const isDowngrade = idx < currentIndex
            const isLoading = upgrading === plan.key
            const isHighlighted = plan.key === 'adviser_starter'
            const planAccent = plan.key === 'free' ? '#64748B' : plan.key === 'portfolio_pro' ? '#C9A84C' : plan.key === 'adviser_starter' ? '#22C55E' : '#A855F7'

            return (
              <div key={plan.key}
                className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                  isHighlighted
                    ? 'shadow-[0_0_40px_rgba(34,197,94,0.15),0_8px_32px_rgba(0,0,0,0.3)]'
                    : 'shadow-[0_4px_24px_rgba(0,0,0,0.2)]'
                }`}
                style={{
                  background: isHighlighted
                    ? 'linear-gradient(160deg, rgba(34,197,94,0.12) 0%, rgba(15,28,46,0.98) 40%)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isHighlighted ? 'rgba(34,197,94,0.35)' : isCurrent ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {/* Top accent line */}
                <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${planAccent}80, ${planAccent}, ${planAccent}80)` }} />

                <div className="p-6 flex flex-col flex-1">
                  {/* Badge */}
                  <div className="flex items-center justify-between mb-4">
                    {plan.badge
                      ? <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: `${planAccent}20`, color: planAccent, border: `1px solid ${planAccent}40` }}>{plan.badge}</span>
                      : isCurrent
                        ? <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-white/10 text-white/60 border border-white/10">Your Plan</span>
                        : <span />
                    }
                    {plan.price && currentPlan === 'free' && <span className="text-[10px] font-bold text-emerald-400">30 days free</span>}
                  </div>

                  {/* Name */}
                  <p className="text-xs font-black uppercase tracking-[0.15em] mb-2" style={{ color: planAccent }}>{plan.name}</p>

                  {/* Price */}
                  <div className="mb-5">
                    {plan.price
                      ? <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-foreground" style={{ fontFamily: 'Berkeley Mono, monospace', letterSpacing: '-0.04em' }}>${plan.price}</span>
                            <span className="text-sm text-muted-foreground">/mo</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {currentPlan === 'free' ? `30 days free, then $${plan.price}/mo` : 'Billed monthly · cancel anytime'}
                          </p>
                        </>
                      : <>
                          <span className="text-5xl font-black text-foreground" style={{ fontFamily: 'Berkeley Mono, monospace', letterSpacing: '-0.04em' }}>Free</span>
                          <p className="text-[10px] text-muted-foreground mt-1">Forever free · no credit card</p>
                        </>
                    }
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-foreground/75">
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: planAccent }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent
                    ? <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border border-white/[0.08] text-muted-foreground bg-white/[0.03] cursor-default">
                        <CheckCircle className="h-3.5 w-3.5 text-primary" /> Current Plan
                      </button>
                    : isDowngrade
                      ? <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-muted-foreground/30 cursor-default">
                          <Lock className="h-3.5 w-3.5" /> Included above
                        </button>
                      : <button onClick={() => handleUpgrade(plan.key)} disabled={!!upgrading}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-50"
                          style={{
                            background: isHighlighted ? '#22C55E' : `${planAccent}20`,
                            color: isHighlighted ? '#0B1120' : planAccent,
                            border: `1px solid ${planAccent}40`,
                            boxShadow: isHighlighted ? '0 4px 20px rgba(34,197,94,0.3)' : 'none',
                          }}>
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          {isLoading ? 'Redirecting…' : currentPlan === 'free' ? 'Try Free — 30 days' : `Upgrade — $${plan.price}/mo`}
                          {!isLoading && <ArrowRight className="h-4 w-4" />}
                        </button>
                  }
                </div>
              </div>
            )
          })}
        </div>

        {/* Unique Features Spotlight */}
        <div>
          <div className="text-center mb-8">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-primary mb-2">Only on RealSight</p>
            <h3 className="text-2xl font-black text-foreground" style={{ letterSpacing: '-0.02em' }}>
              Intelligence tools you won't find anywhere else
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spotlights.map(s => (
              <div key={s.title} className="flex gap-4 rounded-2xl p-5 backdrop-blur-md"
                style={{ background: `${s.color}08`, border: `1px solid ${s.color}25` }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-black text-foreground">{s.title}</h4>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}30` }}>{s.badge}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <h3 className="text-base font-black text-foreground">Full Feature Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="px-6 py-3 text-left text-xs font-black text-muted-foreground">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.key} className={`px-4 py-3 text-center text-xs font-black ${p.color}`}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Portfolio & Payment Tracking', access: [true, true, true, true] },
                  { feature: 'New Launches browsing', access: [true, true, true, true] },
                  { feature: 'AI Concierge', access: ['Limited', true, 'Unlimited', 'Unlimited'] },
                  { feature: 'Market Intelligence & Index', access: [false, true, true, true] },
                  { feature: 'Dubai Heatmap (5 layers)', access: [false, true, true, true] },
                  { feature: 'Deal Analyzer — AI verdict', access: [false, true, true, true] },
                  { feature: 'Deal Analyzer — PDF report', access: [false, true, true, true] },
                  { feature: 'Watchlist & Compare', access: [false, true, true, true] },
                  { feature: 'New Launches — unit availability', access: [false, true, true, true] },
                  { feature: 'Opportunity Signals', access: [false, false, true, true] },
                  { feature: 'Global Radar (5 markets)', access: [false, false, true, true] },
                  { feature: 'Top Picks curation', access: [false, false, true, true] },
                  { feature: 'AI Investor Presentation PDF', access: [false, false, false, true] },
                  { feature: 'AI Market Analysis Reports', access: [false, false, false, true] },
                ].map((row, ri) => (
                  <tr key={ri} className={`border-b border-white/[0.04] ${ri % 2 !== 0 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="px-6 py-3 text-xs text-foreground/80 font-medium">{row.feature}</td>
                    {row.access.map((a, ai) => (
                      <td key={ai} className="px-4 py-3 text-center">
                        {a === true
                          ? <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                          : a === false
                            ? <span className="text-white/15 text-lg leading-none">—</span>
                            : <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">{a}</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          All plans billed monthly in USD · Cancel any time · No long-term contracts · 30-day trial on paid plans
        </p>
      </div>
    </div>
  )
}
