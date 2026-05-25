/**
 * Composer-side types — shared across the wizard steps.
 */

import type { OutlineEntry, Branding, AdviserContact } from '../runtime/types';
import type { HtmlSlide } from '../runtime/HtmlStage';

export type ComposerAudience =
  | 'end_user'
  | 'investor'
  | 'both'
  | 'team'
  | 'clients'
  | 'open_house';

export interface ReferenceAsset {
  asset_id: string;
  kind: 'pdf' | 'youtube_transcript';
  source_url?: string;
  display_name?: string;
  char_count?: number;
}

export interface DeckTheme {
  accent_variant?: string;
}

export interface DraftDeck {
  id: string | null;
  topic: string;
  audience: ComposerAudience;
  voice_notes: string;
  contact_bg_prompt: string;
  reference_assets: ReferenceAsset[];
  template_slug: string;
  /** V2 — generative-HTML slides from the LLM. New decks use this. */
  html_slides: HtmlSlide[] | null;
  /** V2 — per-deck theme override emitted by the LLM. */
  theme: DeckTheme | null;
  /** Legacy V1 outline; kept so older decks still render but cleared
   *  when an html_slides generation succeeds. */
  outline: OutlineEntry[] | null;
  visuals: Record<string, string>;
}

export interface ComposerContext {
  draft: DraftDeck;
  setDraft: (next: DraftDeck | ((prev: DraftDeck) => DraftDeck)) => void;
  branding: Branding;
  adviser?: AdviserContact;
}

export const EMPTY_DRAFT: DraftDeck = {
  id: null,
  topic: '',
  audience: 'investor',
  voice_notes: '',
  contact_bg_prompt: '',
  reference_assets: [],
  template_slug: 'cinematic-gold',
  html_slides: null,
  theme: null,
  outline: null,
  visuals: {},
};

/**
 * Wizard steps — order matches the userflow.html reference:
 *   1. Chat brief         (topic + audience + tone + source material + chat rail)
 *   2. Pick template      (2×2 design system cards)
 *   3. Review script      (outline tiles, edit + re-prompt)
 *   4. Choose visuals     (per-slide image picker — Upload / Stock V1)
 *   5. Publish            (preview + share link + downloads)
 */
export const WIZARD_STEPS = [
  { id: 'brief',    label: 'Chat brief' },
  { id: 'template', label: 'Pick template' },
  { id: 'outline',  label: 'Review script' },
  { id: 'visuals',  label: 'Choose visuals' },
  { id: 'publish',  label: 'Publish' },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];
