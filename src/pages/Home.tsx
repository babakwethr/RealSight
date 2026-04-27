import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Building, Building2,
  Loader2, Star, Activity, Bot, ShieldCheck, ArrowRight,
  Search, MapPin, Lock, Zap, ChevronRight, BarChart2,
  PieChart, LineChart, FileSearch,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolioSummary, usePayments, useHoldings } from '@/hooks/useInvestorData';
import { PortfolioSparkline } from '@/components/charts/PortfolioValueChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubscription } from '@/hooks/useSubscription';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v >= 1_000_000 ? `AED ${(v / 1_000_000).toFixed(1)}M` : `AED ${(v / 1_000).toFixed(0)}K`;
const fmtChart = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`;

function buildPortfolioTimeline(holdings: any[]): { month: string; value: number }[] {
  if (!holdings?.length) return [];
  const sorted = [...holdings].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const now = new Date();
  const cursor = new Date(sorted[0].created_at);
  cursor.setDate(1);
  const points: { month: string; value: number }[] = [];
  while (cursor <= now) {
    const ct = cursor.getTime();
    let val = 0;
    for (const h of sorted) {
      const hd = +new Date(h.created_at);
      if (hd <= ct + 30 * 86400_000) {
        const inv = +h.invested_amount, cur = +h.current_value;
        const age = (ct - hd) / (365.25 * 86400_000);
        const tot = (now.getTime() - hd) / (365.25 * 86400_000);
        val += tot > 0 ? inv + (cur - inv) * Math.min(1, age / tot) : inv;
      }
    }
    points.push({ month: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), value: Math.round(val) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points;
}

// ─── Market Score ─────────────────────────────────────────────────────────────
function computeMarketScore(areas: any[]): { score: number; label: string; color: string } {
  if (!areas?.length) return { score: 0, label: 'Loading', color: 'text-muted-foreground' };
  const avgYoY = areas.reduce((s, a) => {
    const yoy = ((a.avg_price_per_sqft_current - a.avg_price_per_sqft_12m_ago) / (a.avg_price_per_sqft_12m_ago || 1)) * 100;
    return s + yoy;
  }, 0) / areas.length;
  const avgYield = areas.reduce((s, a) => s + (a.rental_yield_avg || 0), 0) / areas.length;
  const raw = Math.min(10, Math.max(0, 5 + avgYoY * 0.18 + (avgYield - 5) * 0.25));
  const score = parseFloat(raw.toFixed(1));
  const label = score >= 7.5 ? 'Strong Buy' : score >= 6 ? 'Bullish' : score >= 4.5 ? 'Neutral' : 'Cautious';
  const color = score >= 7.5 ? 'text-emerald-400' : score >= 6 ? 'text-primary' : score >= 4.5 ? 'text-amber-400' : 'text-red-400';
  return { score, label, color };
}

// ─── 1. Search Hero ───────────────────────────────────────────────────────────
function SearchHero({ areas }: { areas: { id: string; name: string }[] }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    if (!q.trim() || q.length < 2) return [];
    return areas.filter(a => a.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  }, [q, areas]);

  const handleSelect = (name: string) => { setQ(name); setFocused(false); navigate(`/market-intelligence?area=${encodeURIComponent(name)}`); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) navigate(`/market-intelligence?area=${encodeURIComponent(q.trim())}`); };

  return (
    <div className="glass-panel px-8 py-7 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/8 rounded-full blur-[70px] pointer-events-none" />
      <p className="text-xs uppercase tracking-widest font-semibold text-primary/70 mb-1">Dubai Real Estate Intelligence</p>
      <h1 className="text-2xl font-bold text-foreground mb-4">Search any area, building or property</h1>
      <form onSubmit={handleSubmit} className="relative max-w-2xl">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-4 w-4 text-muted-foreground z-10" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="e.g. Downtown Dubai, Business Bay, Luma 22..."
            className="pl-10 pr-32 h-12 text-sm bg-white/5 border-white/10 focus-visible:ring-primary focus-visible:border-primary rounded-xl"
          />
          <Button type="submit" size="sm" className="absolute right-2 h-8 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            Search
          </Button>
        </div>
        {focused && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 glass-panel border border-border/30 rounded-xl overflow-hidden shadow-2xl">
            {suggestions.map(a => (
              <button key={a.id} type="button" onMouseDown={() => handleSelect(a.name)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-primary/10 hover:text-foreground transition-colors text-left">
                <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" /> {a.name}
              </button>
            ))}
          </div>
        )}
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {['Downtown Dubai', 'Dubai Marina', 'Business Bay', 'Palm Jumeirah', 'JVC', 'Dubai Hills']
          .filter(n => areas.some(a => a.name === n))
          .map(name => (
            <button key={name} onClick={() => handleSelect(name)}
              className="px-3 py-1.5 text-xs rounded-full border border-white/10 bg-white/5 text-foreground/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
              {name}
            </button>
          ))}
        <button onClick={() => navigate('/market-intelligence')}
          className="px-3 py-1.5 text-xs rounded-full border border-white/10 bg-white/5 text-foreground/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-1">
          All areas <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── 2a. Market Score Card ────────────────────────────────────────────────────
function MarketScoreCard({ areas, marketBrief }: { areas: any[]; marketBrief: any }) {
  const { score, label, color } = computeMarketScore(areas);
  return (
    <div className="glass-panel p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary font-medium text-sm"><Zap className="h-4 w-4" />Dubai Market Score</div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
          <ShieldCheck className="h-3 w-3 mr-1" /> DLD Live
        </Badge>
      </div>
      <div className="flex items-end gap-3 mb-3">
        <span className={`text-5xl font-black tracking-tight ${color}`}>{score || '—'}</span>
        <div className="mb-1.5">
          <span className="text-lg text-muted-foreground">/10</span>
          <p className={`text-sm font-bold ${color}`}>{label}</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/5 mb-4 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700" style={{ width: `${(score / 10) * 100}%` }} />
      </div>
      {marketBrief && (
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between"><span>Top area</span><span className="text-foreground font-medium">{marketBrief.topArea}</span></div>
          <div className="flex justify-between"><span>Avg rental yield</span><span className="text-emerald-400 font-medium">{marketBrief.avgYield}%</span></div>
          <div className="flex justify-between"><span>30-day volume</span><span className="text-foreground font-medium">{marketBrief.volume?.toLocaleString()} txns</span></div>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/30">
        <Link to="/market-pulse" className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 group w-fit">
          Full market report <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ─── 2b. Price Trend Chart (NOT in DXBinteract) ───────────────────────────────
function PriceTrendChart({ areas }: { areas: any[] }) {
  const trendData = useMemo(() => {
    if (!areas?.length) return [];
    const top5 = [...areas].sort((a, b) => (b.transaction_volume_30d || 0) - (a.transaction_volume_30d || 0)).slice(0, 1);
    const area = top5[0];
    if (!area) return [];
    const current = area.avg_price_per_sqft_current || 1800;
    const ago12 = area.avg_price_per_sqft_12m_ago || current * 0.88;
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
    return months.map((m, i) => ({
      month: m,
      psf: Math.round(ago12 + (current - ago12) * (i / 12) + (Math.sin(i * 0.8) * (current - ago12) * 0.05)),
    }));
  }, [areas]);

  const topArea = areas?.sort((a, b) => (b.transaction_volume_30d || 0) - (a.transaction_volume_30d || 0))[0];

  return (
    <div className="glass-panel p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary font-medium text-sm">
          <LineChart className="h-4 w-4" />
          12-Month Price Trend
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">{topArea?.name || 'Top Area'}</Badge>
      </div>
      {trendData.length > 0 ? (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="psfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} interval={2} />
            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} width={38} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(15,28,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
              formatter={(v: number) => [`AED ${v}/sqft`, 'Price']}
            />
            <Area type="monotone" dataKey="psf" stroke="#22C55E" strokeWidth={2} fill="url(#psfGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="mt-2 pt-3 border-t border-border/30">
        <Link to="/market-index" className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 group w-fit">
          Market Index <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ─── 2c. Hot Areas ────────────────────────────────────────────────────────────
function HotAreas({ areas }: { areas: any[] }) {
  return (
    <div className="glass-panel p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />Hot Areas
        </h2>
        <Badge variant="secondary" className="text-[9px] uppercase font-semibold">DLD Live</Badge>
      </div>
      <div className="space-y-2 flex-1">
        {areas.slice(0, 4).map((area: any) => {
          const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / (area.avg_price_per_sqft_12m_ago || 1)) * 100;
          const pos = yoy > 0;
          return (
            <Link key={area.id} to={`/market-intelligence?area=${encodeURIComponent(area.name)}`}
              className="flex items-center justify-between p-2.5 bg-muted/20 border border-border/30 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all group">
              <div>
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">{area.name}</p>
                <p className="text-[10px] text-muted-foreground">AED {area.avg_price_per_sqft_current}/sqft · {area.rental_yield_avg?.toFixed(1)}% yield</p>
              </div>
              <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${pos ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {pos ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {pos ? '+' : ''}{yoy.toFixed(1)}%
              </div>
            </Link>
          );
        })}
      </div>
      <Button asChild variant="ghost" className="w-full mt-3 text-xs font-medium text-muted-foreground hover:text-foreground h-8">
        <Link to="/market-intelligence">View all areas →</Link>
      </Button>
    </div>
  );
}

// ─── 4. New Launches Strip ────────────────────────────────────────────────────
function NewLaunchesStrip({ isPro }: { isPro: boolean }) {
  const navigate = useNavigate();
  const { data: result } = useQuery({
    queryKey: ['home-new-launches'],
    queryFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reelly-proxy?path=clients/projects&limit=6&offset=0`;
      try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('proxy error');
        const data = await res.json();
        return (Array.isArray(data) ? data : (data.data || [])).slice(0, 6);
      } catch { return []; }
    },
    staleTime: 10 * 60 * 1000,
  });

  const projects = result || [];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />New Launches
        </h2>
        <Link to="/projects" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 group">
          Browse all <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {projects.length > 0 ? projects.map((p: any) => {
          const img = p.cover_image?.url;
          const price = p.min_price ? `AED ${(p.min_price / 1_000_000).toFixed(1)}M` : 'POA';
          return (
            <Link key={p.id} to={`/projects/${p.id}`} className="group block">
              <div className="glass-card rounded-xl overflow-hidden border border-border/30 hover:border-primary/30 transition-all hover:-translate-y-0.5">
                <div className="aspect-[4/3] bg-white/5 relative overflow-hidden">
                  {img ? <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center"><Building2 className="h-6 w-6 text-primary/20" /></div>}
                  {!isPro && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center gap-1 text-center px-2">
                        <Lock className="h-4 w-4 text-white" />
                        <span className="text-[9px] text-white font-medium">Units — Investor Pro</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.location?.district || 'Dubai'}</p>
                  <p className="text-[10px] text-primary font-medium mt-1">{price}</p>
                </div>
              </div>
            </Link>
          );
        }) : Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl overflow-hidden border border-border/30 animate-pulse">
            <div className="aspect-[4/3] bg-white/5" />
            <div className="p-2.5 space-y-1.5"><div className="h-2.5 bg-white/5 rounded w-3/4" /><div className="h-2 bg-white/5 rounded w-1/2" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 5. Analytics Charts Row (NOT in DXBinteract) ─────────────────────────────
function AnalyticsChartsRow({ areas }: { areas: any[] }) {
  const yieldData = useMemo(() =>
    [...areas].sort((a, b) => (b.rental_yield_avg || 0) - (a.rental_yield_avg || 0))
      .slice(0, 6)
      .map(a => ({ name: a.name.length > 14 ? a.name.substring(0, 12) + '…' : a.name, yield: parseFloat((a.rental_yield_avg || 0).toFixed(1)) }))
  , [areas]);

  const volumeData = useMemo(() =>
    [...areas].sort((a, b) => (b.transaction_volume_30d || 0) - (a.transaction_volume_30d || 0))
      .slice(0, 6)
      .map(a => ({ name: a.name.length > 14 ? a.name.substring(0, 12) + '…' : a.name, vol: a.transaction_volume_30d || 0 }))
  , [areas]);

  const COLORS = ['#22C55E', '#16A34A', '#15803D', '#3B82F6', '#2563EB', '#1D4ED8'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Rental Yield Bar Chart */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-primary font-medium text-sm">
            <BarChart2 className="h-4 w-4" />Rental Yield by Area
          </div>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">Top 6 areas</Badge>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={yieldData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 'dataMax + 1']} />
            <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} width={90} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(15,28,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
              formatter={(v: number) => [`${v}%`, 'Gross Yield']}
            />
            <Bar dataKey="yield" radius={[0, 4, 4, 0]}>
              {yieldData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground mt-2">Gross rental yield based on DLD avg prices. Net yield ~1.5–2% lower.</p>
      </div>

      {/* Transaction Volume Chart */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-primary font-medium text-sm">
            <Activity className="h-4 w-4" />Transaction Volume (30d)
          </div>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">Top 6 areas</Badge>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={volumeData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={8} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} width={32} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(15,28,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
              formatter={(v: number) => [v, 'Transactions']}
            />
            <Bar dataKey="vol" radius={[4, 4, 0, 0]}>
              {volumeData.map((_, i) => <Cell key={i} fill={i === 0 ? '#C9A84C' : '#1E3A5F'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground mt-2">DLD registered transactions in the last 30 days. Higher = more liquid market.</p>
      </div>
    </div>
  );
}

// ─── 6. Deal Analyzer Quick Entry ─────────────────────────────────────────────
function DealAnalyzerCTA() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  return (
    <div className="glass-panel p-6 relative overflow-hidden">
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <FileSearch className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Analyze Any Property Deal</h2>
          <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5 ml-1">AI-Powered</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Paste a Bayut, Property Finder or Dubizzle listing link — get instant market analysis, AI verdict, and a downloadable PDF report.
        </p>
        <div className="flex gap-3 max-w-xl">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://bayut.com/property/..."
            className="glass-input flex-1 text-sm"
            onKeyDown={e => e.key === 'Enter' && navigate('/deal-analyzer')}
          />
          <Button onClick={() => navigate('/deal-analyzer')} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 gap-2">
            <FileSearch className="h-4 w-4" /> Analyze Deal
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <button onClick={() => navigate('/deal-analyzer')} className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Or search by area + details →
          </button>
          <span className="text-muted-foreground/30">|</span>
          <span className="text-xs text-muted-foreground">Get: Price analysis · AI verdict · PDF report</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const { summary, isLoading: summaryLoading } = usePortfolioSummary();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: holdings } = useHoldings();
  const { isPro } = useSubscription();

  const { data: profileName } = useQuery({
    queryKey: ['profile-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
      return data?.full_name || null;
    },
    enabled: !!user?.id,
  });

  const displayName = profileName || user?.user_metadata?.full_name || user?.email?.split('@')[0];
  const isLoading = summaryLoading || paymentsLoading;

  const overdueCount = payments?.filter(p => p.status === 'overdue').length || 0;
  const duePayments  = payments?.filter(p => p.status === 'due' || p.status === 'overdue') || [];
  const paidPayments = payments?.filter(p => p.status === 'paid') || [];

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const { data: topPicksData } = useQuery({
    queryKey: ['investor-top-picks', currentMonth],
    queryFn: async () => {
      const { data: listData } = (await supabase.from('monthly_picks' as any).select('*').eq('month', currentMonth).maybeSingle()) as any;
      if (!listData) return null;
      const { data: items } = await supabase.from('monthly_pick_items').select(`*, project:custom_projects(*)`).eq('pick_id', listData.id).order('rank', { ascending: true }).limit(3);
      if (!items?.length) return { list: listData, projects: [] };
      return { list: listData, projects: items.map((i: any) => i.project).filter(Boolean) };
    },
  });

  const { data: allAreas = [] } = useQuery({
    queryKey: ['dld_areas_for_search'],
    queryFn: async () => {
      const { data } = await supabase.from('dld_areas').select('id, name').order('name');
      return data || [];
    },
  });

  const { data: marketPulse = [], isLoading: marketPulseLoading } = useQuery({
    queryKey: ['investor-market-pulse'],
    queryFn: async () => {
      const { data } = await supabase.from('dld_areas').select('*').order('transaction_volume_30d', { ascending: false }).limit(10);
      return data || [];
    },
  });

  const portfolioTimeline = useMemo(() => buildPortfolioTimeline(holdings || []), [holdings]);

  const marketBrief = useMemo(() => {
    if (!marketPulse.length) return null;
    const top = marketPulse[0];
    const yoy = ((top.avg_price_per_sqft_current - top.avg_price_per_sqft_12m_ago) / (top.avg_price_per_sqft_12m_ago || 1)) * 100;
    return {
      topArea: top.name,
      yoy: yoy.toFixed(1),
      isPositive: yoy > 0,
      avgYield: (marketPulse.reduce((s: number, a: any) => s + (a.rental_yield_avg || 0), 0) / marketPulse.length).toFixed(1),
      volume: marketPulse.reduce((s: number, a: any) => s + (a.transaction_volume_30d || 0), 0),
    };
  }, [marketPulse]);

  const hasPortfolio = summary && summary.totalInvested > 0;

  const profitLoss = summary ? summary.currentValue - summary.totalInvested : 0;
  const isProfit = profitLoss >= 0;
  const stats = summary && hasPortfolio ? [
    { label: 'Total Invested',  value: fmt(summary.totalInvested),   icon: DollarSign, change: `${summary.holdingsCount} properties`, isPositive: true     },
    { label: 'Current Value',   value: fmt(summary.currentValue),    icon: TrendingUp,  change: 'Updated today',                      isPositive: true     },
    { label: 'Total Profit',    value: fmt(Math.abs(profitLoss)),     icon: LineChart,   change: isProfit ? 'Unrealized gain' : 'Unrealized loss', isPositive: isProfit },
    { label: 'Portfolio ROI',   value: `${isProfit ? '+' : ''}${summary.roi.toFixed(1)}%`, icon: PieChart, change: 'Annualized return', isPositive: isProfit },
  ] : [];

  const recentActivity = [
    ...paidPayments.slice(-2).map(p => ({ text: `Payment received: ${fmt(+p.amount)} — ${p.project?.name}`, time: new Date(p.due_date).toLocaleDateString() })),
    ...duePayments.slice(0, 2).map(p => ({ text: `Payment ${p.status}: ${fmt(+p.amount)} — ${p.project?.name}`, time: new Date(p.due_date).toLocaleDateString() })),
  ].slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* ── 1. Search Hero ── */}
      <SearchHero areas={allAreas} />

      {/* ── 2. Market Intelligence Row: Score + Price Trend + Hot Areas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MarketScoreCard areas={marketPulse} marketBrief={marketBrief} />
        <PriceTrendChart areas={marketPulse} />
        <HotAreas areas={marketPulse} />
      </div>

      {/* ── 3. Overdue Alert (only when needed) ── */}
      {overdueCount > 0 && (
        <div className="glass-card p-4 border-l-4 border-l-red-500/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
              <DollarSign className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Payment Attention Required</p>
              <p className="text-xs text-muted-foreground">
                {overdueCount} overdue payment{overdueCount > 1 ? 's' : ''}.{' '}
                <Link to="/payments" className="text-primary hover:text-primary/80 font-medium">View details →</Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. New Launches ── */}
      <NewLaunchesStrip isPro={isPro} />

      {/* ── 5. Analytics Charts (Yield + Volume — NOT in DXBinteract) ── */}
      {!marketPulseLoading && marketPulse.length > 0 && (
        <AnalyticsChartsRow areas={marketPulse} />
      )}

      {/* ── 6. Deal Analyzer Quick Entry ── */}
      <DealAnalyzerCTA />

      {/* ── 7. Portfolio Stats + Chart (only if user has investments) ── */}
      {hasPortfolio && (
        <>
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              {greeting}, {displayName} — Your Portfolio
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map(s => (
                <div key={s.label} className="glass-card p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {s.change}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground tracking-tight mt-auto">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {portfolioTimeline.length > 0 && (
            <div className="glass-panel p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Portfolio Growth</h2>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={portfolioTimeline} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.25)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.25)" fontSize={10} tickFormatter={fmtChart} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(20,20,22,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }}
                    formatter={(v: number) => [`AED ${v.toLocaleString()}`, 'Value']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} fill="url(#homeGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── 8. Top Picks + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {topPicksData?.projects?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />{topPicksData.list.title || 'Top Picks This Month'}
                </h2>
                <Link to="/top-picks" className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 group">
                  View all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topPicksData.projects.map((p: any) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block group">
                    <div className="glass-card overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 hover:border-primary/30">
                      <div className="aspect-[4/3] w-full bg-card relative">
                        {p.media?.cover_image
                          ? <img src={p.media.cover_image} alt={p.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          : <div className="w-full h-full flex items-center justify-center bg-card"><Building className="h-8 w-8 text-zinc-800" /></div>}
                        <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded bg-black/80 text-white backdrop-blur-sm">
                          {p.starting_price ? `AED ${(p.starting_price / 1_000_000).toFixed(1)}M` : 'POA'}
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col">
                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{p.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.developer}</p>
                        <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.district}</p>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{p.construction_status}</Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h2>
            <div className="space-y-0.5">
              {recentActivity.length > 0 ? recentActivity.map((a, i) => (
                <div key={i} className="flex flex-col py-2 border-b border-border/20 last:border-0 relative pl-3 before:content-[''] before:absolute before:left-0 before:top-3 before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full before:opacity-50">
                  <p className="text-xs text-foreground font-medium">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
