/**
 * studioTools — static config for the Studio card grid.
 *
 * Each entry maps to one card on `/studio`. Cards flip from `coming` to
 * `live` as Phase 2 tools ship. The COMING cards double as feature-demand
 * signals: clicking one captures notify-me intent into localStorage (v1)
 * which the founder can later mine for build prioritisation.
 *
 * Design language: editorial atelier (2 May 2026 redesign). Each tool
 * gets a numbered slot (01–10), a cinematic photo, a tonal palette,
 * and an editorial layout. Photo backgrounds default to existing Dubai
 * skyline/marina shots; once Higgsfield credits land we swap in
 * tool-specific generated imagery via the `bgImage` field.
 *
 * `span` controls grid weight: 'wide' takes 2 columns (hero card),
 * 'tall' takes 1 column but 2 rows, 'standard' is 1×1. Layout assigns
 * the most prominent slots to the soonest-shipping tools.
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
/** Tonal palette — not just a colour, a feel. Drives card accent + chip. */
export type StudioToolTone =
  | 'mint'      // primary: Presentation
  | 'gold'      // luxury: Social Pack
  | 'violet'    // cinematic: Video
  | 'cobalt'    // analytical: Buyer Matcher
  | 'amber'     // warm: Briefing Audio
  | 'rose'      // expressive: Listing Writer
  | 'jade'      // conversational: WhatsApp
  | 'silver'    // utilitarian: Open House
  | 'crimson'   // strategic: Negotiation
  | 'ember';    // intense: Lead Heat
/** Grid weight — drives the editorial layout. */
export type StudioToolSpan = 'wide' | 'standard';

export interface StudioTool {
  /** Slot number for the editorial sequence (01..10). */
  number: string;
  /** Slug for the route + localStorage key. Lowercase, hyphenated. */
  slug: string;
  /** Card title (Title Case, max ~3 words). */
  name: string;
  /** Single-sentence tagline shown on the card. */
  tagline: string;
  /** Status drives chip color + click behaviour. */
  status: StudioToolStatus;
  /** Used on COMING cards: month label e.g. "May 2026". */
  comingLabel?: string;
  /** Live cards link here. Coming cards open the notify-me modal. */
  route?: string;
  /** Tonal palette + accent. */
  tone: StudioToolTone;
  /** Icon shown in the meta strip on the card. */
  icon: LucideIcon;
  /** Grid weight in the editorial layout. */
  span: StudioToolSpan;
  /**
   * Photo background. v1 uses existing Dubai skyline/marina shots from
   * the PDF generators reused across cards. Once founder upgrades the
   * Higgsfield plan we generate tool-specific cinematic stills and
   * swap them in here — config-only change, no code touch.
   */
  bgImage?: string;
  /**
   * Optional alt photo crop offset — useful when reusing the same
   * photo across cards so each looks distinct.
   */
  bgPosition?: string;
}

export const STUDIO_TOOLS: StudioTool[] = [
  {
    number: '01',
    slug: 'presentation',
    name: 'Presentation',
    tagline: 'Any topic — five branded slides, sixty seconds.',
    status: 'coming',
    comingLabel: 'May 2026',
    tone: 'mint',
    icon: Sparkles,
    span: 'wide',
    bgImage: '/pdf-bg/dubai-skyline.jpg',
    bgPosition: 'center 30%',
  },
  {
    number: '02',
    slug: 'social-pack',
    name: 'Social Pack',
    tagline: 'IG, LinkedIn, WhatsApp — branded, in one click.',
    status: 'coming',
    comingLabel: 'June 2026',
    tone: 'gold',
    icon: Layers,
    span: 'standard',
    bgImage: '/pdf-bg/dubai-marina.jpg',
    bgPosition: 'center 60%',
  },
  {
    number: '03',
    slug: 'video-presentation',
    name: 'Video Studio',
    tagline: 'Cinematic deal videos for socials and clients.',
    status: 'coming',
    comingLabel: 'July 2026',
    tone: 'violet',
    icon: Video,
    span: 'standard',
    bgImage: '/pdf-bg/dubai-skyline.jpg',
    bgPosition: 'right 40%',
  },
  {
    number: '04',
    slug: 'buyer-intent',
    name: 'Buyer Matcher',
    tagline: 'Describe a buyer in English — get the five best fits.',
    status: 'coming',
    comingLabel: 'August 2026',
    tone: 'cobalt',
    icon: Users,
    span: 'wide',
    bgImage: '/pdf-bg/dubai-marina.jpg',
    bgPosition: 'center 40%',
  },
  {
    number: '05',
    slug: 'market-briefing',
    name: 'Daily Briefing',
    tagline: 'Ninety-second Dubai market podcast — every morning.',
    status: 'coming',
    comingLabel: 'September 2026',
    tone: 'amber',
    icon: Mic,
    span: 'standard',
    bgImage: '/pdf-bg/dubai-skyline.jpg',
    bgPosition: 'left 20%',
  },
  {
    number: '06',
    slug: 'listing-writer',
    name: 'Listing Writer',
    tagline: 'Five languages. Three angles. Minutes saved per listing.',
    status: 'coming',
    comingLabel: 'October 2026',
    tone: 'rose',
    icon: PenLine,
    span: 'standard',
    bgImage: '/pdf-bg/dubai-marina.jpg',
    bgPosition: 'left 50%',
  },
  {
    number: '07',
    slug: 'whatsapp-assistant',
    name: 'WhatsApp Triage',
    tagline: 'AI fields routine inbound DMs — focus on real questions.',
    status: 'coming',
    comingLabel: 'November 2026',
    tone: 'jade',
    icon: MessageSquare,
    span: 'standard',
    bgImage: '/pdf-bg/dubai-skyline.jpg',
    bgPosition: 'center 50%',
  },
  {
    number: '08',
    slug: 'open-house',
    name: 'Open House',
    tagline: 'Branded landing page and printable QR — every viewing.',
    status: 'coming',
    comingLabel: 'December 2026',
    tone: 'silver',
    icon: QrCode,
    span: 'standard',
    bgImage: '/pdf-bg/dubai-marina.jpg',
    bgPosition: 'right 70%',
  },
  {
    number: '09',
    slug: 'negotiation-coach',
    name: 'Negotiation Coach',
    tagline: 'Anchor, walk-away, draft message — every live deal.',
    status: 'coming',
    comingLabel: '2027',
    tone: 'crimson',
    icon: Handshake,
    span: 'standard',
    bgImage: '/pdf-bg/dubai-skyline.jpg',
    bgPosition: 'center 70%',
  },
  {
    number: '10',
    slug: 'lead-heat',
    name: 'Lead Heat',
    tagline: 'See which leads are about to close. Ranked nought to a hundred.',
    status: 'coming',
    comingLabel: '2027',
    tone: 'ember',
    icon: Flame,
    span: 'standard',
    bgImage: '/pdf-bg/dubai-marina.jpg',
    bgPosition: 'left 80%',
  },
];

/** Tone definitions — driven from a single source so cards + chips agree. */
export const TONE_PALETTE: Record<StudioToolTone, { accent: string; ring: string; chipBg: string; chipFg: string }> = {
  mint:    { accent: '#18D6A4', ring: 'rgba(24,214,164,0.55)',  chipBg: 'rgba(24,214,164,0.12)',  chipFg: '#7BFFD6' },
  gold:    { accent: '#C9A84C', ring: 'rgba(201,168,76,0.55)',  chipBg: 'rgba(201,168,76,0.14)',  chipFg: '#E8CB7E' },
  violet:  { accent: '#9D7BFF', ring: 'rgba(157,123,255,0.55)', chipBg: 'rgba(157,123,255,0.14)', chipFg: '#C8B4FF' },
  cobalt:  { accent: '#4AA8FF', ring: 'rgba(74,168,255,0.55)',  chipBg: 'rgba(74,168,255,0.14)',  chipFg: '#A5CFFF' },
  amber:   { accent: '#F5B433', ring: 'rgba(245,180,51,0.55)',  chipBg: 'rgba(245,180,51,0.14)',  chipFg: '#FFD685' },
  rose:    { accent: '#FF7B95', ring: 'rgba(255,123,149,0.55)', chipBg: 'rgba(255,123,149,0.14)', chipFg: '#FFB1C4' },
  jade:    { accent: '#34D399', ring: 'rgba(52,211,153,0.55)',  chipBg: 'rgba(52,211,153,0.14)',  chipFg: '#86EFC2' },
  silver:  { accent: '#C5CCD9', ring: 'rgba(197,204,217,0.55)', chipBg: 'rgba(197,204,217,0.10)', chipFg: '#E2E6EE' },
  crimson: { accent: '#FF5577', ring: 'rgba(255,85,119,0.55)',  chipBg: 'rgba(255,85,119,0.14)',  chipFg: '#FFA7BB' },
  ember:   { accent: '#FF7847', ring: 'rgba(255,120,71,0.55)',  chipBg: 'rgba(255,120,71,0.14)',  chipFg: '#FFB495' },
};

/** Returns counts for the editorial header. */
export function studioToolCounts(): { live: number; coming: number } {
  const live = STUDIO_TOOLS.filter(t => t.status === 'live' || t.status === 'beta').length;
  const coming = STUDIO_TOOLS.filter(t => t.status === 'coming').length;
  return { live, coming };
}
