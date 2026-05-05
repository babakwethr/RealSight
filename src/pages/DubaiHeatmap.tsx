import { useState } from 'react';
import { BackButton } from '@/components/BackButton';
import { Map, TrendingUp, Droplets, BarChart3, Activity, DollarSign, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FeatureGate } from '@/components/FeatureGate';
import { UpsellBanner } from '@/components/UpsellBanner';

type HeatMode = 'growth' | 'liquidity' | 'yield' | 'demand' | 'price';

const heatModes: { id: HeatMode; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'growth', label: 'Growth', icon: TrendingUp, desc: 'YoY price growth by area' },
  { id: 'liquidity', label: 'Liquidity', icon: Droplets, desc: 'Transaction volume & speed' },
  { id: 'yield', label: 'Rental Yield', icon: DollarSign, desc: 'Average rental yield' },
  { id: 'demand', label: 'Demand', icon: Activity, desc: 'Buyer demand score' },
  { id: 'price', label: 'Price Trend', icon: BarChart3, desc: 'Avg price per sqft trend' },
];

// Dubai areas with real lat/lng coordinates
const dubaiAreas: { name: string; lat: number; lng: number; size: 'lg' | 'md' | 'sm' }[] = [
  { name: 'Dubai Marina', lat: 25.0805, lng: 55.1403, size: 'lg' },
  { name: 'Downtown Dubai', lat: 25.1972, lng: 55.2744, size: 'lg' },
  { name: 'Business Bay', lat: 25.1860, lng: 55.2708, size: 'md' },
  { name: 'JVC', lat: 25.0657, lng: 55.2094, size: 'md' },
  { name: 'Dubai Hills', lat: 25.1335, lng: 55.2426, size: 'lg' },
  { name: 'Palm Jumeirah', lat: 25.1124, lng: 55.1390, size: 'lg' },
  { name: 'JLT', lat: 25.0762, lng: 55.1541, size: 'md' },
  { name: 'DIFC', lat: 25.2100, lng: 55.2796, size: 'sm' },
  { name: 'Dubai Creek', lat: 25.2470, lng: 55.3310, size: 'md' },
  { name: 'Jumeirah', lat: 25.2108, lng: 55.2540, size: 'md' },
  { name: 'Al Barsha', lat: 25.1135, lng: 55.1993, size: 'sm' },
  { name: 'Motor City', lat: 25.0470, lng: 55.2360, size: 'sm' },
  { name: 'Sports City', lat: 25.0396, lng: 55.2196, size: 'sm' },
  { name: 'MBR City', lat: 25.1540, lng: 55.3100, size: 'md' },
  { name: 'Damac Hills', lat: 25.0279, lng: 55.2470, size: 'md' },
  { name: 'Arabian Ranches', lat: 25.0575, lng: 55.2725, size: 'sm' },
  { name: 'Silicon Oasis', lat: 25.1175, lng: 55.3780, size: 'sm' },
  { name: 'Dubailand', lat: 25.0840, lng: 55.3260, size: 'md' },
  { name: 'Deira', lat: 25.2720, lng: 55.3320, size: 'md' },
  { name: 'Bur Dubai', lat: 25.2530, lng: 55.2960, size: 'sm' },
];

// Heatmap color spectrum — true gradient from cool (low) to hot (high)
function getHeatRGBA(value: number, mode: HeatMode): { color: string; fillColor: string; fillOpacity: number; glow: string } {
  const t = Math.min(1, Math.max(0, value / 100));

  // Color stops by metric type
  const palettes: Record<HeatMode, [number, number, number][]> = {
    growth:    [[71,85,105], [59,130,246], [34,197,94], [16,185,129]],   // slate → blue → green
    yield:     [[71,85,105], [251,191,36], [34,197,94], [16,185,129]],    // slate → amber → green
    demand:    [[71,85,105], [251,191,36], [249,115,22], [239,68,68]],    // slate → amber → orange → red
    liquidity: [[71,85,105], [59,130,246], [139,92,246], [168,85,247]],   // slate → blue → purple
    price:     [[71,85,105], [251,191,36], [249,115,22], [239,68,68]],    // slate → amber → orange → red
  };

  const stops = palettes[mode];
  // Pick stop pair based on t
  const stopIndex = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
  const local = (t * (stops.length - 1)) - stopIndex;
  const [r1, g1, b1] = stops[stopIndex];
  const [r2, g2, b2] = stops[stopIndex + 1];
  const r = Math.round(r1 + (r2 - r1) * local);
  const g = Math.round(g1 + (g2 - g1) * local);
  const b = Math.round(b1 + (b2 - b1) * local);

  const opacity = 0.45 + t * 0.45;
  return {
    color: `rgba(${r}, ${g}, ${b}, 1)`,
    fillColor: `rgb(${r}, ${g}, ${b})`,
    fillOpacity: opacity,
    glow: `rgba(${r}, ${g}, ${b}, ${0.3 + t * 0.4})`,
  };
}

function DubaiHeatmapContent() {
  const [activeMode, setActiveMode] = useState<HeatMode>('growth');

  // Try to fetch dld_areas data, fall back gracefully
  const { data: areaData } = useQuery({
    queryKey: ['heatmap-areas'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('dld_areas')
          .select('*')
          .order('name');
        if (error) throw error;
        return data;
      } catch {
        return null;
      }
    },
  });

  const findArea = (areaName: string) => {
    if (!areaData) return null;
    const name = areaName.toLowerCase();
    // Try exact match first, then partial matches
    return areaData.find(a => a.name.toLowerCase() === name)
      || areaData.find(a => a.name.toLowerCase().includes(name) || name.includes(a.name.toLowerCase()))
      || areaData.find(a => {
        const words = name.split(' ');
        return words.some(w => w.length > 2 && a.name.toLowerCase().includes(w));
      });
  };

  const getAreaValue = (areaName: string, mode: HeatMode): number => {
    if (!areaData) return 50;
    const area = findArea(areaName);
    if (!area) return 50;
    switch (mode) {
      case 'growth': {
        const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / area.avg_price_per_sqft_12m_ago) * 100;
        return Math.min(100, Math.max(0, yoy * 3 + 30));
      }
      case 'yield': return Math.min(100, area.rental_yield_avg * 10);
      case 'demand': return Math.min(100, area.demand_score);
      case 'liquidity': return Math.min(100, Math.min(area.transaction_volume_30d / 5, 100));
      case 'price': return Math.min(100, area.avg_price_per_sqft_current / 30);
      default: return 50;
    }
  };

  const getAreaTooltip = (areaName: string, mode: HeatMode): string => {
    if (!areaData) return areaName;
    const area = findArea(areaName);
    if (!area) return areaName;
    const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / area.avg_price_per_sqft_12m_ago) * 100;
    switch (mode) {
      case 'growth':
        return `${areaName}\nYoY Growth: ${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%\nPrice: AED ${area.avg_price_per_sqft_current}/sqft`;
      case 'yield':
        return `${areaName}\nRental Yield: ${area.rental_yield_avg}%\nPrice: AED ${area.avg_price_per_sqft_current}/sqft`;
      case 'liquidity':
        return `${areaName}\nTransactions (30d): ${area.transaction_volume_30d}\nAvg Days on Market: ${area.avg_days_on_market ?? 'N/A'}`;
      case 'demand':
        return `${areaName}\nDemand Score: ${area.demand_score}/100\nTransactions (30d): ${area.transaction_volume_30d}`;
      case 'price':
        return `${areaName}\nAvg Price: AED ${area.avg_price_per_sqft_current}/sqft\nYoY Change: ${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%`;
      default:
        return areaName;
    }
  };

  const getRadius = (size: 'lg' | 'md' | 'sm') => {
    if (size === 'lg') return 16;
    if (size === 'md') return 12;
    return 8;
  };

  // Compute ranked areas for the active mode
  const rankedAreas = dubaiAreas
    .map(a => ({ ...a, value: getAreaValue(a.name, activeMode) }))
    .sort((a, b) => b.value - a.value);

  const topValue = rankedAreas[0]?.value ?? 0;
  const avgValue = rankedAreas.reduce((s, a) => s + a.value, 0) / rankedAreas.length;

  // Format display value per mode
  const formatModeValue = (areaName: string): string => {
    const area = findArea(areaName);
    if (!area) return '—';
    switch (activeMode) {
      case 'growth': {
        const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / area.avg_price_per_sqft_12m_ago) * 100;
        return `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%`;
      }
      case 'yield': return `${area.rental_yield_avg?.toFixed(1)}%`;
      case 'demand': return `${area.demand_score}/100`;
      case 'liquidity': return `${area.transaction_volume_30d}`;
      case 'price': return `AED ${Math.round(area.avg_price_per_sqft_current).toLocaleString()}`;
      default: return '—';
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <BackButton />
      {/* Slim mobile hero — icon stays inline only on sm+ so the H1 lands cleanly
          at thumb-scale. Same content, just less chrome on phones. */}
      <div>
        <h1 className="text-[26px] sm:text-2xl font-black text-foreground tracking-tight leading-[1.1] flex items-center gap-2">
          <Map className="hidden sm:inline h-6 w-6 text-primary" />
          Dubai <span className="gradient-word">Heatmap</span>
        </h1>
        <p className="text-[12.5px] sm:text-sm text-muted-foreground mt-1.5 sm:mt-1 leading-snug">
          Interactive market visualisation · 5 data layers · Real DLD data
        </p>
      </div>

      {/* Heat Mode Selector — tighter on mobile, breathy on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {heatModes.map(mode => {
          const Icon = mode.icon;
          const active = activeMode === mode.id;
          return (
            <button key={mode.id} onClick={() => setActiveMode(mode.id)}
              className={`relative rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-left transition-all backdrop-blur-md border ${
                active
                  ? 'bg-primary/[0.10] border-primary/30 shadow-[inset_0_1px_0_rgba(34,197,94,0.15)]'
                  : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.14]'
              }`}>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${active ? 'text-primary' : 'text-foreground/50'}`} />
                <span className={`text-[12.5px] sm:text-sm font-bold truncate ${active ? 'text-primary' : 'text-foreground'}`}>{mode.label}</span>
              </div>
              <p className="text-[9.5px] sm:text-[10px] text-foreground/40 leading-tight line-clamp-2">{mode.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Top stats strip — top 3 areas for active mode. Tighter on mobile so 3-up still reads. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {rankedAreas.slice(0, 3).map((area, i) => {
          const style = getHeatRGBA(area.value, activeMode);
          const podium = ['🥇', '🥈', '🥉'][i];
          return (
            <div key={area.name}
              className="relative rounded-2xl overflow-hidden backdrop-blur-md bg-white/[0.04] border border-white/[0.08] p-3 sm:p-4 hover:border-white/[0.15] transition-all"
              style={{ borderColor: i === 0 ? style.color.replace('1)', '0.4)') : undefined }}>
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm sm:text-base shrink-0">{podium}</span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">#{i + 1}<span className="hidden sm:inline"> {heatModes.find(m => m.id === activeMode)?.label}</span></span>
                </div>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: style.fillColor, boxShadow: `0 0 8px ${style.glow}` }} />
              </div>
              <p className="text-[12.5px] sm:text-sm font-bold text-foreground truncate mb-1">{area.name}</p>
              <p className="text-base sm:text-xl font-black truncate" style={{ color: style.fillColor, fontFamily: 'Berkeley Mono, monospace', letterSpacing: '-0.02em' }}>
                {formatModeValue(area.name)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Map + Ranked Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Map */}
        <div className="rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              {heatModes.find(m => m.id === activeMode)?.desc} · Hover for details
            </p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Avg: <span className="text-foreground font-bold">{Math.round(avgValue)}</span></span>
              <span>Top: <span className="text-foreground font-bold">{Math.round(topValue)}</span></span>
            </div>
          </div>
          <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-white/[0.06]">
            <MapContainer center={[25.15, 55.27]} zoom={11} scrollWheelZoom={true}
              zoomControl={true} attributionControl={false}
              style={{ height: '100%', width: '100%', background: '#0B1120' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" opacity={0.6} />
              {dubaiAreas.map(area => {
                const value = getAreaValue(area.name, activeMode);
                const style = getHeatRGBA(value, activeMode);
                const tooltipText = getAreaTooltip(area.name, activeMode);
                const baseRadius = getRadius(area.size);
                // Top 3 get a pulsing glow ring
                const isTop3 = rankedAreas.slice(0, 3).some(a => a.name === area.name);
                const radius = isTop3 ? baseRadius + 4 : baseRadius;

                return (
                  <CircleMarker key={area.name} center={[area.lat, area.lng]} radius={radius}
                    pathOptions={{
                      color: style.color, fillColor: style.fillColor,
                      fillOpacity: style.fillOpacity, weight: isTop3 ? 3 : 2,
                    }}>
                    <Tooltip direction="top" offset={[0, -10]} className="heatmap-tooltip">
                      <div className="text-left">
                        {tooltipText.split('\n').map((line, i) => (
                          <div key={i} className={i === 0 ? 'font-semibold' : 'text-xs opacity-80'}>{line}</div>
                        ))}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Gradient Legend */}
          <div className="mt-4 px-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Low</span>
              <span className="font-bold uppercase tracking-wider">{heatModes.find(m => m.id === activeMode)?.label} scale</span>
              <span>High</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{
              background: (() => {
                const stops = [0, 25, 50, 75, 100].map(v => {
                  const s = getHeatRGBA(v, activeMode);
                  return `${s.fillColor} ${v}%`;
                }).join(', ');
                return `linear-gradient(90deg, ${stops})`;
              })(),
            }} />
          </div>
        </div>

        {/* Ranked Sidebar */}
        <div className="rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/[0.08] p-4 max-h-[600px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground/80">All Areas Ranked</h3>
            <span className="text-[9px] text-muted-foreground">{rankedAreas.length} areas</span>
          </div>
          <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
            {rankedAreas.map((area, i) => {
              const style = getHeatRGBA(area.value, activeMode);
              return (
                <div key={area.name}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.10] transition-all cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-black text-muted-foreground/60 w-5">#{i + 1}</span>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: style.fillColor, boxShadow: `0 0 6px ${style.glow}` }} />
                    <p className="text-xs font-semibold text-foreground truncate">{area.name}</p>
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: style.fillColor, fontFamily: 'Berkeley Mono, monospace' }}>
                    {formatModeValue(area.name)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DubaiHeatmap() {
  return (
    <>
      <FeatureGate feature="heatmap" blur>
        <DubaiHeatmapContent />
      </FeatureGate>
      <UpsellBanner feature="opportunity-signals" className="mt-6" />
    </>
  );
}
