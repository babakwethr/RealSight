import { Radar as RadarIcon, Info } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FeatureGate } from '@/components/FeatureGate';
import { UpsellBanner } from '@/components/UpsellBanner';

const markets = [
  { name: 'Dubai',     country: 'UAE',       flag: '🇦🇪', lat: 25.2,  lng: 55.27,   status: 'Active', areas: '150+', yoy: '+12.3%', desc: 'Highest transaction volume · freehold for foreigners', accent: '#22C55E' },
  { name: 'Madrid',    country: 'Spain',     flag: '🇪🇸', lat: 40.42, lng: -3.7,    status: 'Active', areas: '80+',  yoy: '+8.1%',  desc: 'Costa del Sol & Barcelona · EU residency options',     accent: '#EF4444' },
  { name: 'New York',  country: 'USA',       flag: '🇺🇸', lat: 40.71, lng: -74.01,  status: 'Active', areas: '100+', yoy: '+5.4%',  desc: 'Metro areas · high-end condo market',                  accent: '#3B82F6' },
  { name: 'London',    country: 'UK',        flag: '🇬🇧', lat: 51.51, lng: -0.13,   status: 'Active', areas: '90+',  yoy: '+3.2%',  desc: 'Prime & outer boroughs · stable long-term market',    accent: '#A855F7' },
  { name: 'Singapore', country: 'Singapore', flag: '🇸🇬', lat: 1.35,  lng: 103.82,  status: 'Active', areas: '50+',  yoy: '+7.8%',  desc: 'Premium districts · tight supply, strong demand',      accent: '#F59E0B' },
];

function GlobalRadarContent() {
  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton />
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
          <RadarIcon className="h-6 w-6 text-primary" />
          Global <span className="gradient-word">Investment Radar</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track real estate markets across 5 global hubs · Cross-market capital flow signals
        </p>
      </div>

      {/* World Map */}
      <div className="rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/[0.08] p-5">
        <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden border border-white/[0.06]">
          <MapContainer center={[25, 40]} zoom={2} minZoom={2} maxZoom={6}
            scrollWheelZoom={true} zoomControl={true} attributionControl={false}
            style={{ height: '100%', width: '100%', background: '#0B1120' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" opacity={0.65} />
            {markets.map(market => (
              <CircleMarker key={market.name} center={[market.lat, market.lng]} radius={12}
                pathOptions={{ color: market.accent, fillColor: market.accent, fillOpacity: 0.7, weight: 2 }}>
                <Tooltip direction="top" offset={[0, -12]} className="heatmap-tooltip">
                  <div className="text-left">
                    <div className="font-semibold">{market.flag} {market.name}</div>
                    <div className="text-xs opacity-80">{market.country} · {market.yoy} YoY</div>
                    <div className="text-xs opacity-80">{market.areas} areas tracked</div>
                    <div className="text-xs opacity-60">{market.desc}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Hover markers for market details
          </div>
          {markets.map(m => (
            <div key={m.name} className="flex items-center gap-1.5 text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.accent, boxShadow: `0 0 8px ${m.accent}60` }} />
              {m.name}
            </div>
          ))}
        </div>
      </div>

      {/* Market Cards — gradient + hero YoY number */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {markets.map(market => (
          <div key={market.name}
            className="relative rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-200 backdrop-blur-md bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] p-5 cursor-pointer">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{market.flag}</span>
                <div>
                  <h3 className="font-black text-white text-sm">{market.name}</h3>
                  <p className="text-[10px] text-white/40">{market.country}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </div>
            </div>

            {/* Hero metric */}
            <div className="mb-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">YoY Growth</p>
              <p className="text-2xl font-black leading-none" style={{ color: market.accent, fontFamily: 'Berkeley Mono, monospace', letterSpacing: '-0.03em' }}>
                {market.yoy}
              </p>
            </div>

            {/* Secondary */}
            <div className="pt-3 border-t border-white/[0.06] space-y-1">
              <p className="text-[10px] text-white/60">
                <span className="font-bold text-white">{market.areas}</span> areas tracked
              </p>
              <p className="text-[10px] text-white/40 leading-relaxed line-clamp-2">{market.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GlobalRadar() {
  return (
    <>
      <FeatureGate feature="global-radar" blur>
        <GlobalRadarContent />
      </FeatureGate>
      <UpsellBanner feature="ai-investor-presentation" className="mt-6" />
    </>
  );
}
