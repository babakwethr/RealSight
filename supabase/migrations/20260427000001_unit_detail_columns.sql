-- Unit-level detail columns — enables search/filter by bedrooms, floor, view
-- across the cached DLD transactions and white-label tenant inventory.
--
-- Per LAUNCH_PLAN.md §14 + REALSIGHT_MASTER_SPEC.md §6 (home-page search
-- bar specs include a Beds dropdown: Studio / 1 / 2 / 3 / 4 / 5+). Without
-- these columns the Beds filter has nothing to match against.
--
-- All columns are NULLABLE — DLD historical data won't have all fields, and
-- a missing value should not break inserts. Frontend already handles
-- absent values gracefully.

-- ── dld_transactions ─────────────────────────────────────────────────────
ALTER TABLE public.dld_transactions
  ADD COLUMN IF NOT EXISTS bedrooms      smallint,
  ADD COLUMN IF NOT EXISTS bathrooms     smallint,
  ADD COLUMN IF NOT EXISTS floor         smallint,
  ADD COLUMN IF NOT EXISTS view          text,
  ADD COLUMN IF NOT EXISTS unit_number   text,
  ADD COLUMN IF NOT EXISTS building_name text;

-- Indexes the search/filter UI will use on volume.
CREATE INDEX IF NOT EXISTS idx_dld_transactions_bedrooms
  ON public.dld_transactions (bedrooms)
  WHERE bedrooms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dld_transactions_building_name
  ON public.dld_transactions (lower(building_name))
  WHERE building_name IS NOT NULL;

-- ── tenant_inventory ─────────────────────────────────────────────────────
-- White-label adviser inventory. The adviser uploads units they're selling
-- and we surface them on their branded subdomain. Same fields as DLD plus
-- the commercial extras the adviser cares about.
ALTER TABLE public.tenant_inventory
  ADD COLUMN IF NOT EXISTS bedrooms      smallint,
  ADD COLUMN IF NOT EXISTS bathrooms     smallint,
  ADD COLUMN IF NOT EXISTS floor         smallint,
  ADD COLUMN IF NOT EXISTS view          text,
  ADD COLUMN IF NOT EXISTS unit_ref      text,
  ADD COLUMN IF NOT EXISTS size_sqft     numeric,
  ADD COLUMN IF NOT EXISTS price_aed     numeric,
  ADD COLUMN IF NOT EXISTS status        text DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS notes         text;

-- ── projects ────────────────────────────────────────────────────────────
-- Aggregate min/max bed counts so the home-page beds filter can match the
-- project even when the per-unit breakdown lives in tenant_inventory.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS bedrooms_min  smallint,
  ADD COLUMN IF NOT EXISTS bedrooms_max  smallint,
  ADD COLUMN IF NOT EXISTS units_total   integer;

-- Tighten the status enum on tenant_inventory if it's text — keep it open
-- for future statuses but log unexpected values.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenant_inventory'
      AND column_name = 'status'
      AND data_type = 'text'
  ) THEN
    -- Safety check constraint, NOT VALID first so existing rows aren't
    -- forced to comply if any have legacy values.
    BEGIN
      ALTER TABLE public.tenant_inventory
        ADD CONSTRAINT tenant_inventory_status_check
        CHECK (status IN ('available', 'reserved', 'sold', 'on_hold', 'archived'))
        NOT VALID;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
