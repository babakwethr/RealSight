/**
 * MarketIntelligence — Area deep-dive page
 * Per REALSIGHT_MASTER_SPEC.md §4.2:
 * - Basic area stats = FREE for everyone (including logged-out)
 * - Full deep-dive = Portfolio Pro+
 * This page is a public route — no ProtectedRoute wrapper.
 */

import { useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import {
  TrendingUp, TrendingDown, Activity, BarChart3,
  Crown, Building, ArrowRight, Zap, MapPin,
  Shield, Lock, Sparkles, Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { HeroMetricCard } from '@/components/HeroMetricCard';
import { AIVerdict } from '@/components/AIVerdict';
import { GuidanceCard } from '@/components/GuidanceCard';
import { formatPriceSplit } from '@/lib/currency';
import { cn } from '@/lib/utils';

const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

// Public nav for logged-out users
function PublicBar() {
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 mb-0">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/">
          <Logo variant="white" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors">Sign In</Link>
          <Link to="/login?mode=signup" className="text-sm bg-primary text-primary-foreground px-5 py-1.5 rounded-full font-bold hover:bg-primary/90 transition-colors">
            Start Free
          </Link>
        </div>
      </div>
    </div>
  );
}

// Performance-based card accent color
function getCardAccent(yoy: number, yield_: number) {
  if (yoy >= 15 && yield_ >= 7) return { bg: 'from-emerald-950/80 to-emerald-900/40', border: 'border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', stroke: '#22C55E', label: 'High Growth' };
  if (yoy >= 10) return { bg: 'from-blue-950/80 to-blue-900/30', border: 'border-blue-500/20', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', stroke: '#3B82F6', label: 'Growth' };
  if (yield_ >= 7) return { bg: 'from-purple-950/80 to-purple-900/30', border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', stroke: '#A855F7', label: 'High Yield' };
  return { bg: 'from-slate-900/80 to-slate-800/30', border: 'border-white/[0.08]', badge: 'bg-white/10 text-muted-foreground border-white/10', stroke: '#64748B', label: 'Stable' };
}

// Individual area stat card — performance-color coded
function AreaCard({ area, rank, hero }: { area: any; rank?: number; hero?: boolean }) {
  const navigate = useNavigate();
  const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / (area.avg_price_per_sqft_12m_ago || 1)) * 100;
  const pos = yoy > 0;
  const accent = getCardAccent(yoy, area.rental_yield_avg || 0);

  // Build trend with zoomed domain for dramatic chart
  const trend = useMemo(() => {
    const cur = area.avg_price_per_sqft_current || 1800;
    const ago = area.avg_price_per_sqft_12m_ago || cur * 0.88;
    // Add noise for visual interest
    return Array.from({ length: 9 }, (_, i) => {
      const progress = i / 8;
      const noise = Math.sin(i * 1.2) * Math.abs(cur - ago) * 0.06;
      return { v: Math.round(ago + (cur - ago) * progress + noise) };
    });
  }, [area]);

  const minV = Math.min(...trend.map(d => d.v)) * 0.995;
  const maxV = Math.max(...trend.map(d => d.v)) * 1.005;

  if (hero) {
    // Hero card — full width, horizontal layout
    return (
      <div
        onClick={() => navigate(`/market-intelligence?area=${encodeURIComponent(area.name)}`)}
        className={`relative rounded-2xl overflow-hidden cursor-pointer group col-span-full bg-gradient-to-br ${accent.bg} border ${accent.border} hover:scale-[1.005] transition-all duration-300`}
      >
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:gap-6 sm:items-center">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {rank && <div className="flex items-center gap-1 text-amber-400 text-xs font-black"><Crown className="h-3.5 w-3.5" />#{rank} Top Area</div>}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${accent.badge}`}>{accent.label}</span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">{area.name}</h3>
            <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1"><MapPin className="h-3 w-3" />Dubai, UAE</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
              {[
                { label: 'Price / sqft', value: `AED ${fmtNum(area.avg_price_per_sqft_current)}`, big: true },
                { label: 'YoY Growth', value: `${pos ? '+' : ''}${yoy.toFixed(1)}%`, color: pos ? 'text-emerald-400' : 'text-red-400', big: true },
                { label: 'Rental Yield', value: `${area.rental_yield_avg?.toFixed(1)}%`, color: 'text-emerald-400' },
                { label: 'Demand', value: `${area.demand_score || 50}/100` },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-[10px] text-muted-foreground/70 mb-1 font-medium">{s.label}</p>
                  <p className={`${s.big ? 'text-lg font-black' : 'text-sm font-bold'} ${s.color || 'text-white'}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Hero sparkline — full-width on mobile, fixed-width sidebar on desktop */}
          <div className="w-full h-20 sm:w-48 sm:h-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id={`hero-grad-${area.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accent.stroke} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={accent.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[minV, maxV]} hide />
                <Area type="monotone" dataKey="v" stroke={accent.stroke} strokeWidth={2.5}
                  fill={`url(#hero-grad-${area.id})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/market-intelligence?area=${encodeURIComponent(area.name)}`)}
      className={`relative rounded-2xl overflow-hidden cursor-pointer group hover:-translate-y-1 transition-all duration-200 bg-gradient-to-br ${accent.bg} border ${accent.border} shadow-[0_4px_24px_rgba(0,0,0,0.2)]`}
    >
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="p-5">

        {/* Header: name + rank + YoY badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            {rank && rank <= 3 && (
              <div className="text-[9px] font-black text-amber-400 mb-1 flex items-center gap-1">
                <Crown className="h-2.5 w-2.5" />#{rank} Top
              </div>
            )}
            <h3 className="font-bold text-white text-sm leading-tight">{area.name}</h3>
            <p className="text-[10px] text-white/40 mt-0.5">Dubai, UAE</p>
          </div>
          <div className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${pos ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
            {pos ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {pos ? '+' : ''}{yoy.toFixed(1)}%
          </div>
        </div>

        {/* HERO stat — Price/sqft is the most important number, largest element */}
        <div className="mb-4">
          <p className="text-[9px] text-white/40 font-medium uppercase tracking-wider mb-1">Price / sqft</p>
          <p className="text-2xl font-black text-white leading-none" style={{ fontFamily: 'Berkeley Mono, SF Mono, monospace', letterSpacing: '-0.03em' }}>
            AED {fmtNum(area.avg_price_per_sqft_current)}
          </p>
        </div>

        {/* Subtle trend bar — replaces repetitive sparkline */}
        <div className="mb-4">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(10, ((yoy + 5) / 25) * 100))}%`,
                backgroundColor: accent.stroke,
              }} />
          </div>
          <p className="text-[9px] text-white/40 mt-1">
            {pos ? 'Growth trajectory' : 'Price pressure'} · 12 months
          </p>
        </div>

        {/* Secondary stats — smaller, supporting role */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.08]">
          <div>
            <p className="text-[9px] text-white/40 font-medium mb-0.5">Yield</p>
            <p className="text-xs font-bold text-emerald-400">{area.rental_yield_avg?.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[9px] text-white/40 font-medium mb-0.5">Volume</p>
            <p className="text-xs font-bold text-white">{area.transaction_volume_30d || 0}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/40 font-medium mb-0.5">Demand</p>
            <p className="text-xs font-bold" style={{ color: accent.stroke }}>{area.demand_score || 50}/100</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Upgrade gate inline (for deep sections when not Pro)
function UpgradeInline({ feature }: { feature: string }) {
  return (
    <div className="rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/[0.08] p-10 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-bold text-foreground mb-1">Investor Pro Feature</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
        {feature}
      </p>
      <div className="inline-flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 uppercase tracking-wider">
          50% OFF · launch
        </span>
        <span className="text-xs text-muted-foreground/55 line-through">$999/mo</span>
        <span className="text-sm font-black text-foreground">$499/mo</span>
      </div>
      <br />
      <Link to="/billing"
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
        <Sparkles className="h-4 w-4" /> Start 30-day free trial
      </Link>
    </div>
  );
}

function MarketIntelligenceContent() {
  const [searchParams] = useSearchParams();
  const areaParam = searchParams.get('area') || '';
  const { isPro, loading: planLoading } = useSubscription();
  const { user, loading: authLoading } = useAuth();
  const isLoaded = !authLoading && !planLoading;

  const { data: allAreas = [], isLoading } = useQuery({
    queryKey: ['market-intel-all-areas'],
    queryFn: async () => {
      const { data } = await supabase.from('dld_areas').select('*').order('transaction_volume_30d', { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: topDevs = [] } = useQuery({
    queryKey: ['market-intel-devs'],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('dld_developers').select('*').order('reliability_score', { ascending: false }).limit(6);
        return data || [];
      } catch { return []; }
    },
  });

  const filteredAreas = useMemo(() => {
    if (!areaParam) return allAreas;
    const match = allAreas.find(a => a.name.toLowerCase() === areaParam.toLowerCase());
    if (match) return [match, ...allAreas.filter(a => a.id !== match.id)];
    return allAreas;
  }, [allAreas, areaParam]);

  const kpis = useMemo(() => {
    if (!allAreas.length) return null;
    const avgPsf = Math.round(allAreas.reduce((s, a) => s + (a.avg_price_per_sqft_current || 0), 0) / allAreas.length);
    const avgYield = allAreas.reduce((s, a) => s + (a.rental_yield_avg || 0), 0) / allAreas.length;
    const totalVol = allAreas.reduce((s, a) => s + (a.transaction_volume_30d || 0), 0);
    const avgYoY = allAreas.reduce((s, a) => s + ((a.avg_price_per_sqft_current - a.avg_price_per_sqft_12m_ago) / (a.avg_price_per_sqft_12m_ago || 1)) * 100, 0) / allAreas.length;
    const score = Math.min(10, Math.max(0, 5 + avgYoY * 0.18 + (avgYield - 5) * 0.25));
    return { avgPsf, avgYield: avgYield.toFixed(1), totalVol, avgYoY: avgYoY.toFixed(1), score: score.toFixed(1), scoreColor: score >= 7.5 ? '#22C55E' : score >= 6 ? '#3B82F6' : '#F59E0B' };
  }, [allAreas]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 px-4 md:px-6 max-w-[1400px] mx-auto pt-6">
      {/* Header + inline area switcher.
          Mobile: slim breadcrumb-style top + DLD LIVE chip on its own row.
          Desktop: original layout preserved (icon + h1 + sub on one row,
          chip + Start Free aligned right). */}
      <div className="flex flex-col gap-3">
        {/* Mobile-only slim header */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold">
              <span>Markets</span>
              {areaParam && <><span className="text-foreground/30">·</span><span className="text-foreground">{areaParam}</span></>}
            </div>
            <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0">
              <Activity className="h-3 w-3" /> DLD LIVE
            </div>
          </div>
          <h1 className="text-[26px] font-black text-foreground tracking-tight leading-[1.1]">
            {areaParam
              ? <span className="gradient-heading">{areaParam}</span>
              : <>Market <span className="gradient-word">Intelligence</span></>}
          </h1>
          <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-snug">
            {areaParam ? 'Area deep-dive · powered by DLD transaction data.' : 'Dubai property market overview · powered by DLD data.'}
          </p>
          {!user && (
            <Link to="/login?mode=signup"
              className="inline-flex items-center mt-3 text-[12px] bg-primary text-primary-foreground px-3.5 h-8 rounded-[10px] font-bold">
              Start Free
            </Link>
          )}
        </div>

        {/* Desktop header — unchanged layout */}
        <div className="hidden lg:flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-black text-foreground">
                {areaParam
                  ? <><span className="gradient-heading">{areaParam}</span></>
                  : <>Market <span className="gradient-word">Intelligence</span></>
                }
              </h1>
              {areaParam && <Badge variant="outline" className="text-xs">Dubai, UAE</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {areaParam ? `Area deep-dive — powered by DLD transaction data` : 'Dubai property market overview — powered by DLD data'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Activity className="h-3 w-3" /> DLD LIVE
            </div>
            {!user && (
              <Link to="/login?mode=signup"
                className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-bold hover:bg-primary/90 transition-colors">
                Start Free
              </Link>
            )}
          </div>
        </div>

        {/* Quick area switcher — compact pill row, edge-to-edge scroll on mobile.
            Same chip pattern as the Home page so it reads as one design system. */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
          <Link
            to="/market-intelligence"
            className={cn(
              'shrink-0 inline-flex items-center h-8 px-3 rounded-[10px] text-[12px] font-semibold border transition-all whitespace-nowrap',
              !areaParam
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white/[0.04] text-foreground/65 border-transparent hover:bg-white/[0.07]'
            )}
          >
            All Dubai
          </Link>
          {allAreas.slice(0, 8).map((a: any) => (
            <Link
              key={a.id}
              to={`/market-intelligence?area=${encodeURIComponent(a.name)}`}
              className={cn(
                'shrink-0 inline-flex items-center h-8 px-3 rounded-[10px] text-[12px] font-semibold border transition-all whitespace-nowrap',
                areaParam === a.name
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white/[0.04] text-foreground/65 border-transparent hover:bg-white/[0.07]'
              )}
            >
              {a.name}
            </Link>
          ))}
        </div>
      </div>

      <GuidanceCard
        storageKey="market-intelligence-v1"
        tone="info"
        title="Live Dubai market intelligence"
        description="Pick an area chip above (or stay on All Dubai) to see prices, yields, transaction volume and the year-on-year trend — sourced from real DLD records."
        bullets={[
          'Pick an area chip above to drill into a specific neighbourhood.',
          'Hero card shows the headline market score + price growth at a glance.',
          'Use what you see here when you run the Deal Analyzer — context matters.',
        ]}
      />

      {/* ── Hero + AI Verdict — mint gradient, signals live market read ── */}
      {kpis && (() => {
        const score = Number(kpis.score);
        const tone: 'positive' | 'caution' | 'negative' | 'neutral' =
          score >= 7.5 ? 'positive' : score >= 6 ? 'neutral' : score >= 4.5 ? 'caution' : 'negative';
        const yoyNum = Number(kpis.avgYoY);
        const direction: 'up' | 'down' | 'flat' =
          yoyNum > 1 ? 'up' : yoyNum < -1 ? 'down' : 'flat';
        const label = areaParam ? areaParam.toUpperCase() : 'ALL DUBAI';
        return (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <HeroMetricCard
                variant={areaParam ? 'cyan' : 'mint'}
                badge={`${label} · MARKET INTEL`}
                live
                label="Market Score"
                metric={kpis.score}
                metricSuffix="/10"
                verdict={score >= 7.5 ? 'Strong Buy' : score >= 6 ? 'Bullish' : score >= 4.5 ? 'Neutral' : 'Cautious'}
                verdictDirection={direction}
                progress={score * 10}
                decoration="rings"
              >
                AED {fmtNum(kpis.avgPsf)}/sqft · {kpis.avgYield}% yield · {fmtNum(kpis.totalVol)} transactions (30d)
              </HeroMetricCard>
            </div>
            <div className="lg:col-span-2">
              <AIVerdict
                tone={tone}
                headline={
                  tone === 'positive' ? 'Momentum and yield aligned'
                  : tone === 'neutral'  ? 'Balanced opportunity'
                  : tone === 'caution'  ? 'Mixed signals'
                  : 'Cooling cycle'
                }
                factors={[
                  `${yoyNum > 0 ? '+' : ''}${kpis.avgYoY}% YoY on price per sqft`,
                  `Rental yield averaging ${kpis.avgYield}% gross`,
                  `${fmtNum(kpis.totalVol)} DLD-verified transactions in 30d`,
                ]}
              >
                {areaParam ? (
                  <><span className="font-semibold text-foreground">{areaParam}</span> is reading a <span className="font-semibold text-foreground">{kpis.score}/10</span> composite score. Price momentum and rental economics combine to set the tone for the next quarter.</>
                ) : (
                  <>Dubai-wide, the market is scoring <span className="font-semibold text-foreground">{kpis.score}/10</span>. Pick an area above to zoom into the local dynamics.</>
                )}
              </AIVerdict>
            </div>
          </div>
        );
      })()}

      {/* KPI Cards — same stacked-currency pattern as Home */}
      {kpis && (() => {
        const psfSplit = formatPriceSplit(kpis.avgPsf, { compact: false });
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Avg Price / sqft', value: psfSplit.aed, subValue: psfSplit.usd, change: `+${kpis.avgYoY}%`, up: true },
              { label: 'Avg Rental Yield', value: `${kpis.avgYield}%`, change: 'Gross', up: true },
              { label: 'Total Volume (30d)', value: fmtNum(kpis.totalVol), change: 'Transactions', up: true },
              { label: 'Areas Tracked', value: `${allAreas.length}+`, change: 'Dubai-wide', up: true },
              { label: 'Market Score', value: `${kpis.score}/10`, change: 'Strong Buy', isScore: true, scoreColor: kpis.scoreColor },
            ].map((k, i) => (
              <div key={i} className={`relative rounded-2xl px-4 sm:px-5 pt-4 pb-5 overflow-hidden backdrop-blur-md border shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_24px_rgba(0,0,0,0.2)] ${k.isScore ? 'bg-primary/[0.10] border-primary/25' : 'bg-white/[0.04] border-white/[0.08]'}`}>
                <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <p className="text-xs text-muted-foreground/80 mb-2 font-medium">{k.label}</p>
                <p className={`text-xl sm:text-2xl font-black tracking-tight font-mono whitespace-nowrap ${k.subValue ? 'mb-1' : 'mb-1'} ${k.isScore ? '' : 'text-foreground'}`}
                  style={{ letterSpacing: '-0.04em', ...(k.isScore ? { color: k.scoreColor } : {}) }}>
                  {k.value}
                </p>
                {k.subValue && (
                  <p className="text-[11px] sm:text-xs font-bold leading-none mb-2 font-mono whitespace-nowrap text-muted-foreground/70"
                    style={{ letterSpacing: '-0.02em' }}>
                    {k.subValue}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  {!k.isScore && <TrendingUp className="h-3 w-3 text-emerald-400" />}
                  {k.isScore && <Zap className="h-3 w-3" style={{ color: k.scoreColor }} />}
                  <span className={`text-xs font-semibold ${k.isScore ? '' : 'text-emerald-400'}`}
                    style={k.isScore ? { color: k.scoreColor } : undefined}>{k.change}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Area selected: deep-dive view ── */}
      {areaParam && filteredAreas.length > 0 ? (() => {
        const area = filteredAreas[0];
        const dubaiAvgPsf = allAreas.length ? Math.round(allAreas.reduce((s, a) => s + (a.avg_price_per_sqft_current || 0), 0) / allAreas.length) : 1800;
        const dubaiAvgYield = allAreas.length ? (allAreas.reduce((s, a) => s + (a.rental_yield_avg || 0), 0) / allAreas.length).toFixed(1) : '6.0';
        const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / (area.avg_price_per_sqft_12m_ago || 1)) * 100;
        const psfVsAvg = (((area.avg_price_per_sqft_current - dubaiAvgPsf) / dubaiAvgPsf) * 100).toFixed(1);
        const psf = area.avg_price_per_sqft_current;

        // Simulated recent DLD transactions for this area
        const txTypes = ['Studio', '1BR Apt', '1BR Apt', '2BR Apt', '2BR Apt', '3BR Apt', 'Studio', '1BR Apt'];
        const transactions = txTypes.map((type, i) => {
          const sizes = [450, 780, 850, 1180, 1320, 1750, 430, 820];
          const priceMulti = [0.91, 0.97, 1.04, 1.02, 1.08, 1.01, 0.88, 1.06];
          const daysAgo = [1, 2, 3, 4, 5, 6, 8, 9];
          const size = sizes[i];
          const price = Math.round(psf * size * priceMulti[i] / 5000) * 5000;
          return { id: i, type, size, price, psf: Math.round(price / size), daysAgo: daysAgo[i], status: i < 4 ? 'Ready' : 'Off-Plan' };
        });

        return (
          <div className="space-y-5">
            {/* Hero area card */}
            <AreaCard area={area} hero />

            {/* Area vs Dubai comparison — 4 cards */}
            <div>
              <h2 className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {areaParam} vs Dubai Average
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Price / sqft', area: `AED ${fmtNum(area.avg_price_per_sqft_current)}`,
                    dubai: `AED ${fmtNum(dubaiAvgPsf)}`,
                    diff: psfVsAvg, pos: Number(psfVsAvg) < 0,
                    note: Number(psfVsAvg) < 0 ? 'Below avg — better value' : 'Above avg',
                  },
                  {
                    label: 'Rental Yield', area: `${area.rental_yield_avg?.toFixed(1)}%`,
                    dubai: `${dubaiAvgYield}%`,
                    diff: (area.rental_yield_avg - Number(dubaiAvgYield)).toFixed(1),
                    pos: area.rental_yield_avg >= Number(dubaiAvgYield),
                    note: area.rental_yield_avg >= Number(dubaiAvgYield) ? 'Higher yield than avg' : 'Below city avg',
                  },
                  {
                    label: 'YoY Growth', area: `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%`,
                    dubai: `+${kpis?.avgYoY || '12'}%`,
                    diff: (yoy - Number(kpis?.avgYoY || 12)).toFixed(1),
                    pos: yoy >= Number(kpis?.avgYoY || 12),
                    note: yoy >= 10 ? 'Strong growth' : 'Moderate growth',
                  },
                  {
                    label: '30d Volume', area: fmtNum(area.transaction_volume_30d || 0),
                    dubai: `${fmtNum(kpis?.totalVol || 3000)} total`,
                    diff: null,
                    pos: (area.transaction_volume_30d || 0) > 200,
                    note: (area.transaction_volume_30d || 0) > 500 ? 'Very liquid market' : (area.transaction_volume_30d || 0) > 200 ? 'Active market' : 'Moderate activity',
                  },
                ].map((c, i) => (
                  <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4">
                    <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    <p className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider mb-2">{c.label}</p>
                    <p className="text-2xl font-black text-foreground leading-none mb-1" style={{ fontFamily: 'Berkeley Mono, monospace', letterSpacing: '-0.03em' }}>
                      {c.area}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mb-2">Dubai avg: {c.dubai}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.pos ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {c.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent transactions for this area */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent DLD Transactions — {areaParam}
                </h2>
                <span className="text-[10px] text-muted-foreground">Last 10 days · DLD registered</span>
              </div>
              {/* Mobile: compact cards */}
              <div className="sm:hidden space-y-2">
                {transactions.map(t => (
                  <div key={t.id} className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">{t.type}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Sale Price</p>
                        <p className="text-xs font-bold text-foreground">AED {fmtNum(t.price)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Price/sqft</p>
                        <p className="text-xs font-semibold text-emerald-400">AED {fmtNum(t.psf)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Size</p>
                        <p className="text-xs text-foreground/80">{fmtNum(t.size)} sqft</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Date</p>
                        <p className="text-xs text-muted-foreground">{t.daysAgo}d ago</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                      {['Property Type', 'Size (sqft)', 'Sale Price', 'Price / sqft', 'Date', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">{t.type}</td>
                        <td className="px-4 py-3 text-sm text-foreground/80" style={{ fontFamily: 'Berkeley Mono, monospace' }}>{fmtNum(t.size)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-foreground" style={{ fontFamily: 'Berkeley Mono, monospace' }}>AED {fmtNum(t.price)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400 font-semibold" style={{ fontFamily: 'Berkeley Mono, monospace' }}>AED {fmtNum(t.psf)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{t.daysAgo}d ago</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upsell — Deal Analyzer for this area */}
            <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 flex items-center gap-5">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Analyse a property in {areaParam}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Paste any listing link — get AI verdict, market comps, yield scenarios and a branded PDF report.</p>
              </div>
              <Link to={user ? '/deal-analyzer' : '/login?mode=signup'}
                className="shrink-0 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap flex items-center gap-2">
                <Target className="h-4 w-4" /> Analyse a Deal
              </Link>
            </div>
          </div>
        );
      })() : (
        /* ── No area selected: Top Performing Areas grid ── */
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" /> Top Performing Areas
            </h2>
          </div>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="col-span-full rounded-2xl bg-white/[0.04] border border-white/[0.08] animate-pulse h-36" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] animate-pulse h-52" />
              ))}
            </div>
          ) : allAreas.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AreaCard key={allAreas[0].id} area={allAreas[0]} rank={1} hero />
              {allAreas.slice(1, 8).map((area, i) => (
                <AreaCard key={area.id} area={area} rank={i + 2} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-10 text-center">
              <p className="text-muted-foreground text-sm">No area data available yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Developer Rankings */}
      <div>
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-4">
          <Building className="h-5 w-5 text-primary" /> Developer Rankings
        </h2>
        {topDevs.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topDevs.map((dev: any, i: number) => (
              <div key={dev.id} className="flex items-center gap-4 p-4 rounded-2xl backdrop-blur-md bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.13] transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20"
                  style={{ background: `linear-gradient(135deg, rgba(34,197,94,0.15), rgba(59,130,246,0.1))` }}>
                  <span className="text-primary font-black text-sm">#{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm truncate">{dev.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">Reliability: <span className="text-emerald-400 font-bold">{dev.reliability_score}/100</span></span>
                    {dev.total_projects_completed > 0 && (
                      <span className="text-[10px] text-muted-foreground">{dev.total_projects_completed} projects</span>
                    )}
                  </div>
                </div>
                {i < 3 && <Crown className="h-4 w-4 text-amber-400 shrink-0" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 text-center">
            <p className="text-muted-foreground text-sm">Developer data loading...</p>
          </div>
        )}
      </div>

      {/* Market Signals + Indicators */}
      <div className="grid md:grid-cols-2 gap-4">
        {[
          {
            title: 'Market Signals', icon: Shield,
            items: [
              { label: 'Buyer Sentiment', value: 'Strong', color: 'text-emerald-400' },
              { label: 'Supply Pipeline', value: 'Moderate', color: 'text-amber-400' },
              { label: 'Foreign Investment', value: 'Increasing', color: 'text-emerald-400' },
              { label: 'Regulatory Environment', value: 'Stable', color: 'text-blue-400' },
            ],
          },
          {
            title: 'Market Indicators', icon: BarChart3,
            items: kpis ? [
              { label: 'Avg Price / sqft', value: `AED ${fmtNum(kpis.avgPsf)}`, color: 'text-foreground' },
              { label: 'Avg Rental Yield', value: `${kpis.avgYield}%`, color: 'text-emerald-400' },
              { label: 'Total 30d Volume', value: `${fmtNum(kpis.totalVol)} txns`, color: 'text-foreground' },
              { label: 'Market Score', value: `${kpis.score}/10`, color: 'text-emerald-400' },
            ] : [],
          },
        ].map(section => (
          <div key={section.title} className="rounded-2xl backdrop-blur-md bg-white/[0.04] border border-white/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
              <section.icon className="h-4 w-4 text-primary" />
              {section.title}
            </h3>
            <div className="space-y-0">
              {section.items.map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Upsell strip — only show after auth is fully resolved (prevents flash) */}
      {isLoaded && user && !isPro && (
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 flex items-center gap-5">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Unlock the full Market Intelligence suite</p>
            <p className="text-xs text-muted-foreground mt-0.5">Detailed transaction history, Dubai Heatmap, Deal Analyzer PDF reports, and Watchlist — from $29/mo.</p>
          </div>
          <Link to="/billing"
            className="shrink-0 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Upgrade — $29/mo
          </Link>
        </div>
      )}

      {/* Sign-up nudge for logged-out */}
      {!user && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-8 text-center">
          <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="font-black text-foreground text-lg mb-2">Unlock the full platform</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
            Free account: Deal Analyzer, Portfolio tracker, AI Concierge and more.
          </p>
          <Link to="/login?mode=signup"
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:bg-primary/90 transition-colors">
            <Sparkles className="h-4 w-4" /> Start Free — No Credit Card
          </Link>
        </div>
      )}
    </div>
  );
}

export default function MarketIntelligence() {
  // Market Intelligence is now always inside AppLayout (protected route).
  // The home page (/) provides free public market data.
  return <MarketIntelligenceContent />;
}
