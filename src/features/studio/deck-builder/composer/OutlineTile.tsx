import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
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
 * Outline tile — Cinematic Gold reference design.
 *
 * Collapsed by default. Tap the head to expand → reveals editable
 * headline + body fields and a Re-prompt button.
 * Citation chip renders as a gold rounded-sm pill (NOT rounded-full
 * — sharp corners match the reference look).
 *
 * Inline-edit: any text change calls onUpdate so the wizard state
 * stays the source of truth.
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
        'group rounded-md border bg-ink-900/40 transition-colors',
        open ? 'border-bone/25' : 'border-bone/10 hover:border-bone/20',
      )}
    >
      {/* Head row — always visible, tappable */}
      <button
        type="button"
        onClick={() => {
          void lightTap();
          setOpen((v) => !v);
        }}
        className="flex w-full items-start gap-4 p-4 text-left"
        aria-expanded={open}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-bone/15 text-gold">
          <span className="font-serif text-xl">{String(index + 1).padStart(2, '0')}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-2xl leading-snug text-bone">
            {renderHeadline(entry.headline ?? '(headline pending)')}
          </div>
          {entry.body ? (
            <div className="mt-1 text-sm text-bone/65 line-clamp-2">
              {entry.body}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-bone/40">
            <span>{label}</span>
            {entry.citation ? (
              <span className="rounded-sm border border-gold/30 bg-gold/[0.06] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-gold">
                {entry.citation.source} · {entry.citation.rows.toLocaleString()} rows
                {entry.citation.window ? ` · ${entry.citation.window}` : ''}
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0">
          {open ? (
            <ChevronUp className="h-4 w-4 text-bone/50" />
          ) : (
            <ChevronDown className="h-4 w-4 text-bone/50" />
          )}
        </div>
      </button>

      {/* Expanded edit panel */}
      {open ? (
        <div className="space-y-4 border-t border-bone/10 px-4 pb-4 pt-3.5">
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-bone/45">
              Headline
            </label>
            <textarea
              value={entry.headline ?? ''}
              onChange={(e) => onUpdate({ ...entry, headline: e.target.value })}
              rows={2}
              maxLength={240}
              className="mt-1.5 w-full resize-none rounded-sm border border-bone/15 bg-ink-900/60 px-3 py-2 font-serif text-base text-bone outline-none transition focus:border-gold/55"
            />
          </div>

          {entry.body !== undefined ? (
            <div>
              <label className="text-[10px] uppercase tracking-[0.18em] text-bone/45">
                Body
              </label>
              <textarea
                value={entry.body ?? ''}
                onChange={(e) => onUpdate({ ...entry, body: e.target.value })}
                rows={3}
                maxLength={600}
                className="mt-1.5 w-full resize-none rounded-sm border border-bone/15 bg-ink-900/60 px-3 py-2 text-sm text-bone/85 outline-none transition focus:border-gold/55"
              />
            </div>
          ) : null}

          {entry.citation ? (
            <div className="rounded-sm border border-gold/25 bg-gold/[0.04] px-3 py-2 text-[11px] text-bone/75">
              <div className="mb-0.5 text-[10px] uppercase tracking-[0.18em] text-gold">
                Source · {entry.citation.source}
              </div>
              <div className="font-mono text-[10.5px] text-bone/85">{entry.citation.tool}</div>
              <div className="mt-0.5 text-[10px] text-bone/45">
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
              className="inline-flex items-center gap-1.5 rounded-sm border border-bone/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-bone/70 transition hover:border-gold/40 hover:text-gold disabled:opacity-50"
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

/**
 * Best-effort split of "Headline — accent" into two parts so the
 * "accent" half renders italic gold, matching how the reference
 * deck's Cover slide reads. If no delimiter, just renders as-is.
 */
function renderHeadline(headline: string) {
  const m = headline.match(/^(.+?)\s*[—\-:·]\s*(.+)$/);
  if (m && m[1].length >= 4 && m[2].length >= 4) {
    return (
      <>
        {m[1]} <span className="italic text-gold-light">{m[2]}</span>
      </>
    );
  }
  return headline;
}
