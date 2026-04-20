import { useState, useMemo } from 'react';
import { BackButton } from '@/components/BackButton';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, DollarSign, TrendingUp, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjects, useHoldings } from '@/hooks/useInvestorData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeatureGate } from '@/components/FeatureGate';
import { UpsellBanner } from '@/components/UpsellBanner';

const formatCurrency = (value: number) => {
  return `AED ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)}`;
};

function CompareContent() {
  const { data: projects, isLoading } = useProjects();
  const { data: holdings } = useHoldings();
  const [project1Id, setProject1Id] = useState<string>('');
  const [project2Id, setProject2Id] = useState<string>('');
  const navigate = useNavigate();

  // Fetch DLD areas for real market context
  const { data: dldAreas } = useQuery({
    queryKey: ['compare-dld-areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dld_areas').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const selectedProject1 = projects?.find(p => p.id === project1Id);
  const selectedProject2 = projects?.find(p => p.id === project2Id);

  // Compute real metrics for a project based on holdings and DLD data
  const getProjectMetrics = useMemo(() => (project: typeof projects[0] | undefined) => {
    if (!project) return null;

    // Find holdings for this project to compute real ROI
    const projectHoldings = holdings?.filter(h => h.project?.id === project.id) || [];
    const totalInvested = projectHoldings.reduce((s, h) => s + Number(h.invested_amount), 0);
    const totalCurrent = projectHoldings.reduce((s, h) => s + Number(h.current_value), 0);
    const roi = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested * 100) : 0;

    // Try to match project location to DLD area
    const locLower = (project.location || '').toLowerCase();
    const matchedArea = dldAreas?.find(a => {
      const aName = a.name.toLowerCase();
      return aName === locLower
        || aName.includes(locLower)
        || locLower.includes(aName)
        || locLower.split(' ').some((w: string) => w.length > 2 && aName.includes(w));
    });

    const yieldEst = matchedArea?.rental_yield_avg
      ? `${matchedArea.rental_yield_avg.toFixed(1)}%`
      : 'N/A';

    const demandScore = matchedArea?.demand_score
      ? `${matchedArea.demand_score}/100`
      : 'N/A';

    const avgPps = matchedArea?.avg_price_per_sqft_current
      ? `AED ${matchedArea.avg_price_per_sqft_current.toLocaleString()}/sqft`
      : 'N/A';

    const yoyGrowth = matchedArea
      ? (((matchedArea.avg_price_per_sqft_current - matchedArea.avg_price_per_sqft_12m_ago) / matchedArea.avg_price_per_sqft_12m_ago) * 100)
      : null;

    return {
      roi: totalInvested > 0 ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : 'No holdings',
      yieldEst,
      demandScore,
      avgPps,
      yoyGrowth: yoyGrowth !== null ? `${yoyGrowth >= 0 ? '+' : ''}${yoyGrowth.toFixed(1)}%` : 'N/A',
      holdingsCount: projectHoldings.length,
      totalInvested: totalInvested > 0 ? formatCurrency(totalInvested) : 'N/A',
    };
  }, [holdings, dldAreas]);

  const handleAskAI = () => {
    if (selectedProject1 && selectedProject2) {
      const message = `Compare ${selectedProject1.name} vs ${selectedProject2.name}. Which is a better investment considering ROI, location, developer reputation, and current market conditions?`;
      navigate('/concierge', { state: { initialMessage: message } });
    }
  };

  const ComparisonCard = ({ project }: { project: typeof projects[0] | undefined }) => {
    if (!project) {
      return (
        <div className="glass-card p-6 h-full flex items-center justify-center min-h-[400px]">
          <div className="text-center text-muted-foreground">
            <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a project to compare</p>
          </div>
        </div>
      );
    }

    const metrics = getProjectMetrics(project);

    return (
      <div className="glass-card p-6 h-full">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Building className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">{project.name}</h3>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              {project.location}
            </p>
          </div>
        </div>

        <div className="space-y-4">
      <BackButton />
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground">Developer</span>
            <span className="font-medium text-foreground">{project.developer}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Starting Price
            </span>
            <span className="font-medium text-foreground">
              {formatCurrency(Number(project.starting_price))}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Portfolio ROI
            </span>
            <span className={`font-medium ${metrics?.roi.startsWith('+') ? 'text-emerald-400' : metrics?.roi.startsWith('-') ? 'text-red-400' : 'text-foreground'}`}>
              {metrics?.roi}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground">Rental Yield (Area Avg)</span>
            <span className="font-medium text-foreground">{metrics?.yieldEst}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground">YoY Growth</span>
            <span className={`font-medium ${metrics?.yoyGrowth.startsWith('+') ? 'text-emerald-400' : metrics?.yoyGrowth.startsWith('-') ? 'text-red-400' : 'text-foreground'}`}>
              {metrics?.yoyGrowth}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground">Demand Score</span>
            <span className="font-medium text-foreground">{metrics?.demandScore}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-muted-foreground">Avg Price/sqft (Area)</span>
            <span className="font-medium text-foreground">{metrics?.avgPps}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-muted-foreground">Your Holdings</span>
            <span className="font-medium text-foreground">
              {metrics?.holdingsCount ? `${metrics.holdingsCount} unit${metrics.holdingsCount > 1 ? 's' : ''} (${metrics.totalInvested})` : 'None'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Compare Projects</h1>
          <p className="text-muted-foreground mt-1">Side-by-side project comparison with real market data</p>
        </div>
        <Button
          onClick={handleAskAI}
          disabled={!project1Id || !project2Id}
          className="bg-primary hover:bg-accent-green-dark text-primary-foreground"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Ask AI to Compare
        </Button>
      </div>

      {/* Project Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <label className="text-sm text-muted-foreground mb-2 block">Project 1</label>
          <Select value={project1Id} onValueChange={setProject1Id}>
            <SelectTrigger className="bg-input/50 border-border">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.filter(p => p.id !== project2Id).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card p-4">
          <label className="text-sm text-muted-foreground mb-2 block">Project 2</label>
          <Select value={project2Id} onValueChange={setProject2Id}>
            <SelectTrigger className="bg-input/50 border-border">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.filter(p => p.id !== project1Id).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ComparisonCard project={selectedProject1} />
        <ComparisonCard project={selectedProject2} />
      </div>
    </div>
  );
}

export default function Compare() {
  return (
    <>
      <FeatureGate feature="compare" blur>
        <CompareContent />
      </FeatureGate>
      <UpsellBanner feature="opportunity-signals" className="mt-6" />
    </>
  );
}
