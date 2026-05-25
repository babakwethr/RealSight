import { Check, Sparkles, Layers, Sun, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/capacitor';
import type { ComposerContext } from './types';

interface TemplateCard {
  slug: string;
  name: string;
  tagline: string;
  best_for: string;
  swatches: string[];
  icon: typeof Sparkles;
  status: 'live' | 'coming';
}

const TEMPLATES: TemplateCard[] = [
  {
    slug: 'cinematic-gold',
    name: 'Cinematic Gold',
    tagline: 'Warm golden-hour photography, slow Ken Burns motion.',
    best_for: 'Team + client briefs',
    swatches: ['#0A0A0B', '#D4AF37', '#F5F1E8'],
    icon: Sparkles,
    status: 'live',
  },
  {
    slug: 'investor-brief',
    name: 'Investor Brief',
    tagline: 'Restrained, chart-first, green/red signals.',
    best_for: 'LP + family-office briefs',
    swatches: ['#0E1116', '#7FB069', '#E8E8E8'],
    icon: Briefcase,
    status: 'coming',
  },
  {
    slug: 'architectural-bold',
    name: 'Architectural Bold',
    tagline: 'High-contrast facades, hard cuts, parallax.',
    best_for: 'Off-plan launches',
    swatches: ['#101010', '#FAFAFA', '#888'],
    icon: Layers,
    status: 'coming',
  },
  {
    slug: 'editorial-light',
    name: 'Editorial Light',
    tagline: 'Bright interiors, lifestyle, generous whitespace.',
    best_for: 'Open houses',
    swatches: ['#FAF7F1', '#1A1A1A', '#B8946C'],
    icon: Sun,
    status: 'coming',
  },
];

/**
 * Step 3 — Template. 2×2 grid of cards. Only Cinematic Gold is live
 * in V1; the other three render as "Coming soon" so the flow still
 * lets the adviser see the full template family.
 *
 * Mobile-first: single column at xs, 2-up at sm+, accordion of
 * swatches under each card.
 */
export function StepTemplate({ draft, setDraft }: ComposerContext) {
  return (
    <div className="space-y-7">
      <header>
        <h2 className="text-lg font-bold text-white sm:text-xl">
          Pick a style
        </h2>
        <p className="mt-1.5 text-sm text-white/55">
          The slide content stays the same — the template changes the
          colours, type, and motion. You can switch templates later
          without re-generating.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TEMPLATES.map((t) => {
          const active = draft.template_slug === t.slug;
          const disabled = t.status === 'coming';
          const Icon = t.icon;
          return (
            <button
              key={t.slug}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                void lightTap();
                setDraft((d) => ({ ...d, template_slug: t.slug }));
              }}
              className={cn(
                'group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-all',
                disabled && 'cursor-not-allowed opacity-55',
                active
                  ? 'border-[#18d6a4]/45 bg-[#18d6a4]/[0.08] ring-2 ring-[#18d6a4]/30'
                  : 'border-white/[0.08] bg-white/[0.04] hover:border-white/[0.18] hover:bg-white/[0.06]',
              )}
              aria-pressed={active}
            >
              {/* Swatch strip */}
              <div className="flex gap-1.5">
                {t.swatches.map((c) => (
                  <span
                    key={c}
                    className="h-7 flex-1 rounded-md border border-white/[0.08]"
                    style={{ background: c }}
                    aria-hidden="true"
                  />
                ))}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full',
                      active ? 'bg-[#18d6a4]/20 text-[#18d6a4]' : 'bg-white/[0.06] text-white/70',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-base font-bold text-white">{t.name}</h3>
                </div>
                {active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#18d6a4]/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#18d6a4]">
                    <Check className="h-3 w-3" />
                    Selected
                  </span>
                ) : disabled ? (
                  <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Soon
                  </span>
                ) : null}
              </div>

              <p className="text-xs leading-relaxed text-white/65">{t.tagline}</p>
              <div className="mt-auto text-[11px] uppercase tracking-[0.14em] text-white/40">
                Best for {t.best_for}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
