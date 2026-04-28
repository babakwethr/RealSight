/**
 * TickerTiles — small presentational components rendered inside the
 * scrolling marquee. Each tile is single-line, ~36px tall, mono-spaced
 * numbers. Color rules:
 *   • ↑ / positive delta → mint (#2effc0)
 *   • ↓ / negative delta → coral (#ff6b8a)
 *   • neutral / labels   → white at 80–90% opacity
 *
 * Tiles are *visual only* — no click handlers, no nav (founder decision
 * for v1). If we wire drill-through later, just wrap in <Link>.
 */
import { ArrowUp, ArrowDown, Target, Building2, BarChart3, Sparkles } from 'lucide-react';
import type { TickerDeal, TickerArea, TickerIndex } from '@/hooks/useTickerData';
import type { Signal } from '@/lib/signals';

const MINT = '#2effc0';
const CORAL = '#ff6b8a';

function fmtAed(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n}`;
}

function fmtTimeAgo(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ── Shared layout primitives ─────────────────────────────────────────────

const TileWrap = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 px-3 py-1 whitespace-nowrap text-[12px] leading-none">
    {children}
  </div>
);

const Sep = () => (
  <span aria-hidden="true" className="text-white/20 select-none">·</span>
);

// ── Deal tile — "Just sold · Marina · Apartment · AED 3.2M · 2h ago" ────

export function DealTile({ deal }: { deal: TickerDeal }) {
  const propertyLabel =
    deal.propertyType.charAt(0).toUpperCase() + deal.propertyType.slice(1).toLowerCase();
  return (
    <TileWrap>
      <Building2 className="h-3 w-3 text-white/45 shrink-0" />
      <span className="font-bold text-white/55 uppercase tracking-[0.12em] text-[10px]">Sold</span>
      <Sep />
      <span className="font-semibold text-white/90">{deal.area}</span>
      <Sep />
      <span className="text-white/65">{propertyLabel}</span>
      <Sep />
      <span className="font-bold tabular-nums" style={{ color: MINT }}>{fmtAed(deal.price)}</span>
      <span className="text-white/40 tabular-nums text-[11px]">{fmtTimeAgo(deal.date)}</span>
    </TileWrap>
  );
}

// ── Area tile — "JVC · 1,840/sqft · ↑2.3% YoY" ──────────────────────────

export function AreaTile({ area }: { area: TickerArea }) {
  const positive = area.yoyDelta > 0;
  const flat = Math.abs(area.yoyDelta) < 0.05;
  const color = flat ? '#cccccc' : positive ? MINT : CORAL;
  const Icon = flat ? null : positive ? ArrowUp : ArrowDown;
  const sign = positive ? '+' : '';
  return (
    <TileWrap>
      <span className="font-bold text-white/95">{area.name}</span>
      <Sep />
      <span className="text-white/65 tabular-nums">{area.pricePerSqft.toLocaleString()}/sqft</span>
      <Sep />
      <span className="flex items-center gap-0.5 font-bold tabular-nums" style={{ color }}>
        {Icon && <Icon className="h-3 w-3" />}
        {sign}{area.yoyDelta.toFixed(1)}%
      </span>
      <span className="text-white/35 text-[10px] uppercase tracking-wider">YoY</span>
    </TileWrap>
  );
}

// ── Signal tile — "Undervalued · Damac Lagoons · 78%" ────────────────────

const SIGNAL_ICON: Record<string, React.ReactNode> = {
  'high-yield':  <Sparkles className="h-3 w-3 text-amber-300" />,
  'growth':      <ArrowUp className="h-3 w-3 text-[#2effc0]" />,
  'undervalued': <Target className="h-3 w-3 text-purple-300" />,
  'low-risk':    <Sparkles className="h-3 w-3 text-blue-300" />,
};

export function SignalTile({ signal }: { signal: Signal }) {
  return (
    <TileWrap>
      {SIGNAL_ICON[signal.type] ?? <Target className="h-3 w-3 text-white/55" />}
      <span className="font-bold text-white/95">{signal.signal}</span>
      <Sep />
      <span className="text-white/75">{signal.area}</span>
      <Sep />
      <span className="font-bold tabular-nums" style={{ color: MINT }}>{signal.confidence}%</span>
      <span className="text-white/35 text-[10px] uppercase tracking-wider">conf.</span>
    </TileWrap>
  );
}

// ── Index tile — "DXB INDEX · 1,240 AED/sqft · +0.8% MoM" ────────────────

export function IndexTile({ index }: { index: TickerIndex }) {
  const positive = index.momDelta >= 0;
  const color = positive ? MINT : CORAL;
  return (
    <TileWrap>
      <BarChart3 className="h-3 w-3 text-white/55" />
      <span className="font-black text-white/95 tracking-wide">DXB INDEX</span>
      <Sep />
      <span className="text-white/70 tabular-nums">
        {index.avgPricePerSqft.toLocaleString()} AED/sqft
      </span>
      <Sep />
      <span className="font-bold tabular-nums" style={{ color }}>
        {positive ? '+' : ''}{index.momDelta.toFixed(2)}%
      </span>
      <span className="text-white/35 text-[10px] uppercase tracking-wider">MoM</span>
    </TileWrap>
  );
}

// ── Skeleton tile (used while loading) ───────────────────────────────────

export function SkeletonTile() {
  return (
    <TileWrap>
      <span className="h-2 w-14 rounded bg-white/10 animate-pulse" />
      <Sep />
      <span className="h-2 w-20 rounded bg-white/10 animate-pulse" />
      <Sep />
      <span className="h-2 w-10 rounded bg-white/10 animate-pulse" />
    </TileWrap>
  );
}
