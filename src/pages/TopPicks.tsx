import { useState, useMemo } from 'react';
import { BackButton } from '@/components/BackButton';
import { Star, Bot, Shield, Bookmark, BarChart3, Loader2, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_PROJECTS } from '@/data/demoProjects';
import { ReellyProject } from '@/types/reelly';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FeatureGate } from '@/components/FeatureGate';
import { UpsellBanner } from '@/components/UpsellBanner';

type PickSource = 'advisor' | 'ai' | 'reelly';

const formatPrice = (price: number | undefined, currency?: string) => {
  if (!price) return 'Price on request';
  const c = currency || 'AED';
  if (price >= 1000000) return `${c} ${(price / 1000000).toFixed(1)}M`;
  if (price >= 1000) return `${c} ${(price / 1000).toFixed(0)}K`;
  return `${c} ${price}`;
};

// Score a project based on real DLD area data
function scoreProject(project: any, dldAreas: any[]): { score: number; reason: string } {
  if (!dldAreas || dldAreas.length === 0) return { score: 70, reason: 'Market data pending' };

  // Try to match project location to a DLD area
  const location = typeof project.location === 'object'
    ? (project.location?.district || project.location?.city || '')
    : (project.location || project.district || '');

  const locLower = location.toLowerCase();
  const matchedArea = dldAreas.find(a => {
    const aName = a.name.toLowerCase();
    return aName === locLower
      || aName.includes(locLower)
      || locLower.includes(aName)
      || locLower.split(' ').some((w: string) => w.length > 2 && aName.includes(w));
  });

  if (!matchedArea) {
    // Use overall market averages
    const avgYield = dldAreas.reduce((s, a) => s + a.rental_yield_avg, 0) / dldAreas.length;
    const avgDemand = dldAreas.reduce((s, a) => s + a.demand_score, 0) / dldAreas.length;
    const score = Math.round(Math.min(95, 50 + avgYield * 3 + avgDemand / 5));
    return { score, reason: 'Market average fundamentals' };
  }

  const yieldScore = matchedArea.rental_yield_avg * 5; // 0-50 pts
  const demandScore = matchedArea.demand_score / 2.5; // 0-40 pts
  const yoyGrowth = ((matchedArea.avg_price_per_sqft_current - matchedArea.avg_price_per_sqft_12m_ago) / matchedArea.avg_price_per_sqft_12m_ago) * 100;
  const growthScore = Math.min(15, Math.max(0, yoyGrowth)); // 0-15 pts

  const totalScore = Math.round(Math.min(95, Math.max(50, 30 + yieldScore + demandScore + growthScore)));

  // Determine primary reason
  let reason: string;
  if (matchedArea.rental_yield_avg >= 6.5) {
    reason = `Strong rental yield (${matchedArea.rental_yield_avg.toFixed(1)}%)`;
  } else if (yoyGrowth >= 10) {
    reason = `High growth corridor (+${yoyGrowth.toFixed(1)}% YoY)`;
  } else if (matchedArea.demand_score >= 75) {
    reason = `High demand area (${matchedArea.demand_score}/100)`;
  } else if (matchedArea.avg_price_per_sqft_current <= 1200) {
    reason = `Undervalued at AED ${matchedArea.avg_price_per_sqft_current}/sqft`;
  } else {
    reason = `Balanced fundamentals (${matchedArea.rental_yield_avg.toFixed(1)}% yield)`;
  }

  return { score: totalScore, reason };
}

function TopPicksContent() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PickSource>('advisor');
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Fetch DLD areas for real scoring
  const { data: dldAreas } = useQuery({
    queryKey: ['top-picks-dld-areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dld_areas').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Advisor picks from monthly_picks + monthly_pick_items + custom_projects
  const { data: advisorPicks, isLoading: advisorLoading } = useQuery({
    queryKey: ['top-picks-advisor', currentMonth],
    queryFn: async () => {
      try {
        const { data: listData } = (await supabase
          .from('monthly_picks' as any)
          .select('*')
          .eq('month', currentMonth)
          .maybeSingle()) as { data: any; error: any };

        if (!listData) return { list: null, projects: [] };

        const { data: items } = await supabase
          .from('monthly_pick_items')
          .select(`*, project:custom_projects(*)`)
          .eq('pick_id', listData.id)
          .order('rank', { ascending: true });

        const projects = (items || []).map((item: any) => item.project).filter(Boolean);
        return { list: listData, projects };
      } catch {
        return { list: null, projects: [] };
      }
    },
  });

  // Reelly off-plan projects from the reelly-proxy edge function
  const { data: reellyProjects, isLoading: reellyLoading } = useQuery({
    queryKey: ['top-picks-reelly'],
    queryFn: async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reelly-proxy?path=clients/projects&limit=12&offset=0`;
        const res = await fetch(url, {
          headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        return (data?.items || data || []) as ReellyProject[];
      } catch {
        return DEMO_PROJECTS.slice(0, 8) as ReellyProject[];
      }
    },
  });

  // AI picks — score projects using real DLD area data
  const aiPicks = useMemo(() => {
    const projects = reellyProjects || DEMO_PROJECTS.slice(0, 6);
    const areas = dldAreas || [];

    return projects.slice(0, 6).map(p => {
      const { score, reason } = scoreProject(p, areas);
      return { ...p, aiScore: score, aiReason: reason };
    }).sort((a, b) => b.aiScore - a.aiScore);
  }, [reellyProjects, dldAreas]);

  const handleSaveToWatchlist = (name: string) => {
    try {
      const STORAGE_KEY = 'realsight-watchlist';
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const alreadySaved = existing.some((item: any) => item.name === name && item.type === 'projects');
      if (alreadySaved) {
        toast.info(`${name} is already in your watchlist`);
        return;
      }
      existing.push({
        id: `wl-${Date.now()}`,
        type: 'projects',
        name,
        description: 'Saved from Top Picks',
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      toast.success(`${name} saved to watchlist`);
    } catch {
      toast.error('Failed to save to watchlist');
    }
  };

  const renderProjectCard = (project: any, source: PickSource, index: number) => {
    const name = project.name || 'Untitled Project';
    const developer = project.developer || project.developer_name || 'Unknown Developer';
    const location = typeof project.location === 'object'
      ? project.location?.district || project.location?.city || ''
      : project.location || '';
    const price = project.min_price || project.starting_price || project.price;
    const image = project.cover_image?.url || project.image_url || project.thumbnail_url;
    const currency = project.currency || 'AED';

    return (
      <div key={project.id || index} className="relative rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col backdrop-blur-md bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent z-10" />

        {/* Image */}
        <div className="relative h-44 bg-white/[0.03] overflow-hidden">
          {image ? (
            <img src={image} alt={name} loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent">
              <Building className="h-10 w-10 text-primary/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Top badges — score tag is the differentiator per the Mobile Redesign Pack mockup.
              Mint glow for AI scores ≥ 9, gold for 8-8.9, neutral below. */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            {index < 3 && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/95 text-black uppercase tracking-wider shadow-[0_4px_12px_-4px_rgba(245,158,11,0.6)]">
                #{index + 1}
              </span>
            )}
            {source === 'ai' && project.aiScore && (() => {
              const score = Number(project.aiScore);
              const tier = score >= 9 ? 'mint' : score >= 8 ? 'gold' : 'neutral';
              const styles = {
                mint: { color: '#022c1c', bg: 'linear-gradient(135deg, #2effc0 0%, #18d6a4 100%)', border: 'rgba(46,255,192,0.85)', shadow: '0 4px 14px -4px rgba(46,255,192,0.6)' },
                gold: { color: '#2a1c00', bg: 'linear-gradient(135deg, #ffe084 0%, #c9a84c 100%)', border: 'rgba(201,168,76,0.9)', shadow: '0 4px 14px -4px rgba(201,168,76,0.55)' },
                neutral: { color: '#fff', bg: 'rgba(0,0,0,0.65)', border: 'rgba(255,255,255,0.20)', shadow: '0 4px 12px -4px rgba(0,0,0,0.6)' },
              }[tier];
              return (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-[3px] rounded-md uppercase tracking-wider backdrop-blur-sm"
                  style={{
                    color: styles.color,
                    background: styles.bg,
                    border: `1px solid ${styles.border}`,
                    boxShadow: styles.shadow,
                  }}
                >
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {score.toFixed(1)} / 10
                </span>
              );
            })()}
          </div>

          {/* Price overlay — stacked AED/USD per the Mobile Redesign Pack mockup.
              AED prominent, USD muted below (only when currency is AED so we
              don't fabricate USD-from-USD conversions). */}
          <div className="absolute bottom-3 left-3">
            <span className="block text-base font-black text-white leading-none" style={{ fontFamily: 'Berkeley Mono, monospace', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              {formatPrice(price, currency)}
            </span>
            {price && (currency || 'AED') === 'AED' && (
              <span className="block text-[11px] font-bold text-white/65 mt-0.5" style={{ fontFamily: 'Berkeley Mono, monospace', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                USD {(() => {
                  const usd = price / 3.6725;
                  if (usd >= 1000000) return `${(usd / 1000000).toFixed(1)}M`;
                  if (usd >= 1000) return `${(usd / 1000).toFixed(0)}K`;
                  return Math.round(usd).toLocaleString();
                })()}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <p className="text-[10px] text-primary/80 font-black uppercase tracking-wider mb-1 line-clamp-1">{developer}</p>
          <h3 className="text-sm font-bold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">{name}</h3>
          {location && (
            <p className="text-xs text-foreground/50 line-clamp-1 mb-2">{location}</p>
          )}

          {source === 'ai' && project.aiReason && (
            <div className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md mb-3 line-clamp-2">
              {project.aiReason}
            </div>
          )}

          <div className="flex gap-2 mt-auto pt-2">
            <button
              onClick={() => navigate('/concierge', { state: { initialMessage: `Analyze the project "${name}" by ${developer} in ${location}. What's the investment potential?` } })}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all bg-white/[0.06] border border-white/[0.10] text-foreground/80 hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
            >
              <BarChart3 className="h-3 w-3" />
              Analyze
            </button>
            <button
              onClick={() => handleSaveToWatchlist(name)}
              className="p-2 rounded-xl transition-all bg-white/[0.06] border border-white/[0.10] text-foreground/80 hover:bg-white/[0.10] hover:text-primary"
              aria-label="Save to watchlist"
            >
              <Bookmark className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Top Picks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Curated investment picks from AI, your advisor, and new launches
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5"
          onClick={() => navigate('/concierge', { state: { initialMessage: 'Based on my portfolio and investment profile, what are your top personalized investment picks for me right now?' } })}
        >
          <Bot className="h-3.5 w-3.5" />
          Get Personalized Picks
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as PickSource)} className="w-full">
        <TabsList className="bg-muted/30 p-1">
          <TabsTrigger value="advisor" className="gap-1.5 text-xs">
            <Shield className="h-3 w-3" />
            Advisor Picks
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5 text-xs">
            <Bot className="h-3 w-3" />
            AI Picks
          </TabsTrigger>
          <TabsTrigger value="reelly" className="gap-1.5 text-xs">
            <Building className="h-3 w-3" />
            New Launches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advisor" className="mt-4">
          {advisorLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : advisorPicks?.projects && advisorPicks.projects.length > 0 ? (
            <div>
              {advisorPicks.list && (
                <div className="glass-panel p-4 mb-4 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{advisorPicks.list.title}</p>
                    {advisorPicks.list.notes && (
                      <p className="text-xs text-muted-foreground">{advisorPicks.list.notes}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {advisorPicks.projects.map((p: any, i: number) => renderProjectCard(p, 'advisor', i))}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 text-center">
              <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-1">No advisor picks for this month yet</p>
              <p className="text-muted-foreground/60 text-xs">Check back soon or explore AI Picks and New Launches tabs</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <div className="glass-panel p-4 mb-4 flex items-center gap-3">
            <Bot className="h-5 w-5 text-accent-blue shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm">AI-Analyzed Picks</p>
              <p className="text-xs text-muted-foreground">Projects scored using DLD market data — yield, demand, and growth indicators</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiPicks.map((p, i) => renderProjectCard(p, 'ai', i))}
          </div>
        </TabsContent>

        <TabsContent value="reelly" className="mt-4">
          {reellyLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : (
            <div>
              <div className="glass-panel p-4 mb-4 flex items-center gap-3">
                <Building className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">New Launches</p>
                  <p className="text-xs text-muted-foreground">Live new launch projects — updated daily</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(reellyProjects || []).map((p: any, i: number) => renderProjectCard(p, 'reelly', i))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TopPicks() {
  return (
    <>
      <FeatureGate feature="top-picks" blur>
        <TopPicksContent />
      </FeatureGate>
      <UpsellBanner feature="ai-investor-presentation" className="mt-6" />
    </>
  );
}
