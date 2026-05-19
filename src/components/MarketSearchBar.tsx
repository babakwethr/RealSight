/**
 * MarketSearchBar — shared search input for the UK and US market homes.
 *
 * Accepts a free-text query + an `options` list (regions / metros / ZIP
 * prefixes). Autocompletes against `options.label` + `options.aliases[]`,
 * and on submit either:
 *   - Calls `onSelect(option)` when the user picks a known suggestion.
 *   - Calls `onSubmit(query)` when the user hits Enter on free text.
 *
 * Visual style mirrors the UAE `SearchFilterBar` so the three market
 * homes feel coherent (punch-list item 7 — Babak: "search where they
 * can also search for areas, same like Dubai").
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';

export interface MarketSearchOption {
  /** Stable id, used as React key + passed back via onSelect. */
  id: string;
  /** Human-readable name shown in the dropdown. */
  label: string;
  /**
   * Alternative match strings. Useful so "SW1" also surfaces the London
   * region, or "Manhattan" surfaces NYC. Each option's `label` is auto-
   * included; you only need to add other matchable strings here.
   */
  aliases?: string[];
  /** Optional caption rendered as a second line (e.g. "average £542K"). */
  caption?: string;
}

interface MarketSearchBarProps {
  /** All choices the user can pick from. */
  options: MarketSearchOption[];
  /** Called when the user picks a known suggestion. */
  onSelect: (option: MarketSearchOption) => void;
  /** Called when the user submits free text that doesn't match anything. */
  onSubmit?: (query: string) => void;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Pre-fill the input. */
  initialQuery?: string;
}

export function MarketSearchBar({
  options,
  onSelect,
  onSubmit,
  placeholder = 'Search…',
  initialQuery = '',
}: MarketSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [showSugg, setShowSugg] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return options
      .filter((o) => {
        if (o.label.toLowerCase().includes(q)) return true;
        return o.aliases?.some((a) => a.toLowerCase().includes(q));
      })
      .slice(0, 8);
  }, [query, options]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handlePick = (option: MarketSearchOption) => {
    setQuery(option.label);
    setShowSugg(false);
    onSelect(option);
  };

  const handleEnter = () => {
    if (suggestions.length > 0) {
      handlePick(suggestions[0]);
      return;
    }
    if (onSubmit && query.trim()) onSubmit(query.trim());
    setShowSugg(false);
  };

  return (
    <div ref={ref} className="relative w-full max-w-2xl">
      <div className="relative backdrop-blur-md bg-white/[0.06] border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-white/[0.18] transition-all">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSugg(true); }}
          onFocus={() => setShowSugg(true)}
          onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
          placeholder={placeholder}
          className="w-full h-12 pl-10 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          style={{ fontSize: 16 }}
        />
      </div>

      {showSugg && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover border border-border rounded-xl overflow-hidden shadow-2xl">
          {suggestions.map((o) => (
            <button
              key={o.id}
              onMouseDown={() => handlePick(o)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted text-left border-b border-border/10 last:border-0 transition-colors"
            >
              <span className="text-primary text-xs">📍</span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-foreground/90 truncate">{o.label}</span>
                {o.caption && <span className="block text-[11px] text-muted-foreground truncate">{o.caption}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
