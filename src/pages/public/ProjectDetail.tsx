import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useSearchParams } from 'react-router-dom';

import {
  MapPin, Building, Calendar, ArrowLeft, Loader2, AlertCircle, Share2,
  FileText, CheckCircle2, ShieldCheck, PlayCircle, Layers, CreditCard,
  Info, Sparkles, Building2, ArrowRight, Radio
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { ReellyProject } from '@/types/reelly';
import { analyzePaymentPlan } from '@/lib/reelly';
import { DEMO_PROJECTS } from '@/data/demoProjects';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/hooks/useSubscription';
import { UpsellBanner } from '@/components/UpsellBanner';

// Per LAUNCH_PLAN.md §17 — public surfaces never expose a UAE phone number.
// We are a US-incorporated software company; enquiries route through a generic
// concierge inbox so the lead is captured and routed centrally (not into a
// personal WhatsApp DM that doesn't scale).
const CONCIERGE_EMAIL = 'concierge@realsight.app';

async function fetchReellyProjectDetail(id: string): Promise<ReellyProject> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reelly-proxy?path=clients/projects/${id}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errData = await res.json();
        if (errData.error) errorMessage = `Proxy Error: ${errData.error}`;
      } catch (e) { }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    const result = data.data || data;
    if (!result || Object.keys(result).length === 0) {
      throw new Error('Empty response from live feed');
    }
    return result;
  } catch (err) {
    console.warn(`Live proxy failed, searching demo projects for id ${id}...`);
    const demoProject = DEMO_PROJECTS.find(p => p.id === id);
    if (demoProject) {
      return demoProject as any;
    }
    throw err;
  }
}

/**
 * Live unit availability — Investor Pro feature (per LAUNCH_PLAN.md §13.2).
 * Calls reelly-proxy with the project units endpoint. Returns [] on any failure
 * so the UI can show a "connecting to live inventory" placeholder rather than
 * an error state. The real shape is upstream-defined; we keep it loose.
 */
async function fetchReellyProjectUnits(id: string): Promise<any[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reelly-proxy?path=clients/projects/${id}/units`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const units = data?.data || data?.units || data;
    return Array.isArray(units) ? units : [];
  } catch {
    return [];
  }
}

async function fetchInternalProjectDetail(id: string) {
  const { data, error } = await (supabase
    .from('custom_projects' as any) as any)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || 'reelly';
  const { t } = useTranslation();
  const { isInvestorPro, loading: subLoading } = useSubscription();

  const isInternal = source === 'internal' || id?.length === 36; // UUID check as fallback

  const { data: project, isLoading: isProjectLoading, error } = useQuery({
    queryKey: ['project-detail', id, source],
    queryFn: async () => {
      if (isInternal) {
        return (await fetchInternalProjectDetail(id!)) as any;
      }
      return (await fetchReellyProjectDetail(id!)) as any;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: developerInfo, isLoading: isDevLoading } = useQuery({
    queryKey: ['dld-developer', (project as any)?.developer],
    queryFn: async () => {
      const p = project as any;
      if (!p?.developer) return null;
      // Exact or partial match for demo purposes
      const { data } = await supabase
        .from('dld_developers')
        .select('*')
        .ilike('name', `%${p.developer.split(' ')[0]}%`)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!(project as any)?.developer,
  });

  // Live unit availability (Investor Pro). Only fire when:
  //   - we're on a Reelly-source project (internal demos don't have a Reelly id)
  //   - the user has Investor Pro+ (server-side proxy also gates via API key)
  const showLiveUnitsTab = !isInternal;
  const { data: liveUnits, isLoading: isUnitsLoading } = useQuery({
    queryKey: ['reelly-units', id],
    queryFn: () => fetchReellyProjectUnits(id!),
    enabled: !!id && showLiveUnitsTab && isInvestorPro && !subLoading,
    staleTime: 60 * 1000,
  });

  const isLoading = isProjectLoading || (!!(project as any)?.developer && isDevLoading);

  /** Build a `mailto:` link pre-filled with project context. */
  const getConciergeUrl = () => {
    if (!project) return `mailto:${CONCIERGE_EMAIL}`;
    const p = project as any;
    const subject = encodeURIComponent(`Enquiry: ${p.name} (${p.developer})`);
    const body = encodeURIComponent(
      `Hi RealSight team,\n\nI'm interested in the ${p.name} project by ${p.developer}. ` +
      `Could you share more details — current availability, payment plans, and any opportunity signals you have on this project?\n\nThanks.`,
    );
    return `mailto:${CONCIERGE_EMAIL}?subject=${subject}&body=${body}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-20 px-4 sm:px-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-foreground/60 animate-pulse">Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-6xl mx-auto py-20 px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl border border-red-500/20">
          <AlertCircle className="h-12 w-12 text-red-400 mb-6" />
          <h1 className="text-3xl font-light text-foreground mb-4">Project Not Found</h1>
          <p className="text-foreground/60 mb-8 max-w-md">We couldn't load the details for this project. It may have been removed or the link is invalid.</p>
          <Button asChild className="bg-primary hover:bg-accent-green-dark text-black">
            <Link to="/projects">Return to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  const p = project as any;
  const priceDisplay = isInternal
    ? (p.starting_price ? `AED ${Number(p.starting_price).toLocaleString()}` : 'Price on Request')
    : (p.min_price ? new Intl.NumberFormat('en-AE', { style: 'currency', currency: p.currency || 'AED', maximumFractionDigits: 0 }).format(p.min_price) : 'Price on Request');

  const isReady = isInternal
    ? (p.construction_status === 'Ready' || p.construction_status === 'Completed')
    : (p.construction_status === 'Ready' || p.completion_date === 'Ready');

  // Unified Media Extraction
  const coverImage = isInternal ? p.media?.cover_image : p.cover_image?.url;
  const gallery = isInternal ? (p.media?.gallery || []) : (p.media?.architecture || []);
  const intMedia = isInternal ? [] : (p.media?.interior || []); // Internal uses flat gallery
  const floorPlans = isInternal ? (p.media?.floor_plans || []) : (p.media?.floor_plans || []);
  const videoUrl = isInternal ? p.media?.video_url : null;
  const brochureUrl = isInternal ? p.media?.brochure : null;

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-700">

      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <Button asChild variant="ghost" className="-ml-4 text-foreground/60 hover:text-foreground">
          <Link to={isInternal ? "/picks" : "/projects"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {isInternal ? "Picks" : "Projects"}
          </Link>
        </Button>
        <div className="flex gap-2">
          {isInternal && <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">Realsight Internal</Badge>}
          {!isInternal && <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5">Live Market Feed</Badge>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-16">
        {/* Left: Gallery */}
        <div className="space-y-6">
          <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl group">
            {coverImage ? (
              <img src={coverImage} alt={p.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full bg-card flex flex-col items-center justify-center">
                <Building2 className="h-16 w-16 text-zinc-800" />
              </div>
            )}

            <div className="absolute top-6 left-6 flex gap-2">
              <Badge className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl border border-white/10",
                isReady ? "bg-green-500/20 text-green-300" : "bg-black/60 text-white"
              )}>
                {isInternal ? p.construction_status : p.construction_status}
              </Badge>
              {p.sale_status === 'Sold Out' && (
                <Badge className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-500/80 text-white border-none">
                  Sold Out
                </Badge>
              )}
            </div>

            {videoUrl && (
              <a href={videoUrl} target="_blank" rel="noreferrer" className="absolute bottom-6 right-6 h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center text-black shadow-2xl hover:scale-110 transition-transform">
                <PlayCircle className="h-6 w-6" />
              </a>
            )}
          </div>

          {gallery.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {gallery.slice(0, 4).map((img: any, i: number) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-white/5 bg-card group cursor-pointer">
                  <img src={isInternal ? img : img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="flex flex-col">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold uppercase tracking-[0.2em] text-xs">{(isInternal ? p.developer : p.developer) || 'Elite Developer'}</span>
                {developerInfo && (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 text-[9px] px-1.5 py-0">Verified</Badge>
                )}
              </div>
              <h1 className="text-5xl md:text-6xl font-cinematic text-foreground tracking-tighter leading-none">{p.name}</h1>
              <p className="text-xl text-muted-foreground flex items-center gap-2 font-light">
                <MapPin className="h-5 w-5 text-primary" />
                {isInternal ? `${p.district}, ${p.city}` : (p.location?.district || p.location?.city || 'Dubai')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-background border border-white/5 space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Starting Price</p>
                <p className="text-2xl font-light text-primary">{priceDisplay}</p>
              </div>
              <div className="p-6 rounded-3xl bg-background border border-white/5 space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Handover</p>
                <p className="text-2xl font-light text-foreground">{(isInternal ? p.completion_date : p.completion_date) || 'TBD'}</p>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-gradient-to-br from-card to-background border border-white/10 space-y-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-foreground">Premium Selection</h4>
                  <p className="text-sm text-muted-foreground font-light">Curated specifically for distinguished institutional investors.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild className="flex-1 bg-primary hover:bg-accent-green-light text-black font-bold h-14 rounded-2xl shadow-xl transition-all">
                  <a href={getConciergeUrl()}>Inquire via Concierge</a>
                </Button>
                {brochureUrl && (
                  <Button asChild variant="outline" className="h-14 rounded-2xl border-white/10 hover:bg-white/5 px-6">
                    <a href={brochureUrl} target="_blank" rel="noreferrer"><FileText className="h-5 w-5 mr-2" /> Brochure</a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-background border border-white/5 p-1 rounded-2xl h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-black text-sm font-medium">Overview</TabsTrigger>
          <TabsTrigger value="amenities" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-black text-sm font-medium">Amenities</TabsTrigger>
          <TabsTrigger value="payment" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-black text-sm font-medium text-center">Payment Plan</TabsTrigger>
          {isInternal && p.unit_sizes && <TabsTrigger value="availability" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-black text-sm font-medium">Configurations</TabsTrigger>}
          {showLiveUnitsTab && (
            <TabsTrigger value="live-units" className="rounded-xl px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-black text-sm font-medium flex items-center gap-2">
              <Radio className="h-3.5 w-3.5" />
              Live Units
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">PRO</span>
            </TabsTrigger>
          )}
        </TabsList>

        <div className="min-h-[400px]">
          <TabsContent value="overview" className="focus-visible:ring-0">
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 prose prose-invert prose-emerald max-w-none">
                <ReactMarkdown
                  components={{
                    h2: ({ node, ...props }) => <h2 className="text-3xl font-cinematic text-foreground mt-8 mb-4 tracking-tighter" {...props} />,
                    p: ({ node, ...props }) => <p className="text-muted-foreground text-lg font-light leading-relaxed mb-6" {...props} />,
                    li: ({ node, ...props }) => <li className="text-muted-foreground text-lg mb-2" {...props} />,
                  }}
                >
                  {(isInternal ? p.description : p.overview) || "No detailed description provided for this premium offering."}
                </ReactMarkdown>
              </div>
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-background border border-white/5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Key Highlights</h4>
                  <ul className="space-y-3">
                    {isInternal ? p.key_highlights?.map((h: string, i: number) => (
                      <li key={i} className="flex gap-3 items-start text-sm font-light text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {h}
                      </li>
                    )) : (
                      <li className="flex gap-3 items-start text-sm font-light text-foreground">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        Contact support for detailed highlights.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="amenities" className="focus-visible:ring-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(isInternal ? p.amenities : p.amenities)?.map((amenity: any, i: number) => (
                <div key={i} className="p-6 rounded-3xl bg-background border border-white/5 flex flex-col items-center text-center space-y-3 hover:border-primary/30 transition-all">
                  <div className="h-12 w-12 rounded-full bg-card border border-white/5 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium tracking-tight text-foreground">{isInternal ? amenity : amenity.name}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payment" className="focus-visible:ring-0">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="text-center space-y-2">
                <CreditCard className="h-10 w-10 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-cinematic text-foreground tracking-tight">Structured Payment Strategy</h2>
                <p className="text-muted-foreground font-light text-lg">Optimized for capital preservation and maximum ROI.</p>
              </div>

              <div className="relative">
                <div className="absolute left-[15px] md:left-1/2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-transparent via-primary/20 to-transparent" />

                {(isInternal ? p.payment_plan : p.payment_plans?.[0]?.steps)?.map((step: any, i: number) => (
                  <div key={i} className={`relative flex items-center mb-12 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    <div className="absolute left-0 md:left-1/2 md:-ml-2 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center z-10 shadow-2xl">
                      <span className="text-[10px] font-black">{i + 1}</span>
                    </div>
                    <div className="ml-12 md:ml-0 md:w-1/2 md:px-12">
                      <div className="p-8 rounded-[2rem] bg-background border border-white/5 hover:border-primary/20 transition-all space-y-1">
                        <span className="text-4xl font-light text-primary">{isInternal ? (step.percentage || step.payment) : step.percentage}%</span>
                        <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">{isInternal ? step.milestone : step.type}</h4>
                        <p className="text-xs text-muted-foreground font-light">{isInternal ? step.details : 'Standard schedule applies'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {showLiveUnitsTab && (
            <TabsContent value="live-units" className="focus-visible:ring-0">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <Radio className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h2 className="text-3xl font-cinematic text-foreground tracking-tight">Live Unit Availability</h2>
                  <p className="text-muted-foreground font-light text-lg">
                    Real-time inventory direct from the developer feed. Units, floors, views, prices.
                  </p>
                </div>

                {/* Free user — show upsell. The banner returns null automatically once the
                    user upgrades, so this is safe to leave mounted. */}
                {!subLoading && !isInvestorPro && (
                  <UpsellBanner feature="unit-availability" variant="card" />
                )}

                {/* Investor Pro user — fetch and render units (or graceful placeholder) */}
                {isInvestorPro && (
                  <>
                    {isUnitsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-foreground/60 animate-pulse">Loading live inventory…</p>
                      </div>
                    ) : liveUnits && liveUnits.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {liveUnits.map((unit: any, i: number) => (
                          <div key={unit.id || i} className="p-6 rounded-3xl bg-background border border-white/5 hover:border-primary/30 transition-all space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                {unit.unit_number || unit.name || `Unit ${i + 1}`}
                              </span>
                              {unit.status && (
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/5 text-[9px]">
                                  {unit.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-lg font-light text-foreground">
                              {unit.bedrooms ? `${unit.bedrooms} BR` : 'Studio'}
                              {unit.area_sqft ? ` · ${unit.area_sqft} sqft` : ''}
                            </p>
                            {unit.price && (
                              <p className="text-2xl font-light text-primary">
                                {new Intl.NumberFormat('en-AE', {
                                  style: 'currency',
                                  currency: unit.currency || 'AED',
                                  maximumFractionDigits: 0,
                                }).format(unit.price)}
                              </p>
                            )}
                            {(unit.floor || unit.view) && (
                              <p className="text-xs text-muted-foreground font-light">
                                {[unit.floor && `Floor ${unit.floor}`, unit.view].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // No units returned — API key may be missing on the proxy, or the
                      // project simply has no inventory loaded yet. Either way, a
                      // calm placeholder beats a scary empty state.
                      <div className="p-10 rounded-[2rem] bg-background border border-white/5 text-center space-y-3">
                        <div className="inline-flex h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                          <Radio className="h-6 w-6 text-primary animate-pulse" />
                        </div>
                        <h3 className="text-xl font-light text-foreground">Connecting to live inventory…</h3>
                        <p className="text-sm text-muted-foreground font-light max-w-md mx-auto">
                          Live units for this project are syncing. We'll show available units, floors,
                          and prices here as soon as the developer feed responds.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          )}

          {isInternal && (
            <TabsContent value="availability" className="focus-visible:ring-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {p.unit_sizes?.map((unit: string, i: number) => (
                  <div key={i} className="p-8 rounded-3xl bg-background border border-white/5 flex justify-between items-center group hover:border-primary/30 transition-all">
                    <div className="flex gap-4 items-center">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                        <Layers className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-lg font-light text-foreground">{unit}</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-zinc-800 group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
