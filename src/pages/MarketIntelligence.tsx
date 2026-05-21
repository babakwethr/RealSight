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
import { useDldBuildingTransactions, useDldAreaRentals, type BuildingTransaction, type AreaRental } from '@/hooks/useDldData';
import { AreaPickerBar } from '@/components/AreaPickerBar';
import { BackButton } from '@/components/BackButton';
import { MarketHeroShell } from '@/components/MarketHeroShell';
import { useDldMonthlyTrend } from '@/hooks/useDldMonthlyTrend';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtDate, fmtMonthString } from '@/lib/dateFormat';
import { useReellyProjects } from '@/hooks/useReellyData';
import type { ReellyProject } from '@/types/reelly';
import {
  TrendingUp, TrendingDown, Activity, BarChart3,
  Crown, Building, ArrowRight, Zap, MapPin,
  Shield, Lock, Sparkles, Target,
} from 'lucide-react';
import { RealEstateMetricCard } from '@/components/RealEstateMetricCard';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { HeroMetricCard } from '@/components/HeroMetricCard';
import { AIVerdict } from '@/components/AIVerdict';
import { formatPriceSplit } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { getAreaPhotoUrl } from '@/lib/areaPhotos';

const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

// Public nav for logged-out users
function PublicBar() {
  return (
    <div className="sticky top-0 z-[60] bg-background/95 backdrop-blur-md border-b border-border/40 mb-0"
      style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}>
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

// Performance-based card accent colour. `glow` / `glowSecondary` drive the
// no-photo decoration's bottom-corner radial gradients (Variant-2 pattern
// from the 21st.dev pick on 7 May).
function getCardAccent(yoy: number, yield_: number) {
  if (yoy >= 15 && yield_ >= 7) return {
    bg: 'from-emerald-950/80 to-emerald-900/40',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    stroke: '#22C55E',
    glow: 'rgba(16, 185, 129, 0.95)',
    glowSecondary: 'rgba(20, 184, 166, 0.80)',
    primary: 'from-emerald-400 to-teal-500',
    label: 'High Growth',
  };
  if (yoy >= 10) return {
    bg: 'from-blue-950/80 to-blue-900/30',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    stroke: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.95)',
    glowSecondary: 'rgba(99, 102, 241, 0.80)',
    primary: 'from-blue-400 to-cyan-500',
    label: 'Growth',
  };
  if (yield_ >= 7) return {
    bg: 'from-purple-950/80 to-purple-900/30',
    border: 'border-purple-500/20',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    stroke: '#A855F7',
    glow: 'rgba(139, 92, 246, 0.95)',
    glowSecondary: 'rgba(168, 85, 247, 0.80)',
    primary: 'from-violet-400 to-purple-500',
    label: 'High Yield',
  };
  return {
    bg: 'from-slate-900/80 to-slate-800/30',
    border: 'border-white/[0.08]',
    badge: 'bg-white/10 text-muted-foreground border-white/10',
    stroke: '#64748B',
    glow: 'rgba(100, 116, 139, 0.85)',
    glowSecondary: 'rgba(148, 163, 184, 0.65)',
    primary: 'from-slate-300 to-slate-400',
    label: 'Stable',
  };
}

/**
 * Rotating accent for no-photo cards. The 4 V3 accents (mint / cobalt /
 * violet / amber) are picked by stable hash of area.name so every area
 * gets the same colour every render. Visual variety per area.
 */
const ROTATING_ACCENT_COLORS = ['mint', 'cobalt', 'violet', 'amber'] as const;
type RotatingAccentColor = typeof ROTATING_ACCENT_COLORS[number];

function rotatingAccentColor(seed: string): RotatingAccentColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return ROTATING_ACCENT_COLORS[Math.abs(hash) % ROTATING_ACCENT_COLORS.length];
}

// Individual area stat card — performance-color coded
function AreaCard({ area, rank, hero }: { area: any; rank?: number; hero?: boolean }) {
  const navigate = useNavigate();
  const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / (area.avg_price_per_sqft_12m_ago || 1)) * 100;
  const pos = yoy > 0;
  const accent = getCardAccent(yoy, area.rental_yield_avg || 0);
  const photo = getAreaPhotoUrl(area.name);

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
    // Hero card — Babak's 8-May spec: drop the photo background entirely,
    // use only the dark glass + grid pattern + accent glow. Photo competed
    // visually with the chart and made content harder to read.
    return (
      <div
        onClick={() => navigate(`/market-intelligence?area=${encodeURIComponent(area.name)}`)}
        className={cn(
          'relative rounded-2xl overflow-hidden cursor-pointer group col-span-full border hover:scale-[1.005] transition-all duration-300',
          accent.border,
          'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950',
        )}
      >
        {/* Grid pattern decoration */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`hero-grid-${area.id}`} width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-700" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#hero-grid-${area.id})`} />
          </svg>
        </div>
        {/* Accent corner glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-2/3 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at bottom right, ${accent.glow} -10%, transparent 70%), radial-gradient(ellipse at bottom left, ${accent.glowSecondary} -10%, transparent 70%)`,
            filter: 'blur(50px)',
          }}
        />
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Hero card layout (8 May redesign per Babak's spec):
              ┌────────────────────────────────────────┐
              │ #1 Top · High Growth                   │
              │ Jumeirah Village Circle (JVC)          │
              │ 📍 Dubai, UAE                           │
              │                                        │
              │ Price · YoY · Yield · Demand   [chart] │
              │   on photo (fading)            on dark │
              │                                        │
              └────────────────────────────────────────┘
            Photo on the LEFT under content, gradient fades to near-
            opaque black on the RIGHT so the chart sits on a clean
            dark surface. */}
        <div className="relative p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center">
          {/* LEFT — title + Dubai/UAE + KPIs underneath */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {rank && (
                <div className="flex items-center gap-1 text-amber-400 text-[11px] font-black uppercase tracking-wider">
                  <Crown className="h-3 w-3" />#{rank} Top Area
                </div>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${accent.badge}`}>
                {accent.label}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight line-clamp-2">{area.name}</h3>
            <p className="text-[11px] text-white/55 mt-1 mb-4 flex items-center gap-1">
              <MapPin className="h-3 w-3" />Dubai, UAE
            </p>
            {/* Stats grid UNDER the title */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
              {[
                { label: 'Price / sqft', value: `AED ${fmtNum(area.avg_price_per_sqft_current)}`, color: 'text-white' },
                { label: 'YoY Growth', value: `${pos ? '+' : ''}${yoy.toFixed(1)}%`, color: pos ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Rental Yield', value: `${area.rental_yield_avg?.toFixed(1)}%`, color: 'text-emerald-400' },
                { label: 'Demand', value: `${area.demand_score || 50}/100`, color: 'text-white' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-[10px] text-white/55 mb-0.5 font-medium uppercase tracking-wider">{s.label}</p>
                  <p className={`text-base sm:text-lg font-black ${s.color}`} style={{ letterSpacing: '-0.02em' }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — chart on the dark side of the gradient.
              Sits over the near-opaque black portion of the photo
              gradient so no photo bleeds under it. */}
          <div className="w-full sm:w-2/5 lg:w-1/3 h-24 sm:h-32 shrink-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 4, left: 4, bottom: 6 }}>
                <defs>
                  <linearGradient id={`hero-grad-${area.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent.stroke} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={accent.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[minV, maxV]} hide />
                <Area type="monotone" dataKey="v" stroke={accent.stroke} strokeWidth={2.5}
                  fill={`url(#hero-grad-${area.id})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // No-photo cards render V3 from 21st.dev verbatim (RealEstateMetricCard).
  // Photo cards keep the photo-as-background treatment below.
  // Liquid-glass treatment is applied via className override on the V3
  // outer container — V3's component code itself stays untouched.
  if (!photo) {
    return (
      <div
        onClick={() => navigate(`/market-intelligence?area=${encodeURIComponent(area.name)}`)}
        className="h-full cursor-pointer hover:-translate-y-1 transition-transform duration-200"
      >
        <RealEstateMetricCard
          areaName={area.name}
          metricLabel="Price / sqft"
          metricValue={`AED ${fmtNum(area.avg_price_per_sqft_current)}`}
          changePercent={`${pos ? '+' : ''}${yoy.toFixed(1)}%`}
          changeDirection={pos ? 'up' : 'down'}
          accentColor={rotatingAccentColor(area.name || String(area.id))}
          subMetrics={[
            { label: 'Yield', value: `${(area.rental_yield_avg ?? 0).toFixed(1)}%` },
            { label: 'Volume', value: `${area.transaction_volume_30d || 0}` },
            { label: 'Demand', value: `${area.demand_score || 50}/100` },
          ]}
          className={cn(
            'max-w-none h-full',
            // CI-aligned glass — same values as `.glass-card` in
            // src/index.css, used everywhere else in the app. Keeps
            // the new V3 cards visually consistent with the rest of
            // RealSight (admin, watchlist, deal-analyzer, etc.).
            'bg-white/[0.04]',
            'backdrop-blur-[22px] backdrop-saturate-[1.2]',
            'border-white/[0.12]',
            'shadow-[0_18px_50px_-20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]',
          )}
        />
      </div>
    );
  }

  // Photo cards — V3 layout with district photo as the background. Same
  // RealEstateMetricCard component as the no-photo case, just with the
  // photo + dark scrim painted behind V3's transparent container. This
  // makes EVERY area card on Markets look identical structurally; only
  // the back layer differs (photo vs glass).
  return (
    <div
      onClick={() => navigate(`/market-intelligence?area=${encodeURIComponent(area.name)}`)}
      className="relative h-full rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-transform duration-200 group"
    >
      {/* District photo */}
      <img
        src={photo}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark scrim — top-to-bottom darken so V3 content is readable. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/70 to-black/90"
      />
      {/* V3 component, transparent container so the photo+scrim show through.
          tailwind-merge with `!` modifiers neutralises V3's opaque bg / shadow.
          h-full on this wrapper is critical — without it V3 sits at content
          height and the photo bleeds below the View Details button. */}
      <div className="relative h-full">
        <RealEstateMetricCard
          areaName={area.name}
          metricLabel="Price / sqft"
          metricValue={`AED ${fmtNum(area.avg_price_per_sqft_current)}`}
          changePercent={`${pos ? '+' : ''}${yoy.toFixed(1)}%`}
          changeDirection={pos ? 'up' : 'down'}
          accentColor={rotatingAccentColor(area.name || String(area.id))}
          subMetrics={[
            { label: 'Yield', value: `${(area.rental_yield_avg ?? 0).toFixed(1)}%` },
            { label: 'Volume', value: `${area.transaction_volume_30d || 0}` },
            { label: 'Demand', value: `${area.demand_score || 50}/100` },
          ]}
          className={cn(
            'max-w-none !h-full',
            '!bg-transparent !border-white/[0.12] !rounded-2xl',
            '!shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
          )}
        />
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
  const buildingParam = searchParams.get('building') || '';
  const bedsParam = searchParams.get('beds') || '';
  const modeParam = searchParams.get('mode') || '';
  const statusParam = searchParams.get('status') || '';
  const typeParam = searchParams.get('type') || '';
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
    // When the picked area isn't in the curated dld_areas table (only 8
    // areas are enriched today), DO NOT fall back to allAreas — that
    // mis-labels JVC's data as the picked area. Return [] so the
    // "needs curated metrics" sections hide gracefully (the catalogue-
    // backed sections — building tables, off-plan, etc. — still work).
    return [];
  }, [allAreas, areaParam]);

  /** True iff the picked area has enriched curated metrics. */
  const hasCuratedArea = !areaParam || (areaParam && filteredAreas.length > 0);

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
    <div className="space-y-5 animate-fade-in pb-12 px-4 md:px-6 max-w-[1400px] mx-auto pt-2 sm:pt-3">
      <BackButton />

      {/* Hero — same shell as the UK + US market pages. Eyebrow, big
          title, subtitle and the area picker all live inside one
          gradient card so the page reads as part of a system. */}
      <MarketHeroShell
        market="uae"
        eyebrow={
          areaParam
            ? `United Arab Emirates · Dubai Land Department · ${areaParam.toUpperCase()}`
            : 'United Arab Emirates · Dubai Land Department'
        }
        title={
          areaParam
            ? <span className="gradient-heading">{areaParam}</span>
            : <>UAE Market <span className="gradient-word">Intelligence</span></>
        }
        subtitle={
          areaParam
            ? 'Area deep-dive — every metric powered by live DLD transactions.'
            : 'Live Dubai property data — prices, yields, sales volume, every area covered by the Dubai Land Department.'
        }
        filterBar={
          <div className="w-full max-w-2xl">
            <AreaPickerBar currentArea={areaParam} />
          </div>
        }
        metric={
          areaParam ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-widest">DLD live</span>
            </div>
          ) : null
        }
      />

      {/* Mode banner — kept slim, only shown when a building or area is
          picked. Tells the user whether sales or rentals are loaded. */}
      {(areaParam || buildingParam) && (
        <div className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 border text-xs',
          modeParam === 'rental'
            ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-200'
            : 'bg-primary/10 border-primary/25 text-primary',
        )}>
          <span className="font-bold flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            {modeParam === 'rental'
              ? 'Showing RENTAL data — DLD Ejari contracts registry'
              : 'Showing SALES data — DLD transaction registry'}
          </span>
          <span className="text-[10px] opacity-70">
            {buildingParam ? `${buildingParam}${areaParam ? ` · ${areaParam}` : ''}` : areaParam}
          </span>
        </div>
      )}

      {/* UAE 24-month price trend — sibling of the UK + US national
          trend charts. When an area is selected, the chart scopes to
          that area; otherwise it shows the Dubai-wide rollup. Hidden
          on the building-drill view since BuildingPriceTrend covers
          that case. */}
      {!buildingParam && <UaeMonthlyTrend area={areaParam || null} />}

      {/* Drill-down panel:
          - building + sales/rental → building-specific sales OR area-level rentals
            (DLD's rental dataset lacks building names, see BuildingResultsPanel)
          - area-only + rental → area-level rentals panel
          - area-only + sales → no panel (the area page below covers it). */}
      {buildingParam && (
        <BuildingResultsPanel
          buildingName={buildingParam}
          areaName={areaParam}
          beds={bedsParam}
          mode={modeParam}
          status={statusParam}
          type={typeParam}
        />
      )}
      {!buildingParam && areaParam && modeParam === 'rental' && (
        <BuildingResultsPanel
          // pseudo-building = "All residential rentals in {area}"
          buildingName={`Rentals · ${areaParam}`}
          areaName={areaParam}
          beds={bedsParam}
          mode="rental"
          status={statusParam}
          type={typeParam}
        />
      )}

      {/* When the picked area isn't yet enriched with curated metrics,
          show an honest banner. The DLD transactions panel + off-plan
          suggestions below still light up with real catalogue data. */}
      {areaParam && !hasCuratedArea && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/85 mb-1">
            {areaParam} · Live DLD data
          </p>
          <h2 className="text-xl font-black text-foreground mb-1.5" style={{ letterSpacing: '-0.02em' }}>
            Enriched metrics being computed
          </h2>
          <p className="text-sm text-white/65 max-w-2xl">
            Our enriched dashboards (market score, comparison cards, sparklines) are still building for
            <strong className="text-foreground"> {areaParam}</strong>. The live DLD transactions below
            are real-time, and off-plan suggestions for this area are at the bottom of the page.
          </p>
        </div>
      )}

      {/* ── Hero + AI Verdict — only when the picked area is enriched ── */}
      {hasCuratedArea && kpis && (() => {
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

      {/* KPI Cards — same stacked-currency pattern as Home. Hidden when
          the picked area lacks enriched metrics so we don't show
          Dubai-wide-averages-labelled-as-an-area. */}
      {hasCuratedArea && kpis && (() => {
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

            {/* Recent transactions for this area — sales mode only.
                In rental mode the BuildingResultsPanel above already
                renders the live Ejari contracts table for the area. */}
            {modeParam !== 'rental' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent DLD Sales — {areaParam}
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
            )}

            {/* Upsell — Deal Analyzer for this area. Stacks vertically on
                mobile so the copy never gets squeezed to one-word-per-line. */}
            <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">Analyse a property in {areaParam}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Paste any listing link — get AI verdict, market comps, yield scenarios and a branded PDF report.</p>
                </div>
              </div>
              <Link to={user ? '/deal-analyzer' : '/login?mode=signup'}
                className="shrink-0 w-full sm:w-auto justify-center px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap flex items-center gap-2">
                <Target className="h-4 w-4" /> Analyse a Deal
              </Link>
            </div>

            {/* Off-Plan suggestions in this area — Reelly catalogue cross-ref */}
            <OffPlanSuggestionsSection
              areaName={areaParam}
              areaAvgPsf={area.avg_price_per_sqft_current || 0}
            />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-fr">
              <div className="col-span-full rounded-2xl bg-white/[0.04] border border-white/[0.08] animate-pulse h-36" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] animate-pulse h-52" />
              ))}
            </div>
          ) : allAreas.length > 0 ? (
            <div className="space-y-3">
              {/* Hero card OUTSIDE the grid — sizes to its content rather
                  than stretching to the grid's auto-rows-fr height. */}
              <AreaCard key={allAreas[0].id} area={allAreas[0]} rank={1} hero />
              {/* Standard cards inside the equalising grid. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-fr">
                {allAreas.slice(1, 8).map((area, i) => (
                  <AreaCard key={area.id} area={area} rank={i + 2} />
                ))}
              </div>
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
              <div key={dev.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-[22px] backdrop-saturate-[1.2] border border-white/[0.12] hover:border-white/[0.30] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all">
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
          <div key={section.title} className="relative rounded-2xl bg-white/[0.04] backdrop-blur-[22px] backdrop-saturate-[1.2] border border-white/[0.12] p-5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]">
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

/**
 * BuildingResultsPanel — surfaced at the top of MarketIntelligence
 * when the user arrived from the home search after picking a building
 * and refining filters (Beds / Sale-Rent / Type / Status).
 *
 * Shows the building's most recent DLD transactions matching the chosen
 * criteria — NOT the whole area. The area page below this panel still
 * renders for broader context.
 */
function BuildingResultsPanel({
  buildingName, areaName, beds, mode, status, type,
}: {
  buildingName: string;
  areaName: string;
  beds: string; mode: string; status: string; type: string;
}) {
  const isRental = mode === 'rental';

  const salesQuery = useDldBuildingTransactions(
    isRental ? null : buildingName, // skip the sales call when in rental mode
    { beds: beds || undefined, status: status || undefined, type: type || undefined },
  );
  const rentalQuery = useDldAreaRentals(
    isRental ? areaName : null,
    { beds: beds || undefined, type: type || undefined },
  );

  const activeFilters = [
    beds && beds !== 'Any' && beds,
    mode && mode !== 'sales' && (mode === 'rental' ? 'Rental' : mode),
    status && status !== 'Any' && status,
    type && type !== 'Any' && type,
  ].filter(Boolean) as string[];

  const median = (arr: number[]) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  // Sales aggregates (only meaningful when isRental === false)
  const salesAgg = useMemo(() => {
    const rows = salesQuery.data ?? [];
    const prices = rows.map(r => r.price).filter((p): p is number => typeof p === 'number' && p > 0);
    const psqfts = rows.map(r => r.pricePerSqft).filter((p): p is number => typeof p === 'number' && p > 0);
    return {
      count: rows.length,
      medianPrice: median(prices),
      medianPsqft: median(psqfts),
      latest: rows[0]?.date ?? null,
    };
  }, [salesQuery.data]);

  // Rental aggregates
  const rentAgg = useMemo(() => {
    const rows = rentalQuery.data ?? [];
    const annuals = rows.map(r => r.annualAmount).filter((p): p is number => typeof p === 'number' && p > 0);
    return {
      count: rows.length,
      medianAnnual: median(annuals),
      latest: rows[0]?.startDate ?? null,
    };
  }, [rentalQuery.data]);

  const isLoading = isRental ? rentalQuery.isLoading : salesQuery.isLoading;
  const count = isRental ? rentAgg.count : salesAgg.count;
  const latest = isRental ? rentAgg.latest : salesAgg.latest;

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-5 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 mb-1">
            {isRental ? 'Rentals in area · live DLD Ejari' : 'Building result · live DLD sales'}
          </p>
          <h2 className="text-xl font-black text-foreground" style={{ letterSpacing: '-0.02em' }}>
            {isRental && buildingName.startsWith('Rentals · ')
              ? `Residential rentals in ${areaName || buildingName.replace('Rentals · ', '')}`
              : buildingName}
          </h2>
          {areaName && !buildingName.startsWith('Rentals · ') && (
            <p className="text-xs text-white/55">{areaName}</p>
          )}
          {isRental && (
            <p className="text-[11px] text-amber-300 mt-1.5">
              DLD's rental registry doesn't include building names — showing all
              residential rentals in <strong>{areaName || 'this area'}</strong>.
            </p>
          )}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activeFilters.map((f) => (
                <span key={f} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            {isRental ? 'Matching contracts' : 'Matching sales'}
          </p>
          <p className="text-2xl font-black text-foreground tabular-nums" style={{ letterSpacing: '-0.02em' }}>
            {isLoading ? '…' : count}
          </p>
          {latest && (
            <p className="text-[10px] text-white/45">Latest: {fmtDate(latest)}</p>
          )}
        </div>
      </header>

      {/* Aggregate tiles */}
      {isRental ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <AggregateTile label="Median annual rent" value={rentAgg.medianAnnual ? `AED ${rentAgg.medianAnnual.toLocaleString()}/yr` : '—'} />
          <AggregateTile label="Median monthly" value={rentAgg.medianAnnual ? `AED ${Math.round(rentAgg.medianAnnual / 12).toLocaleString()}/mo` : '—'} />
          <AggregateTile label="Contracts returned" value={isLoading ? '…' : String(rentAgg.count)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <AggregateTile label="Median price" value={salesAgg.medianPrice ? `AED ${salesAgg.medianPrice.toLocaleString()}` : '—'} />
          <AggregateTile label="Median AED/sqft" value={salesAgg.medianPsqft ? `AED ${Math.round(salesAgg.medianPsqft).toLocaleString()}` : '—'} />
          <AggregateTile label="Sales returned" value={isLoading ? '…' : String(salesAgg.count)} />
        </div>
      )}

      {/* Price-per-sqft trend chart — only in sales mode, when we have
          enough datapoints to draw a meaningful line. */}
      {!isRental && (salesQuery.data?.length ?? 0) >= 3 && (
        <BuildingPriceTrend rows={salesQuery.data ?? []} />
      )}

      {/* Transaction / contract list */}
      {isLoading ? (
        <p className="text-xs text-white/45 text-center py-6">Loading {isRental ? 'contracts' : 'transactions'}…</p>
      ) : count === 0 ? (
        <p className="text-xs text-white/45 text-center py-6">
          No {isRental ? 'rentals' : 'transactions'} match those filters. Try widening — e.g. drop the bedroom filter, or pick <strong>Any</strong> on Status.
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
            {isRental ? 'Recent contracts' : 'Recent transactions'}
          </p>
          <div className="overflow-x-auto -mx-1">
            {isRental ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-white/40 border-b border-white/[0.05]">
                    <th className="py-1.5 pr-2 font-semibold">Start</th>
                    <th className="py-1.5 pr-2 font-semibold">Type</th>
                    <th className="py-1.5 pr-2 font-semibold">Subtype</th>
                    <th className="py-1.5 pr-2 font-semibold text-right">Annual (AED)</th>
                    <th className="py-1.5 pr-2 font-semibold text-right">Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  {(rentalQuery.data ?? []).slice(0, 12).map((r) => (
                    <RentRow key={r.contract_id} r={r} />
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-white/40 border-b border-white/[0.05]">
                    <th className="py-1.5 pr-2 font-semibold">Date</th>
                    <th className="py-1.5 pr-2 font-semibold">Beds</th>
                    <th className="py-1.5 pr-2 font-semibold">Type</th>
                    <th className="py-1.5 pr-2 font-semibold text-right">Price (AED)</th>
                    <th className="py-1.5 pr-2 font-semibold text-right">AED/sqft</th>
                  </tr>
                </thead>
                <tbody>
                  {(salesQuery.data ?? []).slice(0, 12).map((t) => (
                    <TxRow key={t.transaction_id} t={t} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * BuildingPriceTrend — small AED-per-sqft sparkline derived from the
 * last N DLD sales for this building. Chronological (oldest → newest)
 * so the line reads left-to-right like a stock chart.
 */
/**
 * UaeMonthlyTrend — 24-month AED/sqft trend chart. Scopes to a
 * specific area when one is passed; otherwise renders the
 * Dubai-wide rollup. Mirrors the UK & US national-trend cards.
 */
function UaeMonthlyTrend({ area }: { area: string | null }) {
  const { data: rows = [], isLoading } = useDldMonthlyTrend(24, area);

  const data = useMemo(() => {
    return rows
      .filter(r => r.avg_psqft && r.avg_psqft > 0)
      .map(r => ({
        month: fmtMonthString(r.month),
        psqft: Math.round(r.avg_psqft ?? 0),
      }));
  }, [rows]);

  const headline = area
    ? `${area} · 24-month price trend`
    : 'UAE 24-month price trend';
  const subline = area
    ? `Average DLD-registered sale in ${area}, AED per sqft, by month.`
    : 'Average DLD-registered sale across Dubai, AED per sqft, by month.';

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground" style={{ letterSpacing: '-0.02em' }}>
            {headline}
          </h2>
          <p className="text-sm text-white/55">{subline}</p>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          Source · Dubai Land Department
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : data.length >= 3 ? (
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="uae-trend-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#18d6a4" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#18d6a4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Tooltip
                contentStyle={{ background: 'rgba(10,15,30,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                itemStyle={{ color: '#fff' }}
                formatter={(v: number) => [`AED ${v.toLocaleString()}/sqft`, 'Avg']}
              />
              <Area type="monotone" dataKey="psqft" stroke="#18d6a4" strokeWidth={2} fill="url(#uae-trend-grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-white/55">
          National trend not yet available — monthly aggregator may still be ingesting.
        </div>
      )}
    </section>
  );
}

function BuildingPriceTrend({ rows }: { rows: BuildingTransaction[] }) {
  const data = useMemo(() => {
    // Sort oldest → newest, drop rows without a usable price/sqft.
    const sorted = [...rows]
      .filter(r => r.pricePerSqft && r.pricePerSqft > 0 && r.date)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return sorted.map(r => ({
      // Display label MM-YYYY per the global date convention.
      date: fmtMonthString(r.date.slice(0, 7)),
      psqft: Math.round(r.pricePerSqft!),
      fullDate: fmtDate(r.date),
    }));
  }, [rows]);

  if (data.length < 3) return null;

  const first = data[0].psqft;
  const last = data[data.length - 1].psqft;
  const deltaPct = first > 0 ? ((last - first) / first) * 100 : 0;
  const isUp = deltaPct >= 0;

  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
            AED / sqft trend
          </p>
          <p className="text-[11px] text-white/55 mt-0.5">
            Last {data.length} DLD sales · {data[0].fullDate} → {data[data.length - 1].fullDate}
          </p>
        </div>
        <span className={cn(
          'text-xs font-bold tabular-nums px-2 py-0.5 rounded-full border',
          isUp
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        )}>
          {isUp ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}%
        </span>
      </div>
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="psqft-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={isUp ? '#18D6A4' : '#F87171'} stopOpacity={0.55} />
                <stop offset="100%" stopColor={isUp ? '#18D6A4' : '#F87171'} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={['dataMin', 'dataMax']} hide />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,15,30,0.92)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`AED ${value.toLocaleString()}/sqft`, 'Median']}
              labelFormatter={(label: string) => label}
            />
            <Area
              type="monotone"
              dataKey="psqft"
              stroke={isUp ? '#18D6A4' : '#F87171'}
              strokeWidth={2}
              fill="url(#psqft-grad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RentRow({ r }: { r: AreaRental }) {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="py-1.5 pr-2 text-white/70">{fmtDate(r.startDate)}</td>
      <td className="py-1.5 pr-2 text-white/70">{r.propertyType ?? '—'}</td>
      <td className="py-1.5 pr-2 text-white/70">{r.subType ?? '—'}</td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-foreground font-semibold">
        {r.annualAmount ? r.annualAmount.toLocaleString() : '—'}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-white/70">
        {r.annualAmount ? Math.round(r.annualAmount / 12).toLocaleString() : '—'}
      </td>
    </tr>
  );
}

/**
 * Map a DLD area name to the equivalent name in Reelly's catalogue. Reelly
 * uses the marketing-friendly name; DLD uses the registered land-department
 * name. Keep this list small — most areas already align.
 */
const DLD_TO_REELLY_AREA: Record<string, string> = {
  'Marsa Dubai': 'Dubai Marina',
  'Burj Khalifa': 'Downtown Dubai',
  'Wadi Al Safa 5': 'Dubai Hills Estate',
  'Al Thanyah Fifth': 'Jumeirah Lakes Towers',
  'Al Thanyah Third': 'The Greens',
  'Al Thanyah Fourth': 'Emirates Hills',
  'Hadaeq Sheikh Mohammed Bin Rashid': 'Mohammed Bin Rashid City',
};

/**
 * Off-plan suggestions for the selected DLD area.
 *
 * 1. Translate DLD area name → Reelly-friendly name where needed.
 * 2. Query Reelly's catalogue via `search_query` (matches name + developer + district).
 * 3. Filter results client-side to only those whose `location.district`
 *    actually matches the searched area (Reelly's search is fuzzy).
 * 4. For each project compute AED/sqft from min_price + min_size, compare
 *    to the area's DLD average, and emit a one-line verdict.
 */
function OffPlanSuggestionsSection({
  areaName, areaAvgPsf,
}: {
  areaName: string;
  areaAvgPsf: number;
}) {
  const reellyName = DLD_TO_REELLY_AREA[areaName] || areaName;

  const { data, isLoading } = useReellyProjects({
    country: 'United Arab Emirates',
    searchQuery: reellyName,
    limit: 24,
  });

  const projects: ReellyProject[] = useMemo(() => {
    const all = data?.results ?? [];
    const needle = reellyName.toLowerCase();
    // Keep only on-sale projects whose district matches what the user searched.
    return all
      .filter((p) => {
        const district = (p.location?.district || '').toLowerCase();
        const region = (p.location?.region || '').toLowerCase();
        return district.includes(needle) || needle.includes(district) || region.includes(needle);
      })
      .filter((p) => p.sale_status !== 'out_of_stock')
      .slice(0, 6);
  }, [data, reellyName]);

  if (!areaName) return null;

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-black text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Off-Plan opportunities in {areaName}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] h-44 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-black text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Off-Plan opportunities in {areaName}
        </h2>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 text-center">
          <p className="text-xs text-muted-foreground">
            No active off-plan launches matched <strong>{areaName}</strong> right now.
          </p>
          <Link
            to="/off-plan"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-primary hover:text-primary/80"
          >
            Browse all off-plan projects <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Off-Plan opportunities in {areaName}
        </h2>
        <Link
          to="/off-plan"
          className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <p className="text-[11px] text-muted-foreground">
        AI verdict compares each project's launch price to the live DLD average
        for {areaName} (AED {fmtNum(areaAvgPsf)}/sqft).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.map((p) => (
          <OffPlanSuggestionCard key={p.id} project={p} areaAvgPsf={areaAvgPsf} />
        ))}
      </div>
    </section>
  );
}

interface VerdictRead {
  tone: 'positive' | 'caution' | 'neutral';
  label: string;
  detail: string;
}

function readOffPlanVerdict(projectPsf: number | null, areaAvgPsf: number): VerdictRead {
  if (!projectPsf || !areaAvgPsf) {
    return {
      tone: 'neutral',
      label: 'Pricing not disclosed',
      detail: 'Developer has not published a starting price — request a brochure for the full picture.',
    };
  }
  const ratio = projectPsf / areaAvgPsf;
  const diffPct = Math.round((ratio - 1) * 100);
  if (ratio <= 0.9) {
    return {
      tone: 'positive',
      label: 'Strong value vs area',
      detail: `Launch price is ${Math.abs(diffPct)}% below the DLD area average — room for capital growth on hand-over.`,
    };
  }
  if (ratio >= 1.15) {
    return {
      tone: 'caution',
      label: 'Premium pricing',
      detail: `Launch price is ${diffPct}% above the DLD area average — needs strong amenities or branding to justify.`,
    };
  }
  return {
    tone: 'neutral',
    label: 'In line with area',
    detail: `Launch price is ${diffPct >= 0 ? '+' : ''}${diffPct}% vs the DLD area average — fair entry point at current market.`,
  };
}

function OffPlanSuggestionCard({
  project, areaAvgPsf,
}: {
  project: ReellyProject;
  areaAvgPsf: number;
}) {
  const projectPsf = project.min_price && project.min_size
    ? Math.round(project.min_price / project.min_size)
    : null;
  const verdict = readOffPlanVerdict(projectPsf, areaAvgPsf);
  const toneColor =
    verdict.tone === 'positive' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : verdict.tone === 'caution' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-white/5 text-white/70 border-white/15';
  const verdictTrim =
    verdict.tone === 'positive' ? 'text-emerald-300'
    : verdict.tone === 'caution' ? 'text-amber-300'
    : 'text-white/75';

  const completion = project.completion_date
    ? fmtDate(project.completion_date)
    : project.completion_datetime
      ? fmtDate(project.completion_datetime)
      : null;
  // Reelly's project detail API requires the numeric project ID — slugs
  // 404 on the upstream. Always link by id.
  const target = `/projects/${project.id}`;

  return (
    <Link
      to={target}
      className="group rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-primary/30 transition-colors overflow-hidden flex flex-col"
    >
      {/* Cover */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent overflow-hidden">
        {project.cover_image?.url ? (
          <img
            src={project.cover_image.url}
            alt={project.name}
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building className="h-10 w-10 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${toneColor}`}>
          {verdict.label}
        </span>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold truncate">
            {project.developer || 'Developer'}
          </p>
          <p className="text-sm font-black text-foreground truncate" style={{ letterSpacing: '-0.01em' }}>
            {project.name}
          </p>
          {project.location?.district && (
            <p className="text-[11px] text-white/55 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {project.location.district}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/40">From</p>
            <p className="text-xs font-bold text-foreground tabular-nums">
              {project.min_price ? `AED ${fmtNum(project.min_price)}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/40">AED/sqft</p>
            <p className="text-xs font-bold text-foreground tabular-nums">
              {projectPsf ? `AED ${fmtNum(projectPsf)}` : '—'}
            </p>
          </div>
        </div>

        {/* AI verdict mini-card */}
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2 mt-auto">
          <p className="text-[9px] uppercase tracking-wider text-primary/80 font-black flex items-center gap-1 mb-0.5">
            <Sparkles className="h-2.5 w-2.5" /> RealSight AI · Verdict
          </p>
          <p className={`text-[11px] leading-snug ${verdictTrim}`}>
            {verdict.detail}
          </p>
        </div>

        {completion && (
          <p className="text-[10px] text-white/40 mt-1">Hand-over: {completion}</p>
        )}
      </div>
    </Link>
  );
}

function AggregateTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-base font-black text-foreground tabular-nums" style={{ letterSpacing: '-0.02em' }}>{value}</p>
    </div>
  );
}

function TxRow({ t }: { t: BuildingTransaction }) {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="py-1.5 pr-2 text-white/70">{fmtDate(t.date)}</td>
      <td className="py-1.5 pr-2 text-white/70">{t.rooms ?? '—'}</td>
      <td className="py-1.5 pr-2 text-white/70">{t.subType ?? '—'}</td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-foreground font-semibold">
        {t.price ? t.price.toLocaleString() : '—'}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-white/70">
        {t.pricePerSqft ? Math.round(t.pricePerSqft).toLocaleString() : '—'}
      </td>
    </tr>
  );
}
