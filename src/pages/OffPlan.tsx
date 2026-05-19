/**
 * OffPlan — international off-plan inventory dashboard.
 *
 * Phase 4 of the global-launch plan. Surfaces Reelly's catalogue across
 * the three markets that have meaningful inventory:
 *   - UAE         🇦🇪  ~1,953 projects
 *   - Bali        🇮🇩    66 projects (100% on-sale)
 *   - Phuket (TH) 🇹🇭    10 projects (all Phuket / Thalang)
 *
 * Other Reelly countries (Oman, Cyprus, Türkiye, Maldives, etc.) are
 * deliberately not exposed — they have too few populated rows to count
 * as a real market in our UX. Per the global-launch plan §"out of scope".
 *
 * Single self-contained page; does not yet unify with the per-market
 * homes (UAE / UK / US). That unification is a v2 concern.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReellyProjects } from '@/hooks/useReellyData';
import { useDebounce } from '@/hooks/useDebounce';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Building2, MapPin, ArrowUpRight, TrendingUp, Search, X } from 'lucide-react';
import type { ReellyProject } from '@/types/reelly';

interface OffPlanFilters {
  searchQuery: string;
  bedrooms: string; // 'any' | '0' | '1' | '2' | '3' | '4+'
  saleStatus: string; // 'any' | 'on_sale' | 'presale' | 'out_of_stock'
  unitPriceFrom: string; // empty | number string
  unitPriceTo: string;
  ordering: string; // 'default' | 'min_price' | '-min_price' | '-completion_datetime'
}

const INITIAL_FILTERS: OffPlanFilters = {
  searchQuery: '',
  bedrooms: 'any',
  saleStatus: 'any',
  unitPriceFrom: '',
  unitPriceTo: '',
  ordering: 'default',
};

type CountryTab = 'uae' | 'bali' | 'phuket';

const TABS: Array<{
  key: CountryTab;
  label: string;
  flag: string;
  /** Reelly country query value. */
  country: string;
}> = [
  { key: 'uae',    label: 'UAE',     flag: '🇦🇪', country: 'United Arab Emirates' },
  { key: 'bali',   label: 'Bali',    flag: '🇮🇩', country: 'Indonesia'            },
  { key: 'phuket', label: 'Phuket',  flag: '🇹🇭', country: 'Thailand'             },
];

function fmtPrice(value: number | null | undefined, currency = 'AED'): string {
  if (value == null || !isFinite(value) || value === 0) return '—';
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : `${currency} `;
  if (Math.abs(value) >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${symbol}${Math.round(value / 1_000)}K`;
  return `${symbol}${Math.round(value).toLocaleString()}`;
}

function statusLabel(status?: string): { text: string; positive: boolean } {
  if (!status) return { text: 'Status unknown', positive: false };
  if (status === 'on_sale') return { text: 'On sale', positive: true };
  if (status === 'presale' || status === 'pre_sale') return { text: 'Pre-sale', positive: true };
  if (status === 'announced' || status === 'start_of_sales') return { text: 'Launching soon', positive: true };
  if (status === 'out_of_stock' || status === 'sold_out') return { text: 'Sold out', positive: false };
  return { text: status.replace(/_/g, ' '), positive: false };
}

export default function OffPlan() {
  const [tab, setTab] = useState<CountryTab>('uae');
  const [filters, setFilters] = useState<OffPlanFilters>(INITIAL_FILTERS);

  const activeFilterCount = [
    filters.searchQuery,
    filters.bedrooms !== 'any' ? '1' : '',
    filters.saleStatus !== 'any' ? '1' : '',
    filters.unitPriceFrom,
    filters.unitPriceTo,
    filters.ordering !== 'default' ? '1' : '',
  ].filter(Boolean).length;

  // Renders inside <AppLayout /> — sidebar + bg are provided by the layout.
  return (
    <div className="space-y-8 animate-fade-in">
        {/* ─── Hero ─── */}
        <section className="glass-card p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/80 mb-2">
            International off-plan inventory
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2" style={{ letterSpacing: '-0.02em' }}>
            Off-plan, three markets, one feed.
          </h1>
          <p className="text-sm text-white/55 max-w-2xl">
            Live inventory across the world's three most active off-plan markets
            for international investors — Dubai, Bali, and Phuket. New launches,
            payment plans, and developer credentials surfaced directly from the
            Reelly catalogue.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-xl p-5 text-left border transition-colors ${
                  tab === t.key
                    ? 'bg-white/[0.08] border-amber-400/40'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{t.flag}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t.label}</p>
                    <p className="text-[10px] text-white/45 uppercase tracking-widest">Off-plan</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ─── Filter panel ─── */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(INITIAL_FILTERS)}
          activeCount={activeFilterCount}
        />

        {/* ─── Tabs ─── */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as CountryTab)}>
          <TabsList className="bg-white/[0.04] border border-white/[0.06] p-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="data-[state=active]:bg-white/[0.08]">
                <span className="mr-1.5">{t.flag}</span>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-6">
              <ProjectGrid country={t.country} filters={filters} />
            </TabsContent>
          ))}
        </Tabs>

      {/* ─── Source footer ─── */}
      <section className="text-center text-[11px] text-white/35 pt-6 border-t border-white/[0.05]">
        Off-plan inventory sourced via Reelly's partner API. Project details,
        pricing, and developer information are provided by listing developers
        and refreshed at least daily.
      </section>
    </div>
  );
}

/* ─── Project grid ─── */

/* ─── Filter panel ─── */

interface FilterPanelProps {
  filters: OffPlanFilters;
  onChange: (next: OffPlanFilters) => void;
  onReset: () => void;
  activeCount: number;
}

function FilterPanel({ filters, onChange, onReset, activeCount }: FilterPanelProps) {
  const setField = <K extends keyof OffPlanFilters>(key: K, value: OffPlanFilters[K]) =>
    onChange({ ...filters, [key]: value });
  return (
    <section className="glass-card p-4 md:p-5 space-y-3">
      {/* Top row: search input + active-filter count + reset */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.searchQuery}
            onChange={(e) => setField('searchQuery', e.target.value)}
            placeholder="Search project, developer, district…"
            className="pl-9 bg-white/[0.04] border-white/[0.08] focus-visible:ring-amber-400/30"
          />
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-2 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-400/20 hover:bg-amber-500/20 transition-colors shrink-0"
          >
            <X className="h-3 w-3" /> Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Bottom row: dropdowns + chips */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
        <FilterSelect
          label="Bedrooms"
          value={filters.bedrooms}
          onValueChange={(v) => setField('bedrooms', v)}
          options={[
            { value: 'any', label: 'Any' },
            { value: '0', label: 'Studio' },
            { value: '1', label: '1 bed' },
            { value: '2', label: '2 beds' },
            { value: '3', label: '3 beds' },
            { value: '4,5,6', label: '4+ beds' },
          ]}
        />
        <FilterSelect
          label="Status"
          value={filters.saleStatus}
          onValueChange={(v) => setField('saleStatus', v)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'on_sale', label: 'On sale' },
            { value: 'presale', label: 'Pre-sale' },
            { value: 'announced', label: 'Announced' },
            { value: 'out_of_stock', label: 'Sold out' },
          ]}
        />
        <PriceInput
          label="Min price"
          value={filters.unitPriceFrom}
          onChange={(v) => setField('unitPriceFrom', v)}
          placeholder="Any"
        />
        <PriceInput
          label="Max price"
          value={filters.unitPriceTo}
          onChange={(v) => setField('unitPriceTo', v)}
          placeholder="Any"
        />
        <FilterSelect
          label="Sort"
          value={filters.ordering}
          onValueChange={(v) => setField('ordering', v)}
          options={[
            { value: 'default', label: 'Featured' },
            { value: 'min_price', label: 'Price ↑' },
            { value: '-min_price', label: 'Price ↓' },
            { value: '-completion_datetime', label: 'Newest' },
          ]}
        />
      </div>
    </section>
  );
}

function FilterSelect({
  label, value, onValueChange, options,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-white/45 mb-1">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PriceInput({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-white/45 mb-1">{label}</p>
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
        placeholder={placeholder}
        className="bg-white/[0.04] border-white/[0.08]"
      />
    </div>
  );
}

function ProjectGrid({ country, filters }: { country: string; filters: OffPlanFilters }) {
  // Debounce the free-text search so we don't fire on every keystroke.
  const debouncedSearch = useDebounce(filters.searchQuery, 280);

  const { data, isLoading } = useReellyProjects({
    country,
    limit: 24,
    searchQuery: debouncedSearch || undefined,
    bedrooms: filters.bedrooms === 'any' ? undefined : filters.bedrooms,
    saleStatus: filters.saleStatus === 'any' ? undefined : filters.saleStatus,
    unitPriceFrom: filters.unitPriceFrom ? Number(filters.unitPriceFrom) : undefined,
    unitPriceTo: filters.unitPriceTo ? Number(filters.unitPriceTo) : undefined,
    ordering: filters.ordering === 'default' ? undefined : filters.ordering,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  const projects = data?.results ?? [];
  const hasActiveFilters = !!(
    filters.searchQuery || filters.bedrooms !== 'any' || filters.saleStatus !== 'any' ||
    filters.unitPriceFrom || filters.unitPriceTo || filters.ordering !== 'default'
  );
  if (!projects.length || data?.fallback) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.08] p-10 text-center">
        <ArrowUpRight className="h-6 w-6 text-white/30 mx-auto mb-2" />
        <p className="text-sm text-white/55">
          {hasActiveFilters ? 'No projects match those filters.' : 'No projects returned for this country yet.'}
        </p>
        <p className="text-[11px] text-white/35 mt-1">
          {hasActiveFilters ? 'Try clearing the filters or broadening the search.' : 'The Reelly feed may be temporarily unavailable.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-baseline justify-end mb-4">
        <p className="text-[10px] uppercase tracking-widest text-white/40">Source · Reelly</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </>
  );
}

function ProjectCard({ project: p }: { project: ReellyProject }) {
  const status = statusLabel(p.sale_status);
  const currency = p.price_currency ?? p.currency ?? 'AED';
  const imageUrl = p.cover_image?.url;
  return (
    <Link
      to={`/projects/${p.id}`}
      className="group rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden hover:bg-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col"
    >
      {/* Cover */}
      <div className="aspect-[16/10] bg-gradient-to-br from-amber-500/10 to-violet-500/10 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-white/20" />
          </div>
        )}
        {p.units_count != null && p.units_count > 0 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] font-bold text-white">
            {p.units_count} {p.units_count === 1 ? 'unit' : 'units'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{p.name}</p>
        </div>
        <p className="text-[11px] text-white/55 mb-2 line-clamp-1">{p.developer}</p>

        <div className="flex items-center gap-1 text-[10px] text-white/45 mb-3">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">
            {p.location?.district ?? p.location?.region ?? '—'}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-white/40">From</p>
            <p className="text-base font-black text-foreground tabular-nums" style={{ letterSpacing: '-0.02em' }}>
              {fmtPrice(p.min_price, currency)}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              status.positive
                ? 'text-emerald-400 bg-emerald-400/10'
                : 'text-white/40 bg-white/[0.04]'
            }`}
          >
            {status.positive && <TrendingUp className="h-2.5 w-2.5" />}
            {status.text}
          </span>
        </div>
      </div>
    </Link>
  );
}
