import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/capacitor';

interface Starter {
  id: string;
  label: string;
  prompt: string;
  audience: string | null;
}

interface StarterGalleryProps {
  /** Called when the user taps a starter card. Receives the prompt
   *  + audience so the brief form can pre-fill both. */
  onPick: (s: { prompt: string; audience: string | null }) => void;
  /** Highlight the active selection by prompt match. */
  selectedPrompt?: string;
}

/**
 * Horizontally-scrolling row of curated topic ideas. Mobile-first:
 *   - Touch scroll with snap on mobile (one card per snap point).
 *   - Wraps to a 2-column grid on tablet+.
 *
 * Source: `studio_topic_starters` table (12 seeded in the launch
 * migration, admin-editable later).
 */
export function StarterGallery({ onPick, selectedPrompt }: StarterGalleryProps) {
  const [items, setItems] = useState<Starter[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('studio_topic_starters')
        .select('id, label, prompt, audience')
        .eq('enabled', true)
        .order('sort_order', { ascending: true })
        .limit(12);
      if (cancelled) return;
      if (error) {
        console.warn('[StarterGallery] fetch failed', error);
        setItems([]);
        return;
      }
      setItems((data ?? []) as Starter[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-[100px] min-w-[220px] shrink-0 rounded-2xl bg-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="-mx-4 sm:mx-0">
      <div
        className={cn(
          'flex gap-2.5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory',
          'sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:snap-none',
          'lg:grid-cols-3',
        )}
        role="listbox"
        aria-label="Sample topics"
      >
        {items.map((s) => {
          const active = s.prompt === selectedPrompt;
          return (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                void lightTap();
                onPick({ prompt: s.prompt, audience: s.audience });
              }}
              className={cn(
                'group relative flex min-w-[220px] shrink-0 snap-start flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all sm:min-w-0',
                'min-h-[100px]',
                active
                  ? 'border-[#18d6a4]/45 bg-[#18d6a4]/10 ring-2 ring-[#18d6a4]/30'
                  : 'border-white/[0.08] bg-white/[0.04] hover:border-white/[0.18] hover:bg-white/[0.06]',
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#18d6a4]/80">
                <Sparkles className="h-3 w-3" />
                {s.audience
                  ? s.audience.replace(/_/g, ' ')
                  : 'any audience'}
              </div>
              <div className="text-[13.5px] font-semibold leading-snug text-white/95">
                {s.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
