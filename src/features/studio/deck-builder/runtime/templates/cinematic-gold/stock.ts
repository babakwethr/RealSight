/**
 * Cinematic Gold — default photo overrides per slide type.
 *
 * V1 status: NO default photos. Slides render on the dark cinematic
 * gold gradient (the cover slide already has its own gold radial
 * background; the data slides look clean on `bg-ink-900` without a
 * potentially-irrelevant stock photo behind them).
 *
 * Real photo selection happens in Step 4 (Choose visuals) of the
 * composer, where the adviser uploads their own portrait + property
 * shots, or picks from the curated stock library when it lands.
 *
 * Earlier versions of this file shipped guessed Pexels IDs as
 * "defaults" — those returned random people / fitness portraits
 * because the IDs weren't verified. Removed entirely: better no
 * photo than a wrong photo.
 */

import type { SlideType } from '../../types';

export const CINEMATIC_GOLD_DEFAULT_PHOTOS: Record<SlideType, string | null> = {
  cover:          null,
  why_now:        null,
  market_trend:   null,
  signal:         null,
  offplan_split:  null,
  buyer:          null,
  top_volume:     null,
  top_yield:      null,
  strategy:       null,
  closing:        null,
};

export function defaultPhotoFor(slideType: SlideType): string | null {
  return CINEMATIC_GOLD_DEFAULT_PHOTOS[slideType] ?? null;
}
