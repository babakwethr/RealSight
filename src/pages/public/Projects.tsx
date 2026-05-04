import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { MapPin, Building, TrendingUp, Calendar, Search, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedFilters } from '@/components/projects/AdvancedFilters';
import { ReellyProject } from '@/types/reelly';
import { ProjectFilters, INITIAL_FILTERS, applyFilters, analyzePaymentPlan } from '@/lib/reelly';
import { DEMO_PROJECTS } from '@/data/demoProjects';

type FetchResult = {
  data: ReellyProject[];
  isDemo: boolean;
  demoReason?: string;
};
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

async function fetchProjects(): Promise<FetchResult> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reelly-proxy?path=clients/projects&limit=50&offset=0`;
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
      } catch (e) {
        // Ignore JSON parse error if it's text
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    const projects = Array.isArray(data) ? data : (data.data || []);
    if (projects.length === 0) {
      throw new Error('Empty response from live feed');
    }
    return { data: projects, isDemo: false };
  } catch (err: any) {
    console.error('Reelly Proxy failed, falling back to demo mode:', err);
    return {
      data: DEMO_PROJECTS,
      isDemo: true,
      demoReason: err.message || 'Live inventory temporarily unavailable.'
    };
  }
}

export default function Projects() {
  const { tenant } = useTenant();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ProjectFilters>(INITIAL_FILTERS);

  const { data: fetchResult, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['new-launches-projects'],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false // Do not retry to fallback immediately
  });

  const projects = fetchResult?.data || [];
  const isDemoMode = fetchResult?.isDemo || false;

  // Extract unique developers for quick chips
  const developers = useMemo(() => {
    const devs = new Set<string>();
    projects.forEach(p => {
      if (p.developer) devs.add(p.developer);
    });
    return Array.from(devs).slice(0, 6); // Max 6 visible
  }, [projects]);

  // Fetch the specific inventory for this tenant
  const { data: allowedIds, isLoading: isInvLoading } = useQuery({
    queryKey: ['portal-inventory', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      // @ts-ignore
      const { data } = await supabase
        .from('tenant_inventory' as any)
        .select('project_id')
        .eq('tenant_id', tenant.id);
      return data?.map((d: any) => d.project_id) || [];
    },
    enabled: !!tenant?.id,
  });

  // Apply all filters (inventory, search, developer, advanced)
  const filteredProjects = useMemo(() => {
    let result = projects;

    // 1. If we are on a tenant subdomain, filter by their specific inventory
    if (tenant && allowedIds) {
      result = result.filter(p => allowedIds.includes(p.id.toString()));
    }

    // 2. Apply standard UI filters
    return applyFilters(result, filters);
  }, [projects, filters, tenant, allowedIds]);

  const isFullyLoaded = !isLoading && (!tenant?.id || !isInvLoading);

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">


      {/* Header */}
      <section className="text-center mb-8 sm:mb-10 px-2">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-3 sm:mb-4 tracking-tight">
          New <span className="text-primary">Launches</span>
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-foreground/60 max-w-2xl mx-auto mb-5 sm:mb-6 leading-relaxed">
          Curated new launch properties from Dubai's most trusted developers — updated daily.
        </p>

        {isDemoMode && (
          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-3 px-6 py-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Demo data ({fetchResult?.demoReason}). Live feed temporarily unavailable.</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-amber-500 hover:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              Retry Live Feed
            </Button>
          </div>
        )}
      </section>

      {/* Filters Top Bar */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
            <Input
              placeholder="Search projects, areas..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="pl-10 bg-white/5 border-glass-border focus-visible:ring-primary"
            />
          </div>

          {/* Advanced Filters Trigger */}
          <AdvancedFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Developer Quick Chips */}
        {developers.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-foreground/50 w-full sm:w-auto mb-1 sm:mb-0">Developers:</span>
            <button
              onClick={() => setFilters(f => ({ ...f, developer: null }))}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs transition-all duration-200 border",
                !filters.developer
                  ? "bg-primary/20 text-primary border-primary"
                  : "bg-transparent text-foreground/70 border-white/10 hover:border-white/20"
              )}
            >
              All
            </button>
            {developers.map(dev => (
              <button
                key={dev}
                onClick={() => setFilters(f => ({ ...f, developer: dev }))}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs transition-all duration-200 border",
                  filters.developer === dev
                    ? "bg-primary/20 text-primary border-primary"
                    : "bg-transparent text-foreground/70 border-white/10 hover:border-white/20"
                )}
              >
                {dev}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading / Error / Empty States */}
      {!isFullyLoaded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="glass-card rounded-2xl h-[420px] animate-pulse bg-white/5" />
          ))}
        </div>
      )}

      {error && isFullyLoaded && (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-2xl border border-red-500/20">
          <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Failed to load projects</h3>
          <p className="text-sm text-foreground/60 mb-6">{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
          <Button onClick={() => refetch()} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
            Try Again
          </Button>
        </div>
      )}

      {isFullyLoaded && !error && filteredProjects.length === 0 && (
        <div className="py-20 text-center glass-panel rounded-2xl border border-glass-border">
          <h3 className="text-lg font-medium text-foreground mb-2">No projects found</h3>
          <p className="text-sm text-foreground/60 mb-6">Adjust your filters to see more results.</p>
          <Button onClick={() => setFilters(INITIAL_FILTERS)} variant="outline">
            Clear Filters
          </Button>
        </div>
      )}

      {/* Projects Grid */}
      {isFullyLoaded && !error && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Upsell: Unit availability is Investor Pro per LAUNCH_PLAN.md §4
          (was previously labelled "Portfolio Pro $29/mo" — legacy from the
          old 5-tier pricing model). */}
      {isFullyLoaded && (
        <div className="mt-10 rounded-2xl bg-gradient-to-r from-[#18d6a4]/12 via-[#18d6a4]/5 to-transparent border border-[#18d6a4]/30 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#18d6a4]/15 border border-[#18d6a4]/30 flex items-center justify-center shrink-0">
            <svg className="h-5 w-5 text-[#2effc0]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-foreground">See available units, floor plans and exact pricing</p>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#18d6a4]/20 text-[#2effc0] border border-[#18d6a4]/40 uppercase tracking-wider">
                50% OFF
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unit-level inventory, floor numbers, sizes, and live availability are unlocked with <strong className="text-foreground">Investor Pro</strong> —{' '}
              <span className="text-muted-foreground/55 line-through mr-1">$999/mo</span>
              <span className="text-[#2effc0] font-semibold">$499/mo launch · 30-day free trial</span>.
            </p>
          </div>
          <a href="/billing"
            className="shrink-0 px-5 py-2.5 bg-[#18d6a4] text-black text-sm font-black rounded-xl hover:bg-[#2effc0] transition-colors whitespace-nowrap">
            Unlock Units — $499/mo
          </a>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Extracted Card Component
// ----------------------------------------------------
function ProjectCard({ project }: { project: ReellyProject }) {
  const imageUrl = project.cover_image?.url;

  // Format price
  const priceDisplay = project.min_price
    ? new Intl.NumberFormat('en-AE', { style: 'currency', currency: project.currency || 'AED', maximumFractionDigits: 0 }).format(project.min_price)
    : 'Price on Request';

  // Format statuses
  const isReady = project.construction_status === 'Ready' || project.completion_date === 'Ready';

  return (
    <div className="relative rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col backdrop-blur-md bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Image Header */}
      <div className="relative h-52 bg-white/[0.03] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={project.name}
            // crossOrigin silences Chrome's Opaque Response Blocking on the
            // Unsplash CDN. Without it, Chrome refuses to render even valid
            // 200-OK responses on cross-origin <img> tags from images.unsplash.com.
            // onError swaps to the Building icon if the URL is dead — keeps
            // the card from showing a broken-image glyph.
            crossOrigin="anonymous"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.style.display = 'none';
              const sibling = t.nextElementSibling as HTMLElement | null;
              if (sibling) sibling.style.display = 'flex';
            }}
          />
        ) : null}
        {/* Fallback container — shown when no imageUrl OR revealed by the
            <img> onError handler above (sets sibling display to flex). */}
        <div
          className="w-full h-full items-center justify-center bg-gradient-to-br from-primary/10 to-transparent"
          style={{ display: imageUrl ? 'none' : 'flex' }}
        >
          <Building className="h-12 w-12 text-primary/20" />
        </div>
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {project.construction_status && (
            <span className={cn(
              "text-[9px] px-2 py-0.5 rounded-full backdrop-blur-sm font-black uppercase tracking-wider",
              isReady
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-black/50 text-white/80 border border-white/15"
            )}>
              {project.construction_status}
            </span>
          )}
          {project.sale_status === 'Sold Out' && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/80 text-white border border-red-400/30 font-black uppercase tracking-wider">
              Sold Out
            </span>
          )}
        </div>

        {/* Price overlay at bottom of image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span className="text-base font-black text-white" style={{ fontFamily: 'Berkeley Mono, monospace', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {priceDisplay}
          </span>
          {project.completion_date && (
            <span className="text-[10px] text-white/60 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {project.completion_date}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[10px] text-primary/80 font-black uppercase tracking-wider mb-1">
          {project.developer || 'Unknown Developer'}
        </p>
        <h3 className="text-sm font-bold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        <p className="text-xs text-foreground/50 flex items-center gap-1 mb-4 truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{project.location?.district || project.location?.city || 'Dubai'}</span>
        </p>

        {/* Payment plan badge */}
        <div className="flex items-center gap-2 mb-4 mt-auto">
          <span className="text-[10px] text-foreground/50 uppercase tracking-wider">Payment Plan</span>
          <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            {analyzePaymentPlan(project)}
          </span>
        </div>

        {/* Action */}
        <Link to={`/projects/${project.id}`}
          className="w-full flex items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all bg-white/[0.06] border border-white/[0.10] text-foreground/80 hover:bg-primary/10 hover:border-primary/30 hover:text-primary">
          View Full Details
        </Link>
      </div>
    </div>
  );
}
