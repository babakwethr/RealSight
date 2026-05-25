import { ArrowRight, Eye, ExternalLink, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CoverPreviewCard } from './CoverPreviewCard';
import { cn } from '@/lib/utils';
import type { ComposerContext } from './types';

/**
 * Step 5 — Publish. Reference layout: big deck preview on the left,
 * share + download sidebar on the right. The real publish action
 * lives on the DeckPreview route (/studio/decks/:id) where there's
 * room for the full Stage canvas; this step is the gateway with a
 * compelling preview + an "Open deck preview" CTA.
 */
export function StepPublish({ draft }: ComposerContext) {
  const slideCount = draft.outline?.length ?? 0;
  const hasDeckId = Boolean(draft.id);
  const canPublish = hasDeckId && slideCount > 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
      {/* Big preview */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-gold">
          05 — Ready to publish
        </div>
        <h2 className="mt-2 font-serif text-4xl leading-tight text-bone">
          Your deck is ready.
        </h2>
        <p className="mt-2 max-w-md text-sm text-bone/60">
          Fullscreen on the first tap. Looks the same on a laptop, an iPad, or
          a phone. The share link opens straight into a presentation experience.
        </p>

        <div className="mt-6 overflow-hidden rounded-md border border-bone/10 shadow-2xl">
          <CoverPreviewCard draft={draft} />
        </div>
      </div>

      {/* Actions sidebar */}
      <aside className="flex flex-col gap-4 rounded-md border border-bone/10 bg-ink-900/60 p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-bone/55">
          Share &amp; download
        </div>

        {canPublish ? (
          <>
            {/* Live link CTA */}
            <Link
              to={`/studio/decks/${draft.id}`}
              className={cn(
                'inline-flex items-center justify-between gap-2 rounded-sm border border-gold bg-gold px-4 py-3 text-xs uppercase tracking-[0.18em] text-ink-900 transition hover:bg-gold-light',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Open deck preview
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-bone/55">
              Pick photos, hit Publish, and get a share link like{' '}
              <span className="font-mono text-bone/75">realsight.app/r/XXX</span>.
            </p>

            {/* HTML download placeholder */}
            <button
              type="button"
              disabled
              className="flex items-center justify-between rounded-sm border border-bone/15 bg-ink-800/60 p-4 text-left opacity-55"
            >
              <div>
                <div className="text-sm text-bone">Download HTML</div>
                <div className="text-xs text-bone/55">Single offline file — next build</div>
              </div>
              <Download className="h-4 w-4 text-bone/45" />
            </button>

            {/* PDF download placeholder */}
            <button
              type="button"
              disabled
              className="flex items-center justify-between rounded-sm border border-bone/15 bg-ink-800/60 p-4 text-left opacity-55"
            >
              <div>
                <div className="text-sm text-bone">Download PDF</div>
                <div className="text-xs text-bone/55">{slideCount} pages · 1280×800 — next build</div>
              </div>
              <Download className="h-4 w-4 text-bone/45" />
            </button>
          </>
        ) : (
          <div className="rounded-sm border border-dashed border-bone/15 bg-ink-800/30 p-5 text-center text-sm text-bone/55">
            <ExternalLink className="mx-auto mb-2 h-5 w-5 text-bone/45" />
            Generate an outline in Step 3 first.
          </div>
        )}

        <div className="mt-2 border-t border-bone/10 pt-4 text-xs text-bone/45">
          <div className="text-[11px] uppercase tracking-[0.18em] text-bone/55">Coming</div>
          <p className="mt-2 leading-relaxed">
            Deck analytics · presenter remote on phone · matching Instagram +
            LinkedIn social pack from this same deck.
          </p>
        </div>
      </aside>
    </div>
  );
}
