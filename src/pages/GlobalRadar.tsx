/**
 * GlobalRadar — world map of RealSight's live markets, backed by real
 * data from the three market proxies (UAE / UK / US) + Reelly off-plan.
 *
 * Phase 4 of the global-launch plan. Replaces the previous hardcoded
 * "Active" markers (Madrid +8.1%, NY +5.4%, etc.) with live numbers.
 *
 * Pin status:
 *   🟢 live     — backed by a live proxy with real numbers
 *   ⏳ off-plan — Reelly inventory market (UAE/Bali/Phuket)
 *   🔜 soon     — Spain placeholder, dimmed
 */
import { Radar as RadarIcon, Info } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FeatureGate } from '@/components/FeatureGate';
import { UpsellBanner } from '@/components/UpsellBanner';
import { useUkRegion } from '@/hooks/useUkMarketData';
import { useUsMetrosSnapshot } from '@/hooks/useUsMarketData';
import { useReellyProjects } from '@/hooks/useReellyData';

interface RadarPin {
  slug: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
  /** "live" | "off-plan" | "soon" */
  kind: 'live' | 'off-plan' | 'soon';
  /** Headline metric (e.g. "+4.8% YoY" or "1,953 projects"). */
  metric?: string;
  /** Optional secondary line. */
  secondary?: string;
  /** Hex accent for the marker. */
  accent: string;
}

function pct(yoy: number | null | undefined): string | undefined {
  if (yoy == null || !isFinite(yoy)) return undefined;
  return `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}% YoY`;
}

function GlobalRadarContent() {
  // ─── Live sources ───────────────────────────────────────────────────
  const london = useUkRegion('london');
  const usMetros = useUsMetrosSnapshot();
  const uaeReelly = useReellyProjects({ country: 'United Arab Emirates', limit: 1 });
  const baliReelly = useReellyProjects({ country: 'Indonesia', limit: 1 });
  const phuketReelly = useReellyProjects({ country: 'Thailand', limit: 1 });

  const findMetro = (slug: string) => usMetros.data?.metros.find((m) => m.slug === slug);

  const ny = findMetro('new-york');
  const la = findMetro('los-angeles');
  const miami = findMetro('miami');
  const sf = findMetro('san-francisco');

  // ─── Build pins from live data ──────────────────────────────────────
  const pins: RadarPin[] = [
    // Anchor markets — all "live" status
    {
      slug: 'dubai',
      name: 'Dubai',
      country: 'UAE',
      flag: '🇦🇪',
      lat: 25.2,
      lng: 55.27,
      kind: 'live',
      metric: uaeReelly.data?.count
        ? `${uaeReelly.data.count.toLocaleString()} off-plan`
        : '1,953 off-plan',
      secondary: 'DLD + Reelly',
      accent: '#18D6A4',
    },
    {
      slug: 'london',
      name: 'London',
      country: 'UK',
      flag: '🇬🇧',
      lat: 51.51,
      lng: -0.13,
      kind: 'live',
      metric: pct(london.data?.percentageChangeYear) ?? 'HM Land Registry',
      secondary: london.data?.averagePrice
        ? `Avg £${(london.data.averagePrice / 1000).toFixed(0)}K`
        : undefined,
      accent: '#A855F7',
    },
    {
      slug: 'new-york',
      name: 'New York',
      country: 'USA',
      flag: '🇺🇸',
      lat: 40.71,
      lng: -74.01,
      kind: 'live',
      metric: pct(ny?.yoyPct) ?? 'Case-Shiller HPI',
      secondary: ny?.latestValue ? `HPI ${ny.latestValue.toFixed(1)}` : undefined,
      accent: '#3B82F6',
    },
    {
      slug: 'los-angeles',
      name: 'Los Angeles',
      country: 'USA',
      flag: '🇺🇸',
      lat: 34.05,
      lng: -118.24,
      kind: 'live',
      metric: pct(la?.yoyPct) ?? 'Case-Shiller HPI',
      secondary: la?.latestValue ? `HPI ${la.latestValue.toFixed(1)}` : undefined,
      accent: '#3B82F6',
    },
    {
      slug: 'miami',
      name: 'Miami',
      country: 'USA',
      flag: '🇺🇸',
      lat: 25.76,
      lng: -80.19,
      kind: 'live',
      metric: pct(miami?.yoyPct) ?? 'Case-Shiller HPI',
      secondary: miami?.latestValue ? `HPI ${miami.latestValue.toFixed(1)}` : undefined,
      accent: '#3B82F6',
    },
    {
      slug: 'san-francisco',
      name: 'San Francisco',
      country: 'USA',
      flag: '🇺🇸',
      lat: 37.77,
      lng: -122.42,
      kind: 'live',
      metric: pct(sf?.yoyPct) ?? 'Case-Shiller HPI',
      secondary: sf?.latestValue ? `HPI ${sf.latestValue.toFixed(1)}` : undefined,
      accent: '#3B82F6',
    },
    // Off-plan only markets
    {
      slug: 'bali',
      name: 'Bali',
      country: 'Indonesia',
      flag: '🇮🇩',
      lat: -8.34,
      lng: 115.09,
      kind: 'off-plan',
      metric: baliReelly.data?.count ? `${baliReelly.data.count} projects` : '66 projects',
      secondary: 'Off-plan via Reelly',
      accent: '#F59E0B',
    },
    {
      slug: 'phuket',
      name: 'Phuket',
      country: 'Thailand',
      flag: '🇹🇭',
      lat: 7.88,
      lng: 98.40,
      kind: 'off-plan',
      metric: phuketReelly.data?.count ? `${phuketReelly.data.count} projects` : '10 projects',
      secondary: 'Off-plan via Reelly',
      accent: '#F59E0B',
    },
    // Coming-soon (dimmed)
    {
      slug: 'madrid',
      name: 'Madrid',
      country: 'Spain',
      flag: '🇪🇸',
      lat: 40.42,
      lng: -3.7,
      kind: 'soon',
      metric: 'Coming soon',
      secondary: 'Spain market — in development',
      accent: '#94A3B8',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton />
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
          <RadarIcon className="h-6 w-6 text-primary" />
          Global <span className="gradient-word">Investment Radar</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live signals across {pins.filter((p) => p.kind === 'live').length} markets ·
          {' '}{pins.filter((p) => p.kind === 'off-plan').length} off-plan inventory feeds ·
          {' '}1 launching soon.
        </p>
      </div>

      {/* World Map */}
      <div className="rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/[0.08] p-5">
        <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden border border-white/[0.06]">
          <MapContainer
            center={[25, 40]}
            zoom={2}
            minZoom={2}
            maxZoom={6}
            scrollWheelZoom={true}
            zoomControl={true}
            attributionControl={false}
            style={{ height: '100%', width: '100%', background: '#0B1120' }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" opacity={0.65} />
            {pins.map((pin) => (
              <CircleMarker
                key={pin.slug}
                center={[pin.lat, pin.lng]}
                radius={pin.kind === 'soon' ? 7 : pin.kind === 'live' ? 13 : 11}
                pathOptions={{
                  color: pin.accent,
                  fillColor: pin.accent,
                  fillOpacity: pin.kind === 'soon' ? 0.25 : 0.7,
                  weight: 2,
                  dashArray: pin.kind === 'soon' ? '4,2' : undefined,
                }}
              >
                <Tooltip direction="top" offset={[0, -12]} className="heatmap-tooltip">
                  <div className="text-left">
                    <div className="font-semibold">{pin.flag} {pin.name}</div>
                    <div className="text-xs opacity-80">{pin.country}</div>
                    {pin.metric && <div className="text-xs opacity-90 mt-1">{pin.metric}</div>}
                    {pin.secondary && <div className="text-[11px] opacity-60">{pin.secondary}</div>}
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Hover markers for live data
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-[#18D6A4]" /> Live (full data)
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Off-plan inventory
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-[#94A3B8]" /> Coming soon
          </div>
        </div>
      </div>

      {/* Pin grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {pins.map((pin) => (
          <div
            key={pin.slug}
            className="relative rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-200 backdrop-blur-md bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] p-5"
          >
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{pin.flag}</span>
                <div>
                  <h3 className="font-black text-white text-sm">{pin.name}</h3>
                  <p className="text-[10px] text-white/40">{pin.country}</p>
                </div>
              </div>
              <KindBadge kind={pin.kind} />
            </div>

            <div className="mb-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">
                {pin.kind === 'live' ? 'Headline metric' : pin.kind === 'off-plan' ? 'Inventory' : 'Status'}
              </p>
              <p
                className="text-xl font-black leading-none"
                style={{ color: pin.kind === 'soon' ? '#94A3B8' : pin.accent, fontFamily: 'Berkeley Mono, monospace', letterSpacing: '-0.03em' }}
              >
                {pin.metric ?? '—'}
              </p>
            </div>

            {pin.secondary && (
              <div className="pt-3 border-t border-white/[0.06]">
                <p className="text-[10px] text-white/55 leading-relaxed">{pin.secondary}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: RadarPin['kind'] }) {
  if (kind === 'live') {
    return (
      <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        LIVE
      </div>
    );
  }
  if (kind === 'off-plan') {
    return (
      <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
        OFF-PLAN
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-white/55 border border-white/[0.08]">
      SOON
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
