/**
 * Per-template theme tokens.
 *
 * Each template defines a complete CSS-variable theme that the deck
 * renderer applies to the `<div class="deck-html-stage">` wrapper.
 * AI-generated slide HTML uses only these variables for colours and
 * fonts, so the same HTML reads differently per template without
 * the LLM needing to know about palettes.
 *
 * The `theme.accent_variant` (emitted optionally by the LLM in the
 * deck's theme block) lets the AI shift the accent within the
 * template family — e.g. a beachfront deck in Cinematic Gold gets
 * `warm`, a cooling-market deck gets `cool`, a launch-event deck
 * gets `amber`.
 */

export type TemplateSlug =
  | 'cinematic-gold'
  | 'architectural-bold'
  | 'editorial-light'
  | 'investor-brief';

export type AccentVariant = 'default' | 'warm' | 'cool' | 'amber' | 'ember';

export interface ThemeTokens {
  /** Background colour of the slide canvas. */
  bg: string;
  /** Foreground text colour. */
  fg: string;
  /** Accent (primary brand colour). */
  accent: string;
  /** Lighter accent variant for italic highlights. */
  accent_light: string;
  /** Negative / down-trend signal (red-ish in most themes). */
  accent_negative: string;
  /** Positive / up-trend signal (green-ish in most themes). */
  accent_positive: string;
  /** Muted secondary text. */
  muted: string;
  /** Hairline divider colour. */
  divider: string;
  /** Strong scrim for photo legibility (top/bottom bands). */
  scrim_strong: string;
  /** Soft scrim for atmosphere. */
  scrim_soft: string;
  /** Display / serif font stack for headlines. */
  font_serif: string;
  /** Body / sans font stack. */
  font_sans: string;
}

/** Base palettes per template. */
const BASE_THEMES: Record<TemplateSlug, ThemeTokens> = {
  'cinematic-gold': {
    bg: '#0A0A0B',
    fg: '#F5F1E8',
    accent: '#D4AF37',
    accent_light: '#F4C97A',
    accent_negative: '#D26464',
    accent_positive: '#7FB069',
    muted: 'rgba(245,241,232,0.55)',
    divider: 'rgba(245,241,232,0.15)',
    scrim_strong: 'rgba(10,10,11,0.85)',
    scrim_soft: 'rgba(10,10,11,0.45)',
    font_serif: '"Cormorant Garamond", Georgia, serif',
    font_sans: 'Inter, system-ui, sans-serif',
  },
  'architectural-bold': {
    bg: '#101010',
    fg: '#FAFAFA',
    accent: '#D26464',
    accent_light: '#E89090',
    accent_negative: '#A03333',
    accent_positive: '#7FB069',
    muted: 'rgba(250,250,250,0.55)',
    divider: 'rgba(250,250,250,0.15)',
    scrim_strong: 'rgba(16,16,16,0.85)',
    scrim_soft: 'rgba(16,16,16,0.45)',
    font_serif: '"Playfair Display", Georgia, serif',
    font_sans: 'Inter, system-ui, sans-serif',
  },
  'editorial-light': {
    bg: '#FAF7F1',
    fg: '#1A1A1A',
    accent: '#B8946C',
    accent_light: '#D4B68B',
    accent_negative: '#A03333',
    accent_positive: '#5F8A4F',
    muted: 'rgba(26,26,26,0.55)',
    divider: 'rgba(26,26,26,0.15)',
    scrim_strong: 'rgba(255,255,255,0.85)',
    scrim_soft: 'rgba(255,255,255,0.45)',
    font_serif: '"Cormorant Garamond", Georgia, serif',
    font_sans: 'Inter, system-ui, sans-serif',
  },
  'investor-brief': {
    bg: '#0E1116',
    fg: '#E8E8E8',
    accent: '#7FB069',
    accent_light: '#A8CB91',
    accent_negative: '#D26464',
    accent_positive: '#7FB069',
    muted: 'rgba(232,232,232,0.55)',
    divider: 'rgba(232,232,232,0.15)',
    scrim_strong: 'rgba(14,17,22,0.85)',
    scrim_soft: 'rgba(14,17,22,0.45)',
    font_serif: 'Inter, system-ui, sans-serif',
    font_sans: 'Inter, system-ui, sans-serif',
  },
};

/** Accent-variant overrides that the AI can apply per deck. */
const ACCENT_VARIANTS: Record<TemplateSlug, Partial<Record<AccentVariant, Partial<ThemeTokens>>>> = {
  'cinematic-gold': {
    warm:  { accent: '#E5A23B', accent_light: '#F8D281' },           // warmer / sunset
    cool:  { accent: '#B89342', accent_light: '#D4B86F' },           // cooler bronze
    amber: { accent: '#FFB400', accent_light: '#FFD56B' },           // bright amber
    ember: { accent: '#C7842D', accent_light: '#E2A256' },           // ember orange
  },
  'architectural-bold': {
    warm:  { accent: '#E07E7E' },
    cool:  { accent: '#B85050' },
  },
  'editorial-light': {
    warm:  { accent: '#C9A372' },
    cool:  { accent: '#A77D54' },
  },
  'investor-brief': {
    warm:  { accent_negative: '#E89090' },
    cool:  { accent: '#5F8A4F' },
  },
};

export function resolveTheme(
  templateSlug: string,
  accentVariant?: string | null,
): ThemeTokens {
  const slug = (templateSlug as TemplateSlug) ?? 'cinematic-gold';
  const base = BASE_THEMES[slug] ?? BASE_THEMES['cinematic-gold'];
  const variant = (accentVariant ?? 'default') as AccentVariant;
  const override = ACCENT_VARIANTS[slug]?.[variant] ?? {};
  return { ...base, ...override };
}

/**
 * Build a CSS-vars style object the renderer attaches to the deck
 * wrapper. Each variable is what AI-generated slide HTML reads via
 * `var(--deck-bg)`, `var(--deck-accent)`, etc.
 */
export function buildThemeStyle(theme: ThemeTokens): React.CSSProperties {
  return {
    ['--deck-bg' as never]:               theme.bg,
    ['--deck-fg' as never]:               theme.fg,
    ['--deck-accent' as never]:           theme.accent,
    ['--deck-accent-light' as never]:     theme.accent_light,
    ['--deck-accent-negative' as never]:  theme.accent_negative,
    ['--deck-accent-positive' as never]:  theme.accent_positive,
    ['--deck-muted' as never]:            theme.muted,
    ['--deck-divider' as never]:          theme.divider,
    ['--deck-scrim-strong' as never]:     theme.scrim_strong,
    ['--deck-scrim-soft' as never]:       theme.scrim_soft,
    ['--deck-font-serif' as never]:       theme.font_serif,
    ['--deck-font-sans' as never]:        theme.font_sans,
    color:                                 theme.fg,
    background:                            theme.bg,
    fontFamily:                            theme.font_sans,
  };
}

/** Stage-friendly text label for the resolved theme, used in tooltips
 *  and the composer's "Pick template" affordance. */
export function describeTheme(slug: string, variant?: string | null): string {
  const variantLabel = variant && variant !== 'default' ? ` · ${variant}` : '';
  const base: Record<TemplateSlug, string> = {
    'cinematic-gold':     'Cinematic Gold',
    'architectural-bold': 'Architectural Bold',
    'editorial-light':    'Editorial Light',
    'investor-brief':     'Investor Brief',
  };
  return `${base[(slug as TemplateSlug) ?? 'cinematic-gold']}${variantLabel}`;
}
