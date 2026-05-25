/**
 * Cinematic Gold — default stock photos per slide type.
 *
 * V1 placeholders. The adviser overrides any of these with an Upload
 * or curated Stock pick via the VisualsPanel; this map is the "if
 * no override, what photo do we show?" fallback.
 *
 * Pexels CDN — free licence, no attribution required (recommended).
 * URLs are width-capped at 1920 so the 1280×800 canvas + Ken-Burns
 * scale-to-1.14 zoom still has crisp pixels at the edges.
 *
 * Phase 2 expands this to a curated ~30-photo library per template
 * with category filter chips (skyline / interior / construction /
 * community / aerial) inside the VisualsPanel.
 */

import type { SlideType } from '../../types';

const PEXELS = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920`;

/** Per-slide-type default photo URL. */
export const CINEMATIC_GOLD_DEFAULT_PHOTOS: Record<SlideType, string | null> = {
  cover:          PEXELS(1470502), // Dubai skyline
  why_now:        PEXELS(2096578), // city contrast
  market_trend:   PEXELS(1470502), // skyline
  signal:         PEXELS(2096577), // tower with sky
  offplan_split:  PEXELS(3935698), // construction crane
  buyer:          PEXELS(2724748), // modern interior
  top_volume:     PEXELS(1115804), // marina/aerial
  top_yield:      PEXELS(2724749), // residential
  strategy:       PEXELS(1431283), // aerial city
  closing:        null,            // closing has a dedicated portrait + scrim, no photo needed by default
};

/** Pick a default for a slide; null = no photo (renders solid bg). */
export function defaultPhotoFor(slideType: SlideType): string | null {
  return CINEMATIC_GOLD_DEFAULT_PHOTOS[slideType] ?? null;
}
