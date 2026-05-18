-- Phase 1 of the global-launch plan — multi-market plumbing.
--
-- Adds a single source of truth for markets in the database, and tags
-- existing user-owned data (holdings) with the UAE market so the
-- per-market grouping in Phase 4 has something to filter on.
--
-- This migration is intentionally NON-DESTRUCTIVE:
--   - It does not touch the dld_* tables (areas, transactions, developers).
--   - It does not drop columns or rename schemas.
--   - All new columns default to 'uae' to keep existing pages identical.
--
-- After this lands, the `markets` table is the source of truth for which
-- markets exist; the `holdings.market_slug` column lets the Portfolio
-- page group by market once Phase 4 ships.

BEGIN;

-- ─── markets table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.markets (
  slug          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  country_code  TEXT NOT NULL,
  currency      TEXT NOT NULL,
  area_unit     TEXT NOT NULL DEFAULT 'sqft',
  is_live       BOOLEAN NOT NULL DEFAULT FALSE,
  -- 'live' = full dashboard; 'live-cohort' = first-cohort access only;
  -- 'coming-soon' = placeholder in MarketSwitcher.
  status        TEXT NOT NULL DEFAULT 'coming-soon',
  -- Display order (US first, UK second, UAE third, Spain on deck).
  sort_order    INT NOT NULL DEFAULT 100,
  launched_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.markets IS
  'Single source of truth for markets RealSight covers. Order matters: US first, then UK, UAE, Spain.';

-- RLS: markets is public read (it''s a static reference table).
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "markets readable by anyone" ON public.markets;
CREATE POLICY "markets readable by anyone"
  ON public.markets FOR SELECT
  USING (true);

-- Seed the four launch markets.
INSERT INTO public.markets (slug, name, country_code, currency, area_unit, is_live, status, sort_order, launched_at)
VALUES
  ('us',    'United States',         'US', 'USD', 'sqft', FALSE, 'live-cohort', 10, NULL),
  ('uk',    'United Kingdom',        'GB', 'GBP', 'sqft', FALSE, 'live-cohort', 20, NULL),
  ('uae',   'United Arab Emirates',  'AE', 'AED', 'sqft', TRUE,  'live',        30, '2026-04-01T00:00:00Z'::TIMESTAMPTZ),
  ('spain', 'Spain',                 'ES', 'EUR', 'sqft', FALSE, 'coming-soon', 40, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ─── holdings.market_slug ──────────────────────────────────────────────
-- Lets the Portfolio page group cross-market holdings once US/UK ship
-- data in Phases 2-3. Defaults to 'uae' so existing rows are correctly
-- tagged without a backfill.
ALTER TABLE public.holdings
  ADD COLUMN IF NOT EXISTS market_slug TEXT NOT NULL DEFAULT 'uae'
    REFERENCES public.markets(slug) ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_holdings_market_slug
  ON public.holdings(market_slug);

COMMENT ON COLUMN public.holdings.market_slug IS
  'Which market this holding belongs to. Defaults to uae; future US/UK holdings tag accordingly.';

-- ─── projects.market_slug ──────────────────────────────────────────────
-- Same treatment for the projects table (Reelly + manually-added).
-- Default to 'uae' to preserve current behaviour.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS market_slug TEXT NOT NULL DEFAULT 'uae'
    REFERENCES public.markets(slug) ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_market_slug
  ON public.projects(market_slug);

COMMENT ON COLUMN public.projects.market_slug IS
  'Which market this project belongs to. Defaults to uae.';

COMMIT;
