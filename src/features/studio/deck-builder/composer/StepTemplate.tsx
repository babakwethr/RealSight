import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/capacitor';
import type { ComposerContext } from './types';

/**
 * Step 2 — Pick template.
 *
 * UX matches reference (2x2 mock-render cards). CI is RealSight V3:
 *   - Card OUTER chrome (border, footer strip): glass, mint accent
 *     on selection.
 *   - Card INNER (16:10 preview): the actual deck output's aesthetic
 *     — gold/ink/serif for Cinematic Gold, etc. That's intentional:
 *     the preview is a faithful mini-render of what the published
 *     deck will look like.
 */
export function StepTemplate({ draft, setDraft }: ComposerContext) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#18d6a4]">
        02 — Pick your look
      </div>
      <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
        Four design styles.
      </h2>
      <p className="mt-2 max-w-xl text-sm text-white/60">
        Each template is a complete visual system — palette, photo treatment,
        typography and motion. You can switch at any time before publishing.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TemplateCard
          slug="cinematic-gold"
          name="Cinematic Gold"
          tagline="Warm ink + gold · golden-hour photos"
          live
          recommended
          selected={draft.template_slug === 'cinematic-gold'}
          onSelect={() => {
            void lightTap();
            setDraft((d) => ({ ...d, template_slug: 'cinematic-gold' }));
          }}
          preview={<CinematicGoldPreview />}
        />
        <TemplateCard
          slug="architectural-bold"
          name="Architectural Bold"
          tagline="High contrast · sharp serif · off-plan launches"
          live={false}
          preview={<ArchitecturalBoldPreview />}
        />
        <TemplateCard
          slug="editorial-light"
          name="Editorial Light"
          tagline="Magazine-style · cream + warm · lifestyle"
          live={false}
          preview={<EditorialLightPreview />}
        />
        <TemplateCard
          slug="investor-brief"
          name="Investor Brief"
          tagline="Data-forward · LP / family-office pitches"
          live={false}
          preview={<InvestorBriefPreview />}
        />
      </div>
    </div>
  );
}

// ─── Card wrapper (RealSight CI) ───────────────────────────────

interface TemplateCardProps {
  slug: string;
  name: string;
  tagline: string;
  live: boolean;
  recommended?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  preview: React.ReactNode;
}

function TemplateCard({
  name,
  tagline,
  live,
  recommended,
  selected,
  onSelect,
  preview,
}: TemplateCardProps) {
  const interactive = live && !!onSelect;
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={interactive ? onSelect : undefined}
      aria-pressed={selected}
      className={cn(
        'group relative overflow-hidden rounded-2xl border text-left transition-all',
        !live && 'opacity-65 cursor-not-allowed',
        selected && live && 'border-[#18d6a4]/55 ring-2 ring-[#18d6a4]/30',
        !selected && live && 'border-white/[0.08] hover:border-white/[0.20]',
        !live && 'border-white/[0.08]',
      )}
    >
      {/* Inner preview area = actual deck aesthetic. */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {preview}
        {recommended ? (
          <span className="absolute right-3 top-3 rounded-full bg-[#18d6a4] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#0a0814]">
            Recommended
          </span>
        ) : !live ? (
          <span className="absolute right-3 top-3 rounded-full bg-white/[0.08] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/65 backdrop-blur">
            Soon
          </span>
        ) : null}
      </div>
      {/* Footer = RealSight glass strip. */}
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.03] px-4 py-3 backdrop-blur-md">
        <div className="min-w-0">
          <div className="text-base font-bold text-white">{name}</div>
          <div className="truncate text-xs text-white/55">{tagline}</div>
        </div>
        {selected && live ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#18d6a4]/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#2effc0]">
            <Check className="h-3 w-3" />
            Selected
          </span>
        ) : null}
      </div>
    </button>
  );
}

// ─── Per-template mini renderings (deck aesthetics, intentional) ──

function CinematicGoldPreview() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.05) 45%, rgba(10,10,11,0.85) 100%), radial-gradient(ellipse at 70% 40%, #d4af37 0%, #8b6914 30%, #2a1c08 70%, #0a0a0b 100%)',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.32em] text-[#D4AF37]">
            Resale · Rental · Strategy
          </div>
          <div className="mt-2 font-serif text-3xl text-[#F5F1E8]">The Secondary</div>
          <div className="font-serif italic text-3xl text-[#F4C97A]">Market</div>
        </div>
      </div>
    </div>
  );
}

function ArchitecturalBoldPreview() {
  return (
    <div
      className="absolute inset-0"
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
    </div>
  );
}

function EditorialLightPreview() {
  return (
    <div
      className="absolute inset-0"
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
    </div>
  );
}

function InvestorBriefPreview() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: 'linear-gradient(135deg, #0e1116 0%, #16202b 100%)' }}
    >
      <div className="absolute inset-0 p-5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/55">Q1 2026</div>
        <div className="mt-2 text-2xl font-bold text-white">+21.0% psqft</div>
        <div className="mt-1 text-xs text-white/60">Dubai · 20 months</div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-md bg-white/[0.06] p-2">
            <div className="text-[9px] text-white/40">DEALS</div>
            <div className="text-sm font-bold text-white">343,906</div>
          </div>
          <div className="rounded-md bg-white/[0.06] p-2">
            <div className="text-[9px] text-white/40">VALUE</div>
            <div className="text-sm font-bold text-white">AED 1.09T</div>
          </div>
          <div className="rounded-md bg-[#7FB069]/15 p-2">
            <div className="text-[9px] text-[#7FB069]">YoY</div>
            <div className="text-sm font-bold text-[#7FB069]">+12.7%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
