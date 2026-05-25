/**
 * Composer-side types — shared across the wizard steps.
 *
 * `DraftDeck` is the canonical state the wizard carries; it's also
 * what gets persisted to `studio_decks` row + reloaded on resume.
 *
 * `OutlineEntry` and `Citation` are imported from the RUNTIME types
 * — the composer is just an editing surface for the same shape the
 * runtime renders.
 */

import type { OutlineEntry, Branding, AdviserContact } from '../runtime/types';

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

export interface DraftDeck {
  /** Persisted deck id once the first generate call returns. */
  id: string | null;
  topic: string;
  audience: ComposerAudience;
  voice_notes: string;
  contact_bg_prompt: string;
  reference_assets: ReferenceAsset[];
  template_slug: string;
  outline: OutlineEntry[] | null;
  /** Per-slide image overrides keyed by slide index or slide_type. */
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
  outline: null,
  visuals: {},
};

export const WIZARD_STEPS = [
  { id: 'brief',      label: 'Brief' },
  { id: 'references', label: 'Sources' },
  { id: 'template',   label: 'Style' },
  { id: 'outline',    label: 'Slides' },
  { id: 'publish',    label: 'Publish' },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];
