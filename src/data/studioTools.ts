/**
 * studioTools — static config for the Studio card grid.
 *
 * Each entry maps to one card on `/studio`. Cards flip from `coming` to
 * `live` as Phase 2 tools ship. The COMING cards double as feature-demand
 * signals: clicking one captures notify-me intent into localStorage (v1)
 * which the founder can later mine for build prioritisation.
 *
 * Gradient variants reference `HeroMetricCard`'s palette so the visual
 * language stays consistent with the rest of the app. We deliberately
 * use cinematic gradients (not photo backgrounds) for v1 — once the
 * founder upgrades the Higgsfield plan, we generate per-tool photo-real
 * cinematic Dubai backgrounds and swap them in by adding a `bgImage`
 * field to each tool below.
 *
 * Keep this list ordered by launch priority: live tools first, then
 * coming tools by month.
 */

import {
  Sparkles,
  Layers,
  Video,
  Users,
  Mic,
  PenLine,
  MessageSquare,
  QrCode,
  Handshake,
  Flame,
  type LucideIcon,
} from 'lucide-react';

export type StudioToolStatus = 'live' | 'beta' | 'coming';
export type StudioToolVariant =
  | 'mint'
  | 'blue'
  | 'cyan'
  | 'purple'
  | 'amber'
  | 'sunset'
  | 'rose'
  | 'night';

export interface StudioTool {
  /** Slug for the route + localStorage key. Lowercase, hyphenated. */
  slug: string;
  /** Card title (Title Case, max ~3 words). */
  name: string;
  /** Single-sentence tagline shown under the name on the card. */
  tagline: string;
  /** Status drives chip color + click behaviour. */
  status: StudioToolStatus;
  /** Used on COMING cards: month label e.g. "Coming June". */
  comingLabel?: string;
  /** Live cards link here. Coming cards open the notify-me modal. */
  route?: string;
  /** Visual identity — picks the gradient + accent colour. */
  variant: StudioToolVariant;
  /** Icon shown in the orb on the card. */
  icon: LucideIcon;
  /**
   * Optional photo-real background. Reserved for future Higgsfield-
   * generated images stored under `public/studio/`. When set, replaces
   * the gradient with the image (gradient stays as overlay).
   */
  bgImage?: string;
}

export const STUDIO_TOOLS: StudioTool[] = [
  {
    slug: 'presentation',
    name: 'Presentation Generator',
    tagline: 'Turn any topic into a 5-slide branded PDF in 60 seconds.',
    status: 'coming',
    comingLabel: 'Coming May',
    variant: 'mint',
    icon: Sparkles,
  },
  {
    slug: 'social-pack',
    name: 'Social Media Pack',
    tagline: 'IG, LinkedIn, WhatsApp posts — branded, all in one click.',
    status: 'coming',
    comingLabel: 'Coming June',
    variant: 'cyan',
    icon: Layers,
  },
  {
    slug: 'video-presentation',
    name: 'Video Presentation',
    tagline: 'Cinematic video version of any deal — share to socials + clients.',
    status: 'coming',
    comingLabel: 'Coming July',
    variant: 'purple',
    icon: Video,
  },
  {
    slug: 'buyer-intent',
    name: 'Buyer Matcher',
    tagline: 'Describe a buyer in plain English — get the 5 best properties.',
    status: 'coming',
    comingLabel: 'Coming Aug',
    variant: 'blue',
    icon: Users,
  },
  {
    slug: 'market-briefing',
    name: 'Daily Briefing Audio',
    tagline: '90-second daily Dubai market podcast — share to WhatsApp Status.',
    status: 'coming',
    comingLabel: 'Coming Sept',
    variant: 'amber',
    icon: Mic,
  },
  {
    slug: 'listing-writer',
    name: 'Listing Writer',
    tagline: 'AI listing descriptions in EN / AR / RU / CN / FR — minutes saved.',
    status: 'coming',
    comingLabel: 'Coming Oct',
    variant: 'sunset',
    icon: PenLine,
  },
  {
    slug: 'whatsapp-assistant',
    name: 'WhatsApp Assistant',
    tagline: 'AI fields routine inbound DMs so you focus on real questions.',
    status: 'coming',
    comingLabel: 'Coming Nov',
    variant: 'rose',
    icon: MessageSquare,
  },
  {
    slug: 'open-house',
    name: 'Open House Microsite',
    tagline: 'Branded landing page + printable QR sticker for every viewing.',
    status: 'coming',
    comingLabel: 'Coming Dec',
    variant: 'night',
    icon: QrCode,
  },
  {
    slug: 'negotiation-coach',
    name: 'Negotiation Coach',
    tagline: 'Anchor, walk-away, and a draft message — for every live deal.',
    status: 'coming',
    comingLabel: 'Coming 2027',
    variant: 'mint',
    icon: Handshake,
  },
  {
    slug: 'lead-heat',
    name: 'Lead Heat Score',
    tagline: 'See which leads are about to close, ranked 0–100.',
    status: 'coming',
    comingLabel: 'Coming 2027',
    variant: 'amber',
    icon: Flame,
  },
];

/** Returns counts for the "X live · Y coming" hero chip. */
export function studioToolCounts(): { live: number; coming: number } {
  const live = STUDIO_TOOLS.filter(t => t.status === 'live' || t.status === 'beta').length;
  const coming = STUDIO_TOOLS.filter(t => t.status === 'coming').length;
  return { live, coming };
}
