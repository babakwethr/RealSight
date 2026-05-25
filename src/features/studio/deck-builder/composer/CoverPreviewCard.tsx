import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DraftDeck } from './types';

interface CoverPreviewCardProps {
  draft: DraftDeck;
  /** Optional adviser name for the bottom-of-cover credit line. */
  presenter?: string;
  className?: string;
}

const AUDIENCE_EYEBROW: Record<string, string> = {
  end_user:   'Buyer Brief',
  investor:   'Investor Brief',
  both:       'Market Brief',
  team:       'Team Training',
  clients:    'Client Briefing',
  open_house: 'Open House',
};

/**
 * Scaled-down representation of the Cover slide using the Cinematic
 * Gold palette tokens. Renders inline (not the heavy Stage canvas) so
 * we can use it as a sticky preview pane on desktop without
 * remounting the full deck runtime.
 *
 * Updates live as the user types the topic / picks an audience.
 */
export function CoverPreviewCard({ draft, presenter, className }: CoverPreviewCardProps) {
  const audienceLabel =
    AUDIENCE_EYEBROW[draft.audience] ?? AUDIENCE_EYEBROW.investor;
  const topic = draft.topic.trim();
  // Heuristic: if the topic has a phrase like "X — Y" split the
  // headline so the second half can render in italic gold, matching
  // the real Cinematic Gold cover's accent treatment.
  const { head, tail } = splitForAccent(topic);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/[0.08]',
        'aspect-[16/10] w-full',
        className,
      )}
      style={{
        background:
          'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(28,22,12,0.92) 0%, rgba(10,10,11,1) 65%), linear-gradient(135deg, #1a1410 0%, #0a0a0b 60%, #060606 100%)',
      }}
      aria-label="Live preview of the cover slide"
    >
      {/* gold radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 50% 80%, rgba(212,175,55,0.18) 0%, transparent 55%)',
          filter: 'blur(16px)',
        }}
      />

      {/* top-left eyebrow */}
      <div className="absolute left-5 top-4 text-[9px] uppercase tracking-[0.3em] text-[#F5F1E8]/65">
        {audienceLabel}
      </div>

      {/* corner mark */}
      <div className="absolute right-5 top-4 flex h-5 w-5 items-center justify-center rounded-full border border-[#F5F1E8]/25 text-[10px] font-bold text-[#F5F1E8]/55">
        R
      </div>

      {/* central content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 text-[9px] uppercase tracking-[0.34em] text-[#D4AF37]">
          Resale &nbsp;·&nbsp; Rental &nbsp;·&nbsp; Strategy
        </div>
        {topic ? (
          <h1
            className="font-serif text-[clamp(20px,3.4vw,38px)] leading-[1.02] tracking-tight text-[#F5F1E8] drop-shadow-[0_2px_18px_rgba(0,0,0,0.7)]"
            style={{ maxWidth: '88%' }}
          >
            {head}
            {tail ? (
              <>
                <br />
                <span className="italic text-[#F4C97A]">{tail}</span>
              </>
            ) : null}
          </h1>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#F5F1E8]/35">
            <Sparkles className="h-6 w-6" />
            <p className="text-xs">Type a topic to see your cover</p>
          </div>
        )}
        <div className="mt-4 h-px w-14 bg-[#D4AF37]/65" />
      </div>

      {/* bottom credit row */}
      <div className="absolute inset-x-5 bottom-3 flex items-end justify-between text-[#F5F1E8]">
        <span className="font-serif text-sm tracking-wide">
          {presenter ?? 'Adviser'}
        </span>
        <span className="text-[8px] uppercase tracking-[0.28em] text-[#F5F1E8]/55">
          DLD · via RealSight
        </span>
      </div>
    </div>
  );
}

/**
 * Best-effort split — if the topic contains a long em-dash, dash, or
 * a colon, treat what follows as the italic accent. Otherwise just
 * use the whole thing as the head.
 */
function splitForAccent(topic: string): { head: string; tail: string | null } {
  if (!topic) return { head: '', tail: null };
  const m = topic.match(/^(.+?)\s*[—\-:·]\s*(.+)$/);
  if (m && m[1].length >= 4 && m[2].length >= 4) {
    return { head: m[1], tail: m[2] };
  }
  return { head: topic, tail: null };
}
