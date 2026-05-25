import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/capacitor';
import type { ComposerContext } from './types';

/**
 * Step 2 — Pick template. 2×2 grid of design-system cards. Each
 * card shows a real-aspect (16:10) mini-render of the template
 * with its actual palette + typography, then a footer strip with
 * the template name + tagline. Matches the userflow.html reference.
 *
 * V1 ships Cinematic Gold live; the other 3 are "Coming" but still
 * visually rendered so the adviser can see the full family.
 */
export function StepTemplate({ draft, setDraft }: ComposerContext) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold">
        02 — Pick your look
      </div>
      <h2 className="mt-2 font-serif text-4xl leading-tight text-bone">
        Four design styles.
      </h2>
      <p className="mt-2 max-w-xl text-sm text-bone/60">
        Each template is a complete visual system — palette, photo treatment,
        typography and motion. You can switch at any time before publishing.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <CinematicGoldCard
          selected={draft.template_slug === 'cinematic-gold'}
          onSelect={() => {
            void lightTap();
            setDraft((d) => ({ ...d, template_slug: 'cinematic-gold' }));
          }}
        />
        <ArchitecturalBoldCard
          disabled
        />
        <EditorialLightCard
          disabled
        />
        <InvestorBriefCard
          disabled
        />
      </div>
    </div>
  );
}

// ── Template cards ──────────────────────────────────────────────

function CinematicGoldCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative overflow-hidden rounded-md border transition text-left',
        selected
          ? 'border-2 border-gold ring-2 ring-gold/30'
          : 'border border-bone/15 hover:border-bone/40',
      )}
    >
      {/* mini render */}
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.05) 45%, rgba(10,10,11,0.85) 100%), radial-gradient(ellipse at 70% 40%, #d4af37 0%, #8b6914 30%, #2a1c08 70%, #0a0a0b 100%)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.32em] text-gold">
              Resale · Rental · Strategy
            </div>
            <div className="mt-2 font-serif text-3xl text-bone">The Secondary</div>
            <div className="font-serif italic text-3xl text-gold-light">Market</div>
          </div>
        </div>
        <span className="absolute right-3 top-3 rounded-sm bg-gold px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-ink-900">
          Recommended
        </span>
      </div>
      <div className="flex items-center justify-between bg-ink-800/80 px-5 py-3">
        <div>
          <div className="font-serif text-lg text-bone">Cinematic Gold</div>
          <div className="text-xs text-bone/55">Warm ink + gold · golden-hour photos</div>
        </div>
        {selected ? (
          <span className="text-[11px] uppercase tracking-[0.18em] text-gold">Selected</span>
        ) : (
          <span className="text-[11px] uppercase tracking-[0.18em] text-bone/45">Tap to pick</span>
        )}
      </div>
    </button>
  );
}

function ArchitecturalBoldCard({ disabled }: { disabled: boolean }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-md border border-bone/15 text-left',
        disabled && 'opacity-65',
      )}
    >
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1c1f24 0%, #2c2f36 50%, #1a1d22 100%)' }}
      >
        <div className="absolute inset-0 flex items-end p-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-[#D26464]">
              New launch · 2026
            </div>
            <div className="mt-1 font-serif text-3xl font-semibold text-white">
              Bold structures.
            </div>
            <div className="font-serif text-3xl font-semibold text-[#D26464]">
              Bolder returns.
            </div>
          </div>
        </div>
        <span className="absolute right-3 top-3 rounded-sm bg-ink-700/85 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-bone/65">
          Soon
        </span>
      </div>
      <div className="bg-ink-800/80 px-5 py-3">
        <div className="font-serif text-lg text-bone">Architectural Bold</div>
        <div className="text-xs text-bone/55">High contrast · sharp serif · off-plan launches</div>
      </div>
    </div>
  );
}

function EditorialLightCard({ disabled }: { disabled: boolean }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-md border border-bone/15 text-left',
        disabled && 'opacity-65',
      )}
    >
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f7f1e6 0%, #e8d9bf 100%)' }}
      >
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-[#B8946C]">
              Open House · Spring
            </div>
            <div className="mt-1 font-serif text-3xl text-[#1A1A1A]">A garden flat</div>
            <div className="font-serif italic text-3xl text-[#B8946C]">in Jumeirah.</div>
          </div>
        </div>
        <span className="absolute right-3 top-3 rounded-sm bg-ink-900/75 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-bone/85">
          Soon
        </span>
      </div>
      <div className="bg-ink-800/80 px-5 py-3">
        <div className="font-serif text-lg text-bone">Editorial Light</div>
        <div className="text-xs text-bone/55">Magazine-style · cream + warm · lifestyle</div>
      </div>
    </div>
  );
}

function InvestorBriefCard({ disabled }: { disabled: boolean }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-md border border-bone/15 text-left',
        disabled && 'opacity-65',
      )}
    >
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0e1116 0%, #16202b 100%)' }}
      >
        <div className="absolute inset-0 p-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-bone/55">Q1 2026</div>
          <div className="mt-2 font-sans text-2xl font-semibold text-bone">+21.0% psqft</div>
          <div className="mt-1 text-xs text-bone/60">Dubai · 20 months</div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-sm bg-ink-700/60 p-2">
              <div className="text-[9px] text-bone/40">DEALS</div>
              <div className="font-sans text-sm font-semibold text-bone">343,906</div>
            </div>
            <div className="rounded-sm bg-ink-700/60 p-2">
              <div className="text-[9px] text-bone/40">VALUE</div>
              <div className="font-sans text-sm font-semibold text-bone">AED 1.09T</div>
            </div>
            <div className="rounded-sm bg-[#7FB069]/15 p-2">
              <div className="text-[9px] text-[#7FB069]">YoY</div>
              <div className="font-sans text-sm font-semibold text-[#7FB069]">+12.7%</div>
            </div>
          </div>
        </div>
        <span className="absolute right-3 top-3 rounded-sm bg-ink-700/85 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-bone/65">
          Soon
        </span>
      </div>
      <div className="bg-ink-800/80 px-5 py-3">
        <div className="font-serif text-lg text-bone">Investor Brief</div>
        <div className="text-xs text-bone/55">Data-forward · LP / family-office pitches</div>
      </div>
    </div>
  );
}
