/**
 * MarketHeroFilterBar — the rich search + filter bar used on every
 * market home (UAE / UK / US). Visually identical across markets so the
 * three pages feel like one product.
 *
 * Owns:
 *   - Search input + autocomplete dropdown
 *   - Beds / Sales-Rental / Status / Type filter pills
 *   - Primary "Search" CTA (mint button)
 *
 * The parent owns the suggestion data + the submit handler — this
 * component is purely presentational + filter-state-aware.
 *
 * Mobile layout: search row + Sales/Rental segment + 3-up filter chips,
 * just like the UAE bar. iOS Haptics fire on selection and submit.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { lightTap, mediumTap } from '@/lib/capacitor';
import { cn } from '@/lib/utils';

export interface MarketHeroSuggestionGroup {
  /** Header shown above the group ("Areas", "Buildings · DLD", "Postcodes…"). */
  label: string;
  /** Right-side spinner (rendered next to the label) when this group is loading. */
  isLoading?: boolean;
  /** Subtle leading-icon character (📍 📊 🇬🇧 etc.). */
  icon?: string;
  /** Group items. */
  items: MarketHeroSuggestion[];
}

export interface MarketHeroSuggestion {
  /** Stable React key. */
  id: string;
  /** First line of the row (e.g. building name). */
  primary: string;
  /** Optional second line (e.g. area · 23 sales). */
  secondary?: string;
  /** Anything else the caller wants to keep — handed back via onSelect. */
  payload?: unknown;
}

export interface MarketFilterPillOptions {
  /** Default 'Any'. */
  beds?: string[];
  /** Default ['Sales','Rental']. Pass [] to hide. */
  modes?: ('Sales' | 'Rental')[];
  /** Pass [] to hide the Status filter (UK / US markets). */
  statuses?: string[];
  /** Property types relevant to this market. */
  types?: string[];
}

const DEFAULT_BEDS = ['Any', 'Studio', '1 Bed', '2 Beds', '3 Beds', '4 Beds', '5+ Beds'];
const DEFAULT_MODES: ('Sales' | 'Rental')[] = ['Sales', 'Rental'];

export interface MarketHeroFilterBarProps {
  /** Market tag — drives accent colour. */
  market: 'uae' | 'uk' | 'us';
  /** Placeholder for the search input. */
  placeholder: string;
  /** Current query (controlled). */
  query: string;
  /** Update the query. */
  onQueryChange: (q: string) => void;
  /** Suggestion groups to render in the dropdown. */
  suggestions: MarketHeroSuggestionGroup[];
  /** Called when the user taps a suggestion row. */
  onSelectSuggestion: (group: MarketHeroSuggestionGroup, item: MarketHeroSuggestion) => void;
  /** Called when the user hits Enter / taps Search. */
  onSubmit: (filters: MarketHeroFilters) => void;
  /** Per-market filter options. */
  filterOptions?: MarketFilterPillOptions;
}

export interface MarketHeroFilters {
  query: string;
  beds: string;
  mode: 'Sales' | 'Rental';
  status: string;
  type: string;
}

const ACCENTS: Record<MarketHeroFilterBarProps['market'], { ring: string; chip: string }> = {
  uae: { ring: 'focus-within:border-primary/40', chip: 'text-primary' },
  uk:  { ring: 'focus-within:border-emerald-400/40', chip: 'text-emerald-300' },
  us:  { ring: 'focus-within:border-violet-400/40', chip: 'text-violet-300' },
};

export function MarketHeroFilterBar({
  market,
  placeholder,
  query,
  onQueryChange,
  suggestions,
  onSelectSuggestion,
  onSubmit,
  filterOptions = {},
}: MarketHeroFilterBarProps) {
  const beds_ = filterOptions.beds ?? DEFAULT_BEDS;
  const modes = filterOptions.modes ?? DEFAULT_MODES;
  const statuses = filterOptions.statuses ?? [];
  const types = filterOptions.types ?? [];

  const [beds, setBeds] = useState('Any');
  const [mode, setMode] = useState<'Sales' | 'Rental'>(modes[0] ?? 'Sales');
  const [status, setStatus] = useState('Any');
  const [type, setType] = useState('Any');
  const [showSugg, setShowSugg] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const debouncedQ = useDebounce(query, 80);

  const showDropdown =
    showSugg && debouncedQ.trim().length >= 1;

  const totalItems = useMemo(
    () => suggestions.reduce((n, g) => n + g.items.length, 0),
    [suggestions],
  );
  const anyLoading = useMemo(
    () => suggestions.some(g => g.isLoading),
    [suggestions],
  );

  const accent = ACCENTS[market];

  const submit = () => {
    mediumTap();
    onSubmit({ query, beds, mode, status, type });
  };

  const selectItem = (g: MarketHeroSuggestionGroup, it: MarketHeroSuggestion) => {
    lightTap();
    setShowSugg(false);
    onSelectSuggestion(g, it);
  };

  /* ─── Desktop ─── */
  return (
    <div ref={ref} className="relative w-full max-w-4xl mx-auto">
      {/* Desktop bar */}
      <div className={cn(
        'hidden sm:flex items-center backdrop-blur-md bg-white/[0.06] border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-white/[0.18] transition-all',
        accent.ring,
      )} style={{ position: 'relative' }}>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <input
            value={query}
            onChange={e => { onQueryChange(e.target.value); setShowSugg(true); }}
            onFocus={() => setShowSugg(true)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={placeholder}
            className="w-full h-12 pl-10 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-r border-white/[0.08]"
          />
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover border border-border rounded-xl overflow-hidden shadow-2xl max-h-[70vh] overflow-y-auto">
              {suggestions.map((g) => (
                <div key={g.label}>
                  <p className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    {g.label}
                    {g.isLoading && (
                      <span className={cn('inline-flex items-center gap-1 normal-case tracking-normal font-normal text-[10px]', accent.chip)}>
                        <Loader2 className="h-3 w-3 animate-spin" /> searching…
                      </span>
                    )}
                  </p>
                  {g.items.length === 0 && !g.isLoading && (
                    <p className="px-4 py-3 text-[11px] text-muted-foreground italic">
                      No matches in {g.label.toLowerCase()}.
                    </p>
                  )}
                  {g.items.map(it => (
                    <button
                      key={it.id}
                      onMouseDown={() => selectItem(g, it)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-foreground/85 active:bg-primary/10 hover:bg-muted text-left border-b border-border/10 last:border-0 transition-colors"
                    >
                      {g.icon && <span className={cn('text-xs pt-0.5', accent.chip)}>{g.icon}</span>}
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-sm text-foreground truncate">{it.primary}</span>
                        {it.secondary && (
                          <span className="block text-[11px] text-muted-foreground truncate mt-0.5">{it.secondary}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              {totalItems === 0 && !anyLoading && (
                <p className="px-4 py-3 text-[11px] text-muted-foreground italic">
                  No matches for "{debouncedQ}".
                </p>
              )}
            </div>
          )}
        </div>
        {beds_.length > 0 && (
          <FilterDropdown label="Beds" value={beds} onChange={setBeds} options={beds_} />
        )}
        {modes.length > 0 && (
          <div className="flex items-center border-r border-white/[0.08] px-2 gap-1">
            {modes.map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 h-8 text-xs rounded-lg font-semibold transition-all ${mode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {m}
              </button>
            ))}
          </div>
        )}
        {statuses.length > 0 && (
          <FilterDropdown label="Status" value={status} onChange={setStatus} options={statuses} />
        )}
        {types.length > 0 && (
          <FilterDropdown label="Type" value={type} onChange={setType} options={types} />
        )}
        <button onClick={submit}
          className="h-12 px-6 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shrink-0 rounded-r-2xl">
          Search
        </button>
      </div>

      {/* Mobile bar */}
      <div className="sm:hidden space-y-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1 backdrop-blur-md bg-white/[0.06] border border-white/[0.12] rounded-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <input
              value={query}
              onChange={e => { onQueryChange(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder={placeholder}
              className="w-full h-13 pl-10 pr-4 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none rounded-xl"
              style={{ fontSize: '16px', height: 52 }}
            />
            {showDropdown && (
              <div
                className="absolute top-full left-0 right-0 mt-2 z-[9999] bg-popover border border-border rounded-xl overflow-hidden shadow-2xl max-h-[60vh] overflow-y-auto"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {suggestions.map((g) => (
                  <div key={g.label}>
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      {g.label}
                      {g.isLoading && (
                        <span className={cn('inline-flex items-center gap-1 normal-case tracking-normal font-normal text-[10px]', accent.chip)}>
                          <Loader2 className="h-3 w-3 animate-spin" /> searching…
                        </span>
                      )}
                    </p>
                    {g.items.length === 0 && !g.isLoading && (
                      <p className="px-4 py-3 text-[12px] text-muted-foreground italic">
                        No matches in {g.label.toLowerCase()}.
                      </p>
                    )}
                    {g.items.map(it => (
                      <button
                        key={it.id}
                        onMouseDown={() => selectItem(g, it)}
                        className="w-full flex items-start gap-3 px-4 py-3.5 text-foreground/85 active:bg-primary/10 hover:bg-muted text-left border-b border-border/10 last:border-0 transition-colors min-h-[56px]"
                      >
                        {g.icon && <span className={cn('text-base pt-0.5', accent.chip)}>{g.icon}</span>}
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-[15px] text-foreground truncate">{it.primary}</span>
                          {it.secondary && (
                            <span className="block text-[12px] text-muted-foreground truncate mt-0.5">{it.secondary}</span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
                {totalItems === 0 && !anyLoading && (
                  <p className="px-4 py-3 text-[12px] text-muted-foreground italic">
                    No matches for "{debouncedQ}".
                  </p>
                )}
              </div>
            )}
          </div>
          <button onClick={submit}
            className="h-[52px] px-5 bg-primary text-primary-foreground text-sm font-bold rounded-xl shrink-0 min-w-[80px]">
            Search
          </button>
        </div>

        {modes.length > 0 && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-[10px] border"
               style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }}>
            {modes.map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`h-[38px] rounded-[7px] text-[13px] font-bold transition-all ${
                  mode === m ? 'bg-white text-[#0a0f2e] shadow-sm' : 'text-muted-foreground'
                }`}>
                {m}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {beds_.length > 0 && (
            <MobileFilterPill label="Beds" value={beds} onChange={setBeds} options={beds_} />
          )}
          {statuses.length > 0 && (
            <MobileFilterPill label="Status" value={status} onChange={setStatus} options={statuses} />
          )}
          {types.length > 0 && (
            <MobileFilterPill label="Type" value={type} onChange={setType} options={types} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function FilterDropdown({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const display = value === 'Any' ? label : value;
  return (
    <div ref={ref} className="relative border-r border-white/[0.08]">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3.5 h-12 text-sm font-semibold text-foreground/80 hover:text-foreground whitespace-nowrap"
      >
        <span>{display}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden min-w-[160px] z-[9999]">
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted border-b border-border/10 last:border-0 ${value === o ? 'text-primary font-bold' : 'text-foreground/80'}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileFilterPill({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const display = value === 'Any' ? label : value;
  const active = value !== 'Any';
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-1.5 w-full px-3 h-9 text-[12.5px] font-semibold rounded-[10px] border transition-colors whitespace-nowrap ${
          active
            ? 'bg-primary/15 border-primary/40 text-primary'
            : 'bg-white/[0.05] border-white/[0.14] text-foreground/75'
        }`}
      >
        <span className="truncate">{display}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#0A0F1A] border border-white/15 rounded-xl shadow-2xl overflow-hidden min-w-[140px] z-[9999]">
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-white/[0.06] border-b border-white/[0.05] last:border-0 ${value === o ? 'text-primary font-bold' : 'text-foreground/80'}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
