import { ArrowRight, Eye, ExternalLink, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CoverPreviewCard } from './CoverPreviewCard';
import { cn } from '@/lib/utils';
import type { ComposerContext } from './types';

/**
 * Step 5 — Publish.
 *
 * UX matches reference (big preview left + share/download sidebar
 * right). CI is RealSight V3: glass cards, mint accent, Inter type,
 * rounded-2xl, mint-gradient primary CTA. The cover preview INSIDE
 * the card is the actual cinematic-gold deck aesthetic (intentional —
 * that's what the deck will look like).
 */
export function StepPublish({ draft }: ComposerContext) {
  const slideCount = draft.outline?.length ?? 0;
  const hasDeckId = Boolean(draft.id);
  const canPublish = hasDeckId && slideCount > 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
      {/* Big preview */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#18d6a4]">
          05 — Ready to publish
        </div>
        <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
          Your deck is ready.
        </h2>
        <p className="mt-2 max-w-md text-sm text-white/60">
          Fullscreen on the first tap. Looks the same on a laptop, an iPad, or
          a phone. The share link opens straight into a presentation experience.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl">
          <CoverPreviewCard draft={draft} />
        </div>
      </div>

      {/* Actions sidebar */}
      <aside className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-md">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
          Share &amp; download
        </div>

        {canPublish ? (
          <>
            {/* Live link CTA */}
            <Link
              to={`/studio/decks/${draft.id}`}
              className={cn(
                'inline-flex items-center justify-between gap-2 rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.14em] transition-all',
                'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Open deck preview
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-white/55">
              Pick photos, hit Publish, and get a share link like{' '}
              <span className="font-mono text-white/75">realsight.app/r/XXX</span>.
            </p>

            {/* HTML download placeholder */}
            <button
              type="button"
              disabled
              className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left opacity-55 backdrop-blur-md"
            >
              <div>
                <div className="text-sm font-bold text-white">Download HTML</div>
                <div className="text-xs text-white/55">Single offline file — next build</div>
              </div>
              <Download className="h-4 w-4 text-white/45" />
            </button>

            {/* PDF download placeholder */}
            <button
              type="button"
              disabled
              className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left opacity-55 backdrop-blur-md"
            >
              <div>
                <div className="text-sm font-bold text-white">Download PDF</div>
                <div className="text-xs text-white/55">{slideCount} pages · 1280×800 — next build</div>
              </div>
              <Download className="h-4 w-4 text-white/45" />
            </button>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 text-center text-sm text-white/55 backdrop-blur-sm">
            <ExternalLink className="mx-auto mb-2 h-5 w-5 text-white/45" />
            Generate an outline in Step 3 first.
          </div>
        )}

        <div className="mt-2 border-t border-white/[0.08] pt-4 text-xs text-white/45">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Coming</div>
          <p className="mt-2 leading-relaxed">
            Deck analytics · presenter remote on phone · matching Instagram +
            LinkedIn social pack from this same deck.
          </p>
        </div>
      </aside>
    </div>
  );
}
