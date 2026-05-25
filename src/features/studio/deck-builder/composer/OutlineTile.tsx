import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/capacitor';
import type { OutlineEntry } from '../runtime/types';

interface OutlineTileProps {
  index: number;
  entry: OutlineEntry;
  onUpdate: (next: OutlineEntry) => void;
  onRePrompt?: () => Promise<void> | void;
  isFirst: boolean;
  isLast: boolean;
}

const SLIDE_LABELS: Record<string, string> = {
  cover:          'Cover',
  why_now:        'Why now',
  market_trend:   'Market trend',
  signal:         'Signal',
  offplan_split:  'Off-plan vs Secondary',
  buyer:          'Know your buyer',
  top_volume:     'Top sale areas',
  top_yield:      'Top rental areas',
  strategy:       'Strategy',
  closing:        'Closing',
};

/**
 * Outline tile — RealSight V3 CI (glass card, mint accent, Inter
 * type, rounded-2xl). Same UX as the reference (collapsed by default,
 * tap to expand-edit, citation chip per data-bearing tile) but the
 * brand language matches the rest of the composer.
 */
export function OutlineTile({
  index,
  entry,
  onUpdate,
  onRePrompt,
  isFirst,
  isLast,
}: OutlineTileProps) {
  const [open, setOpen] = useState(isFirst || isLast);
  const [reprompting, setReprompting] = useState(false);
  const label = SLIDE_LABELS[entry.slide_type] ?? entry.slide_type;

  const handleRePrompt = async () => {
    if (!onRePrompt) return;
    setReprompting(true);
    try {
      void lightTap();
      await onRePrompt();
    } finally {
      setReprompting(false);
    }
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border backdrop-blur-md transition-colors',
        open
          ? 'border-white/[0.16] bg-white/[0.05]'
          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16]',
      )}
    >
      {/* Head row */}
      <button
        type="button"
        onClick={() => {
          void lightTap();
          setOpen((v) => !v);
        }}
        className="flex w-full items-start gap-3 p-4 text-left min-h-[68px] sm:gap-4"
        aria-expanded={open}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-[#18d6a4]">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#18d6a4]">
              {label}
            </span>
            {entry.citation ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-[#18d6a4]/35 bg-[#18d6a4]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#2effc0]"
                title={`Sourced via ${entry.citation.tool}`}
              >
                <Info className="h-2.5 w-2.5" />
                Data-backed
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-base font-bold leading-snug text-white sm:text-lg">
            {entry.headline ?? '(headline pending)'}
          </div>
          {entry.body && !open ? (
            <div className="mt-1 text-sm leading-snug text-white/55 line-clamp-2">
              {entry.body}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 pt-1">
          {open ? (
            <ChevronUp className="h-4 w-4 text-white/50" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/50" />
          )}
        </div>
      </button>

      {/* Expanded edit panel */}
      {open ? (
        <div className="space-y-4 border-t border-white/[0.06] px-4 pb-4 pt-3.5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
              Headline
            </label>
            <textarea
              value={entry.headline ?? ''}
              onChange={(e) => onUpdate({ ...entry, headline: e.target.value })}
              rows={2}
              maxLength={240}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-base text-white outline-none transition focus:border-[#18d6a4]/45 focus:ring-2 focus:ring-[#18d6a4]/20"
            />
          </div>

          {entry.body !== undefined ? (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                Body
              </label>
              <textarea
                value={entry.body ?? ''}
                onChange={(e) => onUpdate({ ...entry, body: e.target.value })}
                rows={3}
                maxLength={600}
                className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/85 outline-none transition focus:border-[#18d6a4]/45 focus:ring-2 focus:ring-[#18d6a4]/20"
              />
            </div>
          ) : null}

          {entry.citation ? (
            <div className="rounded-xl border border-[#18d6a4]/25 bg-[#18d6a4]/[0.05] px-3 py-2 text-[11px] text-white/75">
              <div className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2effc0]">
                <Info className="h-2.5 w-2.5" />
                Source · {entry.citation.source}
              </div>
              <div className="font-mono text-[10.5px] text-white/85">{entry.citation.tool}</div>
              <div className="mt-0.5 text-[10px] text-white/45">
                {entry.citation.rows.toLocaleString()} rows
                {entry.citation.window ? ` · ${entry.citation.window}` : ''}
              </div>
            </div>
          ) : null}

          {onRePrompt ? (
            <button
              type="button"
              onClick={handleRePrompt}
              disabled={reprompting}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/75 transition hover:border-[#18d6a4]/35 hover:text-white disabled:opacity-50"
            >
              {reprompting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Re-write this slide
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
