import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, RotateCw, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/capacitor';
import type { OutlineEntry } from '../runtime/types';

interface OutlineTileProps {
  index: number;
  entry: OutlineEntry;
  onUpdate: (next: OutlineEntry) => void;
  onRegenerate?: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const SLIDE_LABELS: Record<string, string> = {
  cover: 'Cover',
  why_now: 'Why now',
  market_trend: 'Market trend',
  signal: 'Signal',
  offplan_split: 'Off-plan vs Secondary',
  buyer: 'Know your buyer',
  top_volume: 'Top sale areas',
  top_yield: 'Top rental areas',
  strategy: 'Strategy',
  closing: 'Closing',
};

/**
 * Single outline tile shown on the StepOutline review surface.
 *
 * Collapsed by default to keep the list scannable on mobile.
 * Tap the tile head to expand → reveals editable headline + body
 * textareas, the citation chip detail, and per-slide actions
 * (Re-prompt this slide).
 *
 * Mobile-first: large tap area on the head row, full-width inline
 * edit; no hover-dependent affordances.
 */
export function OutlineTile({
  index,
  entry,
  onUpdate,
  onRegenerate,
  isFirst,
  isLast,
}: OutlineTileProps) {
  // First + last (cover + closing) auto-expand so the adviser sees
  // their full content immediately; middle slides start collapsed.
  const [open, setOpen] = useState(isFirst || isLast);

  const label = SLIDE_LABELS[entry.slide_type] ?? entry.slide_type;

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-2xl border transition-colors',
        open
          ? 'border-white/[0.12] bg-white/[0.05]'
          : 'border-white/[0.06] bg-white/[0.025] hover:border-white/[0.12]',
      )}
    >
      {/* Head row — always visible, tappable to toggle */}
      <button
        type="button"
        onClick={() => {
          void lightTap();
          setOpen((v) => !v);
        }}
        className="flex w-full items-center gap-3 p-4 text-left min-h-[64px]"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-white/65">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#18d6a4]/70">
              {label}
            </span>
            {entry.citation ? (
              <span
                title={`Sourced via ${entry.citation.tool}`}
                className="inline-flex items-center gap-1 rounded-full border border-[#18d6a4]/25 bg-[#18d6a4]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#18d6a4]/85"
              >
                <Info className="h-2.5 w-2.5" />
                Data-backed
              </span>
            ) : null}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-white/95">
            {entry.headline ?? '(headline pending)'}
          </div>
        </div>

        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-white/50" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-white/50" />
        )}
      </button>

      {/* Expanded body */}
      {open ? (
        <div className="space-y-3.5 border-t border-white/[0.06] px-4 pb-4 pt-3.5">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
              Headline
            </label>
            <Textarea
              value={entry.headline ?? ''}
              onChange={(e) => onUpdate({ ...entry, headline: e.target.value })}
              rows={2}
              maxLength={200}
              className="mt-1.5 resize-none rounded-xl border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:border-[#18d6a4]/45 focus-visible:ring-[#18d6a4]/25"
            />
          </div>

          {entry.body !== undefined ? (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
                Body
              </label>
              <Textarea
                value={entry.body ?? ''}
                onChange={(e) => onUpdate({ ...entry, body: e.target.value })}
                rows={3}
                maxLength={600}
                className="mt-1.5 resize-none rounded-xl border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:border-[#18d6a4]/45 focus-visible:ring-[#18d6a4]/25"
              />
            </div>
          ) : null}

          {entry.citation ? (
            <div className="rounded-xl border border-[#18d6a4]/20 bg-[#18d6a4]/[0.05] px-3 py-2.5 text-[11px] text-white/75">
              <div className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#18d6a4]/85">
                <Info className="h-2.5 w-2.5" />
                Source · {entry.citation.source}
              </div>
              <div className="font-mono text-[11px] text-white/75">
                {entry.citation.tool}
              </div>
              {entry.citation.rows ? (
                <div className="mt-0.5 text-[10px] text-white/45">
                  {entry.citation.rows.toLocaleString()} rows
                  {entry.citation.window ? ` · ${entry.citation.window}` : ''}
                </div>
              ) : null}
            </div>
          ) : null}

          {onRegenerate ? (
            <button
              type="button"
              onClick={() => {
                void lightTap();
                onRegenerate();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-white/75 transition-colors hover:border-[#18d6a4]/35 hover:text-white"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Re-write this slide
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { SLIDE_LABELS };
