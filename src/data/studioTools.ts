/**
 * studioTools — static config for the Studio card grid.
 *
 * Founder direction (2 May 2026, v3): four tools only — Presentation,
 * Social Pack, Video Studio, Buyer Matcher. No "coming soon" filler.
 * Each card shows a custom on-brand illustration (rendered by
 * `StudioIllustrations.tsx`) rather than a Dubai photo, so the visual
 * communicates what the tool does. Visual language is the existing V3
 * design system (mint #18D6A4, glassmorphism, Inter type).
 */

import {
  Sparkles,
  Layers,
  Video,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type StudioToolStatus = 'live' | 'beta' | 'coming';
/** Discriminator that picks which illustration renders inside the card. */
export type StudioIllustrationId = 'presentation' | 'social' | 'video' | 'matcher';
/** Tonal accent — used by the illustration + card border + chip. */
export type StudioTone = 'mint' | 'gold' | 'violet' | 'cobalt';

export interface StudioTool {
  /** Slug for the route + localStorage notify-me key. */
  slug: string;
  /** Card title (Title Case, max ~3 words). */
  name: string;
  /** Single-sentence tagline shown on the card. */
  tagline: string;
  /** Status drives chip color + click behaviour. */
  status: StudioToolStatus;
  /** "May 2026" / "June 2026" — only meaningful when status is `coming`. */
  comingLabel?: string;
  /** Live cards link here. Coming cards open the notify-me modal. */
  route?: string;
  /** Picks the inline illustration. */
  illustration: StudioIllustrationId;
  /** Tonal accent for chip + ring + illustration accent. */
  tone: StudioTone;
  /** Lucide icon used in the meta strip. */
  icon: LucideIcon;
}

/** The four Phase-2 Adviser Studio tools — order = Studio launch order. */
export const STUDIO_TOOLS: StudioTool[] = [
  {
    slug: 'presentation',
    name: 'Presentation',
    tagline: 'Any topic — a five-page branded presentation, ready to send.',
    status: 'beta',
    comingLabel: 'Beta',
    route: '/studio/presentation',
    illustration: 'presentation',
    tone: 'mint',
    icon: Sparkles,
  },
  {
    slug: 'social-pack',
    name: 'Social Pack',
    tagline: 'IG, LinkedIn, WhatsApp — branded, in one click.',
    status: 'coming',
    comingLabel: 'June 2026',
    illustration: 'social',
    tone: 'gold',
    icon: Layers,
  },
  {
    slug: 'video-presentation',
    name: 'Video Studio',
    tagline: 'Cinematic deal videos for socials and clients.',
    status: 'coming',
    comingLabel: 'July 2026',
    illustration: 'video',
    tone: 'violet',
    icon: Video,
  },
  {
    slug: 'buyer-intent',
    name: 'Buyer Matcher',
    tagline: 'Describe a buyer in English — get the five best fits.',
    status: 'coming',
    comingLabel: 'August 2026',
    illustration: 'matcher',
    tone: 'cobalt',
    icon: Users,
  },
];

/** Tone palette — single source for accent colours used across the card. */
export const TONE_PALETTE: Record<StudioTone, {
  accent: string;
  ring: string;
  chipBg: string;
  chipFg: string;
  chipBorder: string;
}> = {
  mint:   { accent: '#18D6A4', ring: 'rgba(24,214,164,0.45)',  chipBg: 'rgba(24,214,164,0.12)',  chipFg: '#7BFFD6', chipBorder: 'rgba(24,214,164,0.35)' },
  gold:   { accent: '#C9A84C', ring: 'rgba(201,168,76,0.45)',  chipBg: 'rgba(201,168,76,0.14)',  chipFg: '#E8CB7E', chipBorder: 'rgba(201,168,76,0.35)' },
  violet: { accent: '#9D7BFF', ring: 'rgba(157,123,255,0.45)', chipBg: 'rgba(157,123,255,0.14)', chipFg: '#C8B4FF', chipBorder: 'rgba(157,123,255,0.35)' },
  cobalt: { accent: '#4AA8FF', ring: 'rgba(74,168,255,0.45)',  chipBg: 'rgba(74,168,255,0.14)',  chipFg: '#A5CFFF', chipBorder: 'rgba(74,168,255,0.35)' },
};

/** Hero counts — kept for the optional "X live · Y coming" badge. */
export function studioToolCounts(): { live: number; coming: number } {
  const live = STUDIO_TOOLS.filter(t => t.status === 'live' || t.status === 'beta').length;
  const coming = STUDIO_TOOLS.filter(t => t.status === 'coming').length;
  return { live, coming };
}
