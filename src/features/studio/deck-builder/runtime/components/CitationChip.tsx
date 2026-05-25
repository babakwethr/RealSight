import { useState } from 'react';
import { useStaticMode } from '../static-mode';
import type { Citation } from '../types';

interface CitationChipProps {
  citation: Citation | null | undefined;
  /** Render style. `'chip'` = pill rendered inline near the chart;
   *  `'footnote'` = small superscript number used in static/print mode. */
  variant?: 'chip' | 'footnote';
  /** Footnote-numbering hint when variant='footnote'. */
  footnoteIndex?: number;
}

/**
 * Data-traceability chip — hover (desktop) or tap (touch) to reveal
 * the exact tool-call that produced the numbers on the slide.
 *
 * In StaticMode (print / PDF) we render a tiny superscript footnote
 * marker instead — the full citation list renders at the bottom of
 * the slide via <CitationFootnotes/>.
 *
 * Per the plan §1.3 — "every number on every slide must trace to a
 * tool-call".
 */
export function CitationChip({ citation, variant = 'chip', footnoteIndex }: CitationChipProps) {
  const isStatic = useStaticMode();
  const [open, setOpen] = useState(false);

  if (!citation) return null;

  // Print / PDF: footnote marker.
  if (isStatic || variant === 'footnote') {
    const n = footnoteIndex ?? 1;
    return (
      <sup
        className="ml-1 text-[10px] font-semibold tracking-wide text-gold/80"
        aria-label={`Source ${n}: ${citation.source} via ${citation.tool}`}
      >
        [{n}]
      </sup>
    );
  }

  // Interactive deck: hoverable chip.
  const chipLabel = formatChipLabel(citation);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-[2px] text-[10px] font-medium uppercase tracking-[0.12em] text-gold/90 backdrop-blur-sm transition hover:border-gold/55 hover:bg-gold/18 focus:outline-none"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold/80" />
        {chipLabel}
      </button>

      {open ? (
        <span
          role="dialog"
          aria-label="Data source"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-[280px] -translate-x-1/2 rounded-xl border border-bone/15 bg-ink-800/95 p-3 text-left text-[11px] leading-relaxed text-bone/85 shadow-[0_18px_42px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          <div className="mb-1.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-gold/85">
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold" />
            Source · {citation.source}
          </div>
          <div className="mb-1 font-mono text-[10.5px] text-bone/95">
            {citation.tool}
          </div>
          <div className="mb-2 font-mono text-[10px] text-bone/65">
            {formatParams(citation.params)}
          </div>
          <div className="flex items-center justify-between border-t border-bone/10 pt-1.5 text-[10px] text-bone/55">
            <span>{citation.rows.toLocaleString('en-US')} rows</span>
            <span>{formatFetchedAt(citation.fetched_at)}</span>
          </div>
        </span>
      ) : null}
    </span>
  );
}

interface CitationFootnotesProps {
  citations: (Citation | null | undefined)[];
}

/**
 * Bottom-of-slide footnote list, used in StaticMode so the printed
 * PDF carries the same data-traceability the interactive chip gives.
 */
export function CitationFootnotes({ citations }: CitationFootnotesProps) {
  const items = citations
    .map((c, i) => ({ c, n: i + 1 }))
    .filter((x): x is { c: Citation; n: number } => Boolean(x.c));
  if (items.length === 0) return null;
  return (
    <div className="absolute bottom-2 left-12 right-12 z-10 hidden border-t border-bone/10 pt-1.5 text-[9px] leading-snug text-bone/45 print:block">
      {items.map(({ c, n }) => (
        <div key={n} className="font-mono">
          [{n}] {c.source} · {c.tool}
          {formatParams(c.params) ? ` · ${formatParams(c.params)}` : ''}
          {c.window ? ` · ${c.window}` : ''}
          {' · '}
          {c.rows.toLocaleString('en-US')} rows
        </div>
      ))}
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────

function formatChipLabel(c: Citation): string {
  const window = c.window ? ` · ${c.window}` : '';
  return `${c.source} · ${c.rows.toLocaleString('en-US')} rows${window}`;
}

function formatParams(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}=${formatValue(v)}`).join(' · ');
}

function formatValue(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'boolean') return v.toString();
  if (Array.isArray(v)) return `[${v.length}]`;
  return JSON.stringify(v);
}

function formatFetchedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
