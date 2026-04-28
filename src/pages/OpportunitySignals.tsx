import { useState } from 'react';
import { BackButton } from '@/components/BackButton';
import { useNavigate } from 'react-router-dom';
import { Target, Bookmark, BarChart3, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FeatureGate } from '@/components/FeatureGate';
// Single source of truth for signal classification (also used by the live
// market ticker via src/hooks/useTickerData.ts).
import { classifyArea, SIGNAL_TYPES, type Signal, type SignalType } from '@/lib/signals';

const signalTypes = SIGNAL_TYPES;

function OpportunitySignalsContent() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SignalType>('all');

  // Fetch real DLD area data
  const { data: signals, isLoading } = useQuery({
    queryKey: ['opportunity-signals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dld_areas')
        .select('*')
        .order('demand_score', { ascending: false });
      if (error) throw error;

      // Classify each area into signal types based on real metrics
      const classified = (data || [])
        .map(classifyArea)
        .filter((s): s is Signal => s !== null)
        .sort((a, b) => b.confidence - a.confidence);

      return classified;
    },
  });

  const filteredSignals = filter === 'all'
    ? signals
    : signals?.filter(s => s.type === filter);

  const handleSaveToWatchlist = (areaName: string) => {
    try {
      const STORAGE_KEY = 'realsight-watchlist';
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const alreadySaved = existing.some((item: any) => item.name === areaName && item.type === 'areas');
      if (alreadySaved) {
        toast.info(`${areaName} is already in your watchlist`);
        return;
      }
      existing.push({
        id: `wl-${Date.now()}`,
        type: 'areas',
        name: areaName,
        description: 'Saved from Opportunity Signals',
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      toast.success(`${areaName} saved to watchlist`);
    } catch {
      toast.error('Failed to save to watchlist');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Opportunity Signals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Market signals derived from DLD transaction data, rental yields, and demand indicators
          </p>
        </div>
      </div>

      {/* Filters — pill row matching home page */}
      <div className="flex flex-wrap gap-2">
        {signalTypes.map(type => {
          const count = type.id === 'all' ? (signals?.length || 0) : (signals?.filter(s => s.type === type.id).length || 0);
          const active = filter === type.id;
          return (
            <button key={type.id}
              onClick={() => setFilter(type.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all font-semibold ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-white/[0.08] bg-white/[0.04] text-foreground/60 hover:border-primary/40 hover:text-foreground'
              }`}>
              {type.label}
              <span className={`text-[10px] ${active ? 'opacity-75' : 'text-muted-foreground'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Signal Cards — per DESIGN.md: signal-type color-coded */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredSignals?.map(signal => {
          const typeColor =
            signal.type === 'high-yield'  ? { accent: '#22C55E', bg: 'from-emerald-950/60 to-emerald-900/20', border: 'border-emerald-500/20', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' } :
            signal.type === 'growth'      ? { accent: '#3B82F6', bg: 'from-blue-950/60 to-blue-900/20',    border: 'border-blue-500/20',    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' } :
            signal.type === 'undervalued' ? { accent: '#A855F7', bg: 'from-purple-950/60 to-purple-900/20',border: 'border-purple-500/20',  badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' } :
                                            { accent: '#F59E0B', bg: 'from-amber-950/60 to-amber-900/20',  border: 'border-amber-500/20',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
          return (
            <div key={signal.area}
              className={`relative rounded-2xl overflow-hidden group hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br ${typeColor.bg} border ${typeColor.border}`}>
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${typeColor.badge}`}>
                        {signal.signal}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">{signal.risk}</span>
                    </div>
                    <h3 className="text-base font-black text-white truncate">{signal.area}</h3>
                  </div>
                  {/* Confidence radial */}
                  <div className="shrink-0 ml-3 text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-0.5">Confidence</p>
                    <p className="text-2xl font-black leading-none" style={{ color: typeColor.accent, fontFamily: 'Berkeley Mono, monospace' }}>
                      {signal.confidence}%
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-white/60 mb-4 leading-relaxed">{signal.desc}</p>

                {/* 3 metrics — hero treatment */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Yield', value: signal.yield, color: 'text-emerald-400' },
                    { label: 'Growth', value: signal.growth, color: signal.growth.startsWith('-') ? 'text-red-400' : 'text-emerald-400' },
                    { label: 'AED/sqft', value: signal.pricePerSqft.toLocaleString(), color: 'text-white' },
                  ].map(m => (
                    <div key={m.label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">{m.label}</p>
                      <p className={`text-sm font-black ${m.color}`} style={{ fontFamily: 'Berkeley Mono, monospace' }}>
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/concierge', { state: { initialMessage: `Analyze the ${signal.area} area for investment. It has ${signal.yield} rental yield, ${signal.growth} YoY growth, and a demand score of ${signal.demandScore}/100. What's your assessment?` } })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all bg-white/[0.06] border border-white/[0.08] text-white/80 hover:bg-white/[0.10] hover:text-white">
                    <BarChart3 className="h-3 w-3" /> Analyze
                  </button>
                  <button
                    onClick={() => handleSaveToWatchlist(signal.area)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all bg-white/[0.06] border border-white/[0.08] text-white/80 hover:bg-white/[0.10] hover:text-white">
                    <Bookmark className="h-3 w-3" /> Watchlist
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(!filteredSignals || filteredSignals.length === 0) && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-10 text-center">
          <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No signals found for this filter</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Try a different signal type</p>
        </div>
      )}
    </div>
  );
}

export default function OpportunitySignals() {
  return (
    <FeatureGate feature="opportunity-signals" blur>
      <OpportunitySignalsContent />
    </FeatureGate>
  );
}
