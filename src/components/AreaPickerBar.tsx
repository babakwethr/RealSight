/**
 * AreaPickerBar — compact searchable area selector. Sits at the top of
 * the Market Intelligence page so the user can change area without
 * going back to the home search.
 *
 * Hits the same `dld_areas` table the home page uses (TanStack Query
 * cache hits when the home page already loaded it). Filters client-side.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, MapPin, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lightTap } from '@/lib/capacitor';
import { cn } from '@/lib/utils';

interface AreaPickerBarProps {
  /** Current area name (from URL ?area=). Empty string for "All Dubai". */
  currentArea: string;
  /** Where to send the user when they pick. Defaults to /market-intelligence. */
  baseHref?: string;
}

interface DldArea {
  name: string;
  totalSales: number;
}

export function AreaPickerBar({ currentArea, baseHref = '/market-intelligence' }: AreaPickerBarProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pull EVERY area DLD has recorded sales in (~71 areas vs the 8
  // curated rows we used to show). Backed by the catalogue table.
  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['dld-areas-picker-all'],
    queryFn: async (): Promise<DldArea[]> => {
      const { data, error } = await supabase.rpc('list_dld_areas');
      if (error) {
        console.error('[area-picker] list_dld_areas error', error);
        return [];
      }
      type Row = { area_name: string; total_sales: number };
      return ((data ?? []) as Row[]).map(r => ({
        name: r.area_name,
        totalSales: Number(r.total_sales) || 0,
      }));
    },
    staleTime: 30 * 60 * 1000,
  });

  // Click-outside to dismiss.
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Focus the input whenever the menu opens.
  useEffect(() => {
    if (open) {
      // micro-delay so the input is in the DOM
      const id = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Show ALL areas by default (no slice). When filtering, also no slice
  // — the list is small (~71 areas) and the container scrolls.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter(a => a.name.toLowerCase().includes(q));
  }, [query, areas]);

  const pickArea = (name: string | null) => {
    lightTap();
    setOpen(false);
    setQuery('');
    if (!name) {
      navigate(baseHref);
    } else {
      navigate(`${baseHref}?area=${encodeURIComponent(name)}`);
    }
  };

  const label = currentArea || 'All Dubai';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'group w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl',
          'bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.12] hover:border-white/[0.22] transition-colors',
          'text-left',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-white/45 font-bold">
              Viewing area
            </span>
            <span className="text-sm font-bold text-foreground truncate">{label}</span>
          </span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-white/55 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[200] bg-popover border border-border rounded-xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search Dubai areas…"
              className="w-full h-11 pl-9 pr-9 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-b border-border/30"
              style={{ fontSize: '16px' }}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/45 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => pickArea(null)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-border/10 transition-colors',
                !currentArea ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground/80',
              )}
            >
              <span className="text-sm font-semibold">All Dubai</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40">Default</span>
            </button>

            {isLoading && (
              <p className="px-4 py-4 text-[12px] text-muted-foreground italic">Loading areas…</p>
            )}

            {!isLoading && filtered.length === 0 && (
              <p className="px-4 py-4 text-[12px] text-muted-foreground italic">
                No areas match "{query}".
              </p>
            )}

            {filtered.map(a => {
              const active = currentArea.toLowerCase() === a.name.toLowerCase();
              return (
                <button
                  key={a.name}
                  onClick={() => pickArea(a.name)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-border/10 last:border-0 transition-colors min-h-[52px]',
                    active ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground/85',
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span className="font-semibold text-sm truncate">{a.name}</span>
                  </span>
                  {a.totalSales > 0 && (
                    <span className="text-[10px] text-white/45 tabular-nums shrink-0">
                      {a.totalSales.toLocaleString()} sales
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
