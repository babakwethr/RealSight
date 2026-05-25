import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Mic2, Users, User, UsersRound } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/capacitor';
import { StarterGallery } from './StarterGallery';
import type { ComposerContext, ComposerAudience } from './types';

interface StepBriefProps extends ComposerContext {}

const AUDIENCE_OPTIONS: Array<{
  value: ComposerAudience;
  label: string;
  sub: string;
  icon: typeof Users;
}> = [
  { value: 'end_user', label: 'End user',  sub: 'Buyers + occupiers',  icon: User },
  { value: 'investor', label: 'Investor',  sub: 'Yield-focused',       icon: Users },
  { value: 'both',     label: 'Both',      sub: 'Mixed audience',      icon: UsersRound },
];

/**
 * Step 1 — Brief. The minimum information required to generate an
 * outline: topic + audience. Voice notes are optional but encouraged.
 *
 * Mobile-first layout:
 *   - Sample-topics gallery scrolls horizontally on phone, grid on tablet+.
 *   - Topic textarea is the visual hero — auto-grows, large input target.
 *   - Audience picker = 3 large buttons stacked column on phone, row on tablet+.
 *   - "More options" disclosure for voice notes (collapsed by default).
 */
export function StepBrief({ draft, setDraft }: StepBriefProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="space-y-7">
      {/* Sample topics gallery (mobile = horizontal scroll, tablet+ = grid) */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <Label className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
            Pick a starter — or write your own
          </Label>
        </div>
        <StarterGallery
          selectedPrompt={draft.topic}
          onPick={({ prompt, audience }) => {
            setDraft((d) => ({
              ...d,
              topic: prompt,
              audience: (audience as ComposerAudience | null) ?? d.audience,
            }));
          }}
        />
      </section>

      {/* Topic */}
      <section>
        <Label htmlFor="topic" className="text-sm font-semibold text-white/85">
          What's the deck about?
        </Label>
        <p className="mb-2 mt-0.5 text-xs text-white/45">
          One sentence is plenty. The more specific, the sharper the result.
        </p>
        <Textarea
          id="topic"
          value={draft.topic}
          onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
          placeholder="e.g. Off-plan vs secondary in Dubai 2026 — what investors should choose now."
          maxLength={1024}
          rows={4}
          className="min-h-[120px] resize-none rounded-2xl border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-white/30 focus-visible:border-[#18d6a4]/45 focus-visible:ring-[#18d6a4]/25"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-white/40">
          <span>{draft.topic.trim().length < 8 ? 'At least 8 characters' : ' '}</span>
          <span>{draft.topic.length} / 1024</span>
        </div>
      </section>

      {/* Audience */}
      <section>
        <Label className="text-sm font-semibold text-white/85">Who's it for?</Label>
        <p className="mb-3 mt-0.5 text-xs text-white/45">
          We'll match the tone and the slides to this audience.
        </p>
        <div
          role="radiogroup"
          aria-label="Audience"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5"
        >
          {AUDIENCE_OPTIONS.map((opt) => {
            const active = draft.audience === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  void lightTap();
                  setDraft((d) => ({ ...d, audience: opt.value }));
                }}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all min-h-[56px]',
                  'sm:flex-col sm:items-start sm:gap-1.5 sm:py-4',
                  active
                    ? 'border-[#18d6a4]/45 bg-[#18d6a4]/10 ring-2 ring-[#18d6a4]/30'
                    : 'border-white/[0.08] bg-white/[0.04] hover:border-white/[0.18]',
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    active ? 'text-[#18d6a4]' : 'text-white/55',
                  )}
                />
                <div className="flex-1">
                  <div
                    className={cn(
                      'text-sm font-bold',
                      active ? 'text-white' : 'text-white/85',
                    )}
                  >
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-white/45">{opt.sub}</div>
                </div>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="ml-auto h-2 w-2 shrink-0 rounded-full bg-[#18d6a4] sm:absolute sm:right-3 sm:top-3 sm:ml-0"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* More options disclosure */}
      <section>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white/85 transition-colors hover:border-white/[0.16] sm:w-auto"
          aria-expanded={moreOpen}
        >
          <span className="inline-flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-[#18d6a4]/80" />
            Voice notes & instructions
            <span className="ml-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-white/55">
              optional
            </span>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-white/45 transition-transform',
              moreOpen && 'rotate-180',
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {moreOpen ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <Label htmlFor="voice-notes" className="text-xs font-semibold text-white/75">
                  Tone, angle, what to emphasise, what to avoid
                </Label>
                <Textarea
                  id="voice-notes"
                  value={draft.voice_notes}
                  onChange={(e) => setDraft((d) => ({ ...d, voice_notes: e.target.value }))}
                  placeholder="e.g. Lean on yield numbers. Mention the new metro line. Avoid the word 'opportunity'…"
                  maxLength={500}
                  rows={3}
                  className="mt-2 resize-none rounded-2xl border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-[#18d6a4]/45 focus-visible:ring-[#18d6a4]/25"
                />
                <div className="mt-1 text-right text-[11px] text-white/35">
                  {draft.voice_notes.length} / 500
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    </div>
  );
}
