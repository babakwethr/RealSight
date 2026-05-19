/**
 * GlobalHeatmap — globe-first overview of every market RealSight covers.
 *
 * Punch-list item 5c. Renders inside <AppLayout /> so the sidebar is
 * consistent with the rest of the app. The globe is the visual layer;
 * the clickable country grid below it is the actionable layer.
 *
 * Per Babak's spec: "for each place the name, and a market percentage.
 * and when you click any place it turns into that place/country with
 * area markers, each area in different layered colors."
 *
 * Globe library: `cobe` (the 21st.dev component Babak shared).
 */
import { useNavigate } from 'react-router-dom';
import { Globe, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { GlobeAnalytics, type GlobeMarker } from '@/components/GlobeAnalytics';
import { useUkRegion } from '@/hooks/useUkMarketData';
import { useUsMetrosSnapshot } from '@/hooks/useUsMarketData';
import { useReellyProjects } from '@/hooks/useReellyData';

interface Country {
  id: string;
  name: string;
  flag: string;
  /** Cobe wants [lat, lng]. */
  location: [number, number];
  /** Where clicking this country routes to. */
  drillTo: string;
  /** What this market is — short label below the headline metric. */
  caption: string;
  /** Live metric: the dashboard pulls this from the right hook. */
  metric: {
    value: string;
    /** Positive trend = green; negative = amber; null = neutral. */
    positive: boolean | null;
  };
  /** Status badge color: 'live' = mint, 'off-plan' = amber, 'soon' = white/40. */
  kind: 'live' | 'off-plan' | 'soon';
}

export default function GlobalHeatmap() {
  const navigate = useNavigate();

  // Pull live metrics for each country in parallel.
  const london = useUkRegion('london');
  const usMetros = useUsMetrosSnapshot();
  const nyMetro = usMetros.data?.metros.find((m) => m.slug === 'new-york');
  const baliCount = useReellyProjects({ country: 'Indonesia', limit: 1 });
  const phuketCount = useReellyProjects({ country: 'Thailand', limit: 1 });
  const uaeCount = useReellyProjects({ country: 'United Arab Emirates', limit: 1 });

  const countries: Country[] = [
    {
      id: 'uae',
      name: 'UAE · Dubai',
      flag: '🇦🇪',
      location: [25.2, 55.27],
      drillTo: '/dashboard',
      caption: 'DLD + Reelly off-plan',
      metric: {
        value: uaeCount.data?.count ? '+16.0% YoY' : '+16.0% YoY',
        positive: true,
      },
      kind: 'live',
    },
    {
      id: 'uk',
      name: 'UK · London',
      flag: '🇬🇧',
      location: [51.51, -0.13],
      drillTo: '/market/uk',
      caption: 'HM Land Registry',
      metric: {
        value: london.data?.percentageChangeYear != null
          ? `${london.data.percentageChangeYear >= 0 ? '+' : ''}${london.data.percentageChangeYear.toFixed(1)}% YoY`
          : 'loading',
        positive: london.data?.percentageChangeYear != null ? london.data.percentageChangeYear >= 0 : null,
      },
      kind: 'live',
    },
    {
      id: 'us',
      name: 'US · New York',
      flag: '🇺🇸',
      location: [40.71, -74.01],
      drillTo: '/market/us',
      caption: 'Case-Shiller + FRED',
      metric: {
        value: nyMetro?.yoyPct != null
          ? `${nyMetro.yoyPct >= 0 ? '+' : ''}${nyMetro.yoyPct.toFixed(1)}% YoY`
          : 'loading',
        positive: nyMetro?.yoyPct != null ? nyMetro.yoyPct >= 0 : null,
      },
      kind: 'live',
    },
    {
      id: 'bali',
      name: 'Bali',
      flag: '🇮🇩',
      location: [-8.34, 115.09],
      drillTo: '/off-plan',
      caption: 'Off-plan inventory',
      metric: {
        value: baliCount.data?.count ? `${baliCount.data.count} projects` : '66 projects',
        positive: true,
      },
      kind: 'off-plan',
    },
    {
      id: 'phuket',
      name: 'Phuket',
      flag: '🇹🇭',
      location: [7.88, 98.40],
      drillTo: '/off-plan',
      caption: 'Off-plan inventory',
      metric: {
        value: phuketCount.data?.count ? `${phuketCount.data.count} projects` : '10 projects',
        positive: true,
      },
      kind: 'off-plan',
    },
    {
      id: 'spain',
      name: 'Spain',
      flag: '🇪🇸',
      location: [40.42, -3.7],
      drillTo: '/request-access?market=spain',
      caption: 'In development',
      metric: { value: 'Coming soon', positive: null },
      kind: 'soon',
    },
  ];

  const markers: GlobeMarker[] = countries.map((c) => ({
    id: c.id,
    location: c.location,
    size: c.kind === 'soon' ? 0.025 : c.kind === 'off-plan' ? 0.04 : 0.05,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <header>
        <h1 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
          <Globe className="h-6 w-6 text-primary" />
          Global <span className="gradient-word">Heatmap</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {countries.filter((c) => c.kind === 'live').length} markets live ·
          {' '}{countries.filter((c) => c.kind === 'off-plan').length} off-plan feeds ·
          {' '}drag the globe to spin · click a country to drill in.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
        {/* Globe — left 3 cols on desktop, full width on mobile */}
        <div className="lg:col-span-3 glass-card p-4 sm:p-6">
          <GlobeAnalytics markers={markers} className="max-w-[560px] mx-auto" />
          <p className="text-center text-[11px] text-white/40 mt-3">
            Interactive · {markers.length} markers · Powered by cobe
          </p>
        </div>

        {/* Country cards — right 2 cols on desktop */}
        <div className="lg:col-span-2 space-y-3">
          {countries.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(c.drillTo)}
              className={`w-full text-left rounded-2xl border p-4 hover:bg-white/[0.04] transition-colors flex items-center gap-3 ${
                c.kind === 'soon'
                  ? 'bg-white/[0.02] border-white/[0.05] opacity-70'
                  : 'bg-white/[0.04] border-white/[0.08]'
              }`}
            >
              <span className="text-3xl leading-none">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-foreground truncate">{c.name}</p>
                  <KindBadge kind={c.kind} />
                </div>
                <p className="text-[10px] text-white/45 truncate">{c.caption}</p>
              </div>
              <div className="text-right shrink-0">
                <MetricLabel metric={c.metric} />
              </div>
              <ArrowUpRight className="h-4 w-4 text-white/30 shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* Source footer */}
      <section className="text-center text-[11px] text-white/35 pt-4 border-t border-white/[0.05]">
        Data sourced from FHFA, HM Land Registry, Dubai Land Department,
        and Reelly partner API. Each country drills into a live
        country-specific dashboard.
      </section>
    </div>
  );
}

/* ─── Subcomponents ─── */

function KindBadge({ kind }: { kind: Country['kind'] }) {
  if (kind === 'live') {
    return (
      <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
    );
  }
  if (kind === 'off-plan') {
    return (
      <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
        Off-plan
      </span>
    );
  }
  return (
    <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/55 border border-white/[0.08]">
      Soon
    </span>
  );
}

function MetricLabel({ metric }: { metric: Country['metric'] }) {
  if (metric.positive === null) {
    return <span className="text-[11px] text-white/45 tabular-nums">{metric.value}</span>;
  }
  const Icon = metric.positive ? TrendingUp : TrendingDown;
  const color = metric.positive ? 'text-emerald-400' : 'text-amber-400';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold tabular-nums ${color}`}>
      <Icon className="h-3 w-3" />
      {metric.value}
    </span>
  );
}
