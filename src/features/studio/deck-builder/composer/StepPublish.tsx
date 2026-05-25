import { Sparkles, ExternalLink, ArrowRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ComposerContext } from './types';

/**
 * Step 5 — Publish. Last step of the wizard. In V1 this is a
 * gateway: shows a "Preview your deck" CTA that routes to
 * `/studio/decks/:id` where the full fullscreen preview + actual
 * publish flow lives. (Pulling the publish action into the wizard
 * itself would push the wizard's bottom CTA bar into ambiguous
 * territory — the standalone preview surface is the right home
 * for Publish + PDF + Share-link actions.)
 *
 * Mobile-first: single big CTA centred in the viewport. No
 * surprises, no extra options to scroll past.
 */
export function StepPublish({ draft }: ComposerContext) {
  const slideCount = draft.outline?.length ?? 0;
  const hasDeckId = Boolean(draft.id);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 text-center sm:p-10">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2effc0]/30 via-[#18d6a4]/20 to-transparent">
        <Sparkles className="h-7 w-7 text-[#18d6a4]" />
      </div>
      <h2 className="mb-1.5 text-xl font-bold text-white sm:text-2xl">
        Your deck is ready.
      </h2>
      <p className="mb-7 max-w-[460px] text-sm leading-relaxed text-white/55">
        {slideCount > 0
          ? `${slideCount} slides, every number backed by a citation. Open the preview to pick your photos, look it over, then publish a share link.`
          : 'Generate an outline first, then come back to publish.'}
      </p>

      {hasDeckId && slideCount > 0 ? (
        <div className="flex w-full max-w-[380px] flex-col gap-2.5">
          <Link
            to={`/studio/decks/${draft.id}`}
            className={cn(
              'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition-all',
              'bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] text-[#0a0814] hover:-translate-y-[1px]',
            )}
          >
            <Eye className="h-4 w-4" />
            Open the deck preview
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/40">
            Pick photos, then publish a public share link
          </p>
        </div>
      ) : (
        <Button
          type="button"
          disabled
          className="h-12 rounded-full px-6 text-sm font-black opacity-40"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Generate an outline first
        </Button>
      )}
    </div>
  );
}
