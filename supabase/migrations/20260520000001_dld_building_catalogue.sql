-- Pre-aggregated DLD residential building catalogue, used by the
-- home autocomplete. The home search needs sub-100 ms response time
-- which is impossible to get from the DLD relay (~4 s/call), so we
-- pre-build this table from the DLD transactions feed and query it
-- locally via a trigram-indexed RPC.
--
-- See:
--   - supabase/functions/dld-catalogue-build/index.ts (ingestion job)
--   - src/hooks/useDldData.ts → useDldBuildingSearch (consumer)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.dld_building_catalogue (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_name_en   text NOT NULL,
  project_name_en    text,
  area_name_en       text,
  transaction_count  integer NOT NULL DEFAULT 0,
  last_seen_date     date,
  inserted_at        timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dld_building_catalogue_uniq
  ON public.dld_building_catalogue
     (lower(building_name_en), coalesce(lower(area_name_en), ''));

CREATE INDEX IF NOT EXISTS dld_building_catalogue_building_trgm
  ON public.dld_building_catalogue
     USING gin (lower(building_name_en) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS dld_building_catalogue_project_trgm
  ON public.dld_building_catalogue
     USING gin (lower(coalesce(project_name_en, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS dld_building_catalogue_area_trgm
  ON public.dld_building_catalogue
     USING gin (lower(coalesce(area_name_en, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS dld_building_catalogue_recency
  ON public.dld_building_catalogue
     (last_seen_date DESC NULLS LAST, transaction_count DESC);

ALTER TABLE public.dld_building_catalogue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read DLD building catalogue"
  ON public.dld_building_catalogue;
CREATE POLICY "Public can read DLD building catalogue"
  ON public.dld_building_catalogue
  FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS public.dld_catalogue_jobs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  last_offset    integer NOT NULL DEFAULT 0,
  rows_processed integer NOT NULL DEFAULT 0,
  rows_inserted  integer NOT NULL DEFAULT 0,
  rows_updated   integer NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'running'
);
ALTER TABLE public.dld_catalogue_jobs ENABLE ROW LEVEL SECURITY;

-- Fast search RPC the frontend calls on every keystroke.
-- ILIKE with the trigram GIN index returns in ~10-30 ms even with
-- 50k+ rows.
CREATE OR REPLACE FUNCTION public.search_dld_buildings(q text, lim int DEFAULT 12)
RETURNS TABLE (
  building_name      text,
  project_name       text,
  area_name          text,
  transaction_count  integer,
  last_seen_date     date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (SELECT lower(coalesce(trim(q), '')) AS needle)
  SELECT c.building_name_en,
         c.project_name_en,
         c.area_name_en,
         c.transaction_count,
         c.last_seen_date
    FROM public.dld_building_catalogue c, params p
   WHERE p.needle <> ''
     AND (
       lower(c.building_name_en) ILIKE '%' || p.needle || '%'
       OR lower(coalesce(c.project_name_en, '')) ILIKE '%' || p.needle || '%'
       OR lower(coalesce(c.area_name_en, '')) ILIKE '%' || p.needle || '%'
     )
   ORDER BY
     CASE WHEN lower(c.building_name_en) ILIKE p.needle || '%' THEN 0 ELSE 1 END,
     c.transaction_count DESC NULLS LAST,
     c.last_seen_date DESC NULLS LAST
   LIMIT GREATEST(LEAST(lim, 50), 1);
$$;

GRANT EXECUTE ON FUNCTION public.search_dld_buildings(text, int) TO anon, authenticated;

-- Bulk upsert helper called from the dld-catalogue-build edge function.
CREATE OR REPLACE FUNCTION public._upsert_dld_buildings(batch jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  WITH incoming AS (
    SELECT
      (row->>'building_name_en')::text                          AS building_name_en,
      NULLIF(row->>'project_name_en', '')::text                 AS project_name_en,
      NULLIF(row->>'area_name_en', '')::text                    AS area_name_en,
      COALESCE((row->>'transaction_count')::int, 1)             AS transaction_count,
      NULLIF(row->>'last_seen_date', '')::date                  AS last_seen_date
    FROM jsonb_array_elements(batch) row
  )
  INSERT INTO public.dld_building_catalogue AS c (
    building_name_en, project_name_en, area_name_en,
    transaction_count, last_seen_date
  )
  SELECT building_name_en, project_name_en, area_name_en,
         transaction_count, last_seen_date
    FROM incoming
   WHERE building_name_en IS NOT NULL AND building_name_en <> ''
  ON CONFLICT (lower(building_name_en), coalesce(lower(area_name_en), ''))
  DO UPDATE
     SET transaction_count = c.transaction_count + EXCLUDED.transaction_count,
         last_seen_date    = GREATEST(c.last_seen_date, EXCLUDED.last_seen_date),
         project_name_en   = COALESCE(EXCLUDED.project_name_en, c.project_name_en),
         updated_at        = now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public._upsert_dld_buildings(jsonb) TO service_role;
