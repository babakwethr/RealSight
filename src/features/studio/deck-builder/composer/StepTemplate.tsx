/**
 * Step 2 — Pick template.
 *
 * Mobbin grounding:
 *   - Pitch template gallery — left rail of categories, right 3-col
 *     grid, byline under each card.
 *     https://mobbin.com/screens/b7d71395-ad7b-430e-9eed-4c96c629148c
 *   - Pitch template detail — clicking a template expands a slide-list
 *     drawer in place.
 *     https://mobbin.com/screens/894da59e-0546-44d5-ba67-2ebf6ceb8f91
 *   - Manus "Choose a template" — sticky generate bar at the bottom.
 *     https://mobbin.com/screens/f7f7cb28-6e75-4346-b5f1-797484d27e23
 *
 * Adapted to RealSight V3: dark navy + mint accent, glass surfaces. The
 * INNER preview frame of each card still renders in the template's
 * native aesthetic (gold/bone/ink etc.) — that's intentional, the
 * adviser is seeing what they're picking.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lightTap, isCapacitorNative } from '@/lib/capacitor';
import type { ComposerContext } from './types';

type CategoryId = 'all' | 'cinematic' | 'architectural' | 'editorial' | 'investor';

interface Category {
  id: CategoryId;
  label: string;
  count: number;
}

interface Template {
  slug: string;
  name: string;
  tagline: string;
  category: Exclude<CategoryId, 'all'>;
  live: boolean;
  recommended?: boolean;
  /** Short copy describing what slides this template ships with. */
  composition: string[];
  preview: () => React.ReactNode;
}

const TEMPLATES: Template[] = [
  {
    slug: 'cinematic-gold',
    name: 'Cinematic Gold',
    tagline: 'Warm ink + gold · golden-hour photography',
    category: 'cinematic',
    live: true,
    recommended: true,
    composition: [
      'Hero cover with Ken-Burns photo',
      'Why-now narrative + market trend chart',
      'Top areas (volume + yield) — DLD-backed',
      'Strategy tiers + adviser closing card',
    ],
    preview: () => <CinematicGoldPreview />,
  },
  {
    slug: 'architectural-bold',
    name: 'Architectural Bold',
    tagline: 'High contrast · sharp serif · off-plan launches',
    category: 'architectural',
    live: false,
    composition: [
      'Bold typographic cover',
      'Hard-cut slide transitions',
      'Coral accent on developer milestones',
    ],
    preview: () => <ArchitecturalBoldPreview />,
  },
  {
    slug: 'editorial-light',
    name: 'Editorial Light',
    tagline: 'Magazine-style · cream + warm · lifestyle',
    category: 'editorial',
    live: false,
    composition: [
      'Cream canvas, magazine layouts',
      'Tan accent · soft photo treatment',
      'Best for open houses + private clients',
    ],
    preview: () => <EditorialLightPreview />,
  },
  {
    slug: 'investor-brief',
    name: 'Investor Brief',
    tagline: 'Data-forward · LP / family-office pitches',
    category: 'investor',
    live: false,
    composition: [
      'Charts and stat tiles dominate',
      'Restrained motion, green/red signal palette',
      'Built for LPs and family offices',
    ],
    preview: () => <InvestorBriefPreview />,
  },
];

const CATEGORIES: Category[] = [
  { id: 'all',           label: 'All templates',    count: TEMPLATES.length },
  { id: 'cinematic',     label: 'Cinematic',        count: 1 },
  { id: 'architectural', label: 'Architectural',    count: 1 },
  { id: 'editorial',     label: 'Editorial',        count: 1 },
  { id: 'investor',      label: 'Data / Investor',  count: 1 },
];

export function StepTemplate({ draft, setDraft }: ComposerContext) {
  const [category, setCategory] = useState<CategoryId>('all');
  const [drawerSlug, setDrawerSlug] = useState<string | null>(null);

  // App Store builds hide not-yet-live templates (Apple rejects visible
  // "Coming soon" placeholders); the web app shows the full roadmap.
  const native = isCapacitorNative();
  const baseTemplates = native ? TEMPLATES.filter((t) => t.live) : TEMPLATES;
  const categories = CATEGORIES.map((c) => ({
    ...c,
    count:
      c.id === 'all'
        ? baseTemplates.length
        : baseTemplates.filter((t) => t.category === c.id).length,
  })).filter((c) => c.count > 0);

  const filtered =
    category === 'all' ? baseTemplates : baseTemplates.filter((t) => t.category === category);
  const drawerTemplate = baseTemplates.find((t) => t.slug === drawerSlug) ?? null;

  const pick = (slug: string) => {
    void lightTap();
    setDraft((d) => ({ ...d, template_slug: slug }));
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <div className="mb-7 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#18d6a4]/25 bg-[#18d6a4]/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#2effc0]">
            <Sparkles className="h-3 w-3" />
            Step 2 of 5 — Pick a look
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
            {baseTemplates.length === 1 ? 'Your deck style.' : 'Four design styles.'}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-white/55">
            Each template is a full visual system — palette, typography, photo
            treatment and motion. Switch any time before publishing.
          </p>
        </div>
        <div className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-white/35 sm:block">
          {filtered.length} template{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        {/* Left rail — Pitch category list */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
            {categories.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    void lightTap();
                    setCategory(c.id);
                  }}
                  className={cn(
                    'group inline-flex shrink-0 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                    'lg:w-full',
                    active
                      ? 'border-[#18d6a4]/40 bg-[#18d6a4]/10 text-white'
                      : 'border-white/[0.06] bg-white/[0.02] text-white/65 hover:border-white/[0.18] hover:text-white',
                  )}
                >
                  <span className="text-xs font-bold uppercase tracking-[0.14em] whitespace-nowrap">
                    {c.label}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[10px] font-black tabular-nums',
                      active ? 'bg-[#18d6a4]/25 text-[#2effc0]' : 'bg-white/[0.06] text-white/55',
                    )}
                  >
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <TemplateCard
              key={t.slug}
              template={t}
              selected={draft.template_slug === t.slug && t.live}
              onSelect={() => t.live && pick(t.slug)}
              onPeek={() => setDrawerSlug(t.slug)}
            />
          ))}
        </div>
      </div>

      {/* Detail drawer — Pitch's "Add slides" pattern */}
      <AnimatePresence>
        {drawerTemplate ? (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
              onClick={() => setDrawerSlug(null)}
            />
            <motion.div
              key="drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-white/[0.10] bg-[#0c0a1a]/95 backdrop-blur-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
            >
              <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2effc0]">
                      Template preview
                    </div>
                    <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                      {drawerTemplate.name}
                    </h2>
                    <p className="mt-1 text-sm text-white/55">{drawerTemplate.tagline}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerSlug(null)}
                    className="rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
                  <div className="relative aspect-[16/10]">{drawerTemplate.preview()}</div>
                </div>
                <h3 className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                  What you'll get
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {drawerTemplate.composition.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-white/80"
                    >
                      <span className="mt-1 inline-block h-1 w-1 rounded-full bg-[#18d6a4]" />
                      {c}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  {drawerTemplate.live ? (
                    <button
                      type="button"
                      onClick={() => {
                        pick(drawerTemplate.slug);
                        setDrawerSlug(null);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#2effc0] via-[#18d6a4] to-[#059669] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0a0814] transition-all hover:-translate-y-[1px]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Use this template
                    </button>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
                      Coming soon
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: Template;
  selected: boolean;
  onSelect: () => void;
  onPeek: () => void;
}

function TemplateCard({ template, selected, onSelect, onPeek }: TemplateCardProps) {
  const { name, tagline, live, recommended, preview } = template;
  return (
    <div
      role="button"
      tabIndex={live ? 0 : -1}
      aria-pressed={selected}
      onClick={live ? onSelect : onPeek}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (live) onSelect();
          else onPeek();
        }
      }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border text-left transition-all',
        'cursor-pointer',
        !live && 'opacity-80',
        selected ? 'border-[#18d6a4]/55 ring-2 ring-[#18d6a4]/30' : 'border-white/[0.08] hover:border-white/[0.20]',
      )}
    >
      {/* Inner preview area */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {preview()}

        {/* Top-right badges */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {recommended ? (
            <span className="rounded-full bg-[#18d6a4] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#0a0814]">
              Recommended
            </span>
          ) : null}
          {!live ? (
            <span className="relative overflow-hidden rounded-full bg-white/[0.10] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
              {/* Animated shimmer for "coming soon" */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full animate-[shimmer_2.4s_linear_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent"
                style={{ animationName: 'rs-shimmer' }}
              />
              Soon
            </span>
          ) : null}
        </div>

        {/* Hover overlay with "Preview" CTA */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPeek();
          }}
          className="absolute bottom-3 right-3 inline-flex translate-y-1 items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white opacity-0 backdrop-blur transition-all group-hover:translate-y-0 group-hover:opacity-100"
        >
          Preview
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Footer */}
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

      {/* Shimmer keyframes (component-scoped, safe to inline) */}
      <style>{`@keyframes rs-shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(200%) } }`}</style>
    </div>
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
