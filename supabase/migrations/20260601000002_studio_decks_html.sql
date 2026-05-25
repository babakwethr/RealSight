-- ============================================================
-- Studio Deck Builder — generative HTML migration (Chunk 2).
--
-- The composer flow now asks the LLM to emit a FULL HTML+CSS body
-- for each slide (using the chosen template's CSS variables as the
-- only colour / font constraint), instead of a fixed-React-slide
-- + structured-data shape. Each deck literally becomes a unique
-- HTML document.
--
-- This migration adds two nullable columns:
--   - studio_decks.html_slides  jsonb
--       Array of { id, type_hint, html, citation? } per slide.
--       HTML is server-side sanitised (DOMPurify) before persist
--       so the renderer can mount via dangerouslySetInnerHTML
--       without an XSS surface.
--   - studio_decks.theme        jsonb
--       Per-deck palette/font overrides emitted by the LLM within
--       the chosen template's family. Example shape:
--         { "accent_variant": "warm" | "cool" | "amber" }
--
-- The legacy `outline` column stays so existing decks keep
-- rendering during the rollout. New decks populate `html_slides`;
-- the renderer prefers html_slides when present, falls back to the
-- structured `outline` path otherwise.
-- ============================================================

alter table public.studio_decks
  add column if not exists html_slides jsonb,
  add column if not exists theme jsonb;

create index if not exists studio_decks_html_slides_idx
  on public.studio_decks ((jsonb_array_length(html_slides)))
  where html_slides is not null;
