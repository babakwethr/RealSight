-- DLD monthly aggregates v3: per-(month, area) buckets.
--
-- v2 had one row per month, Dubai-wide only. The frontend area
-- picker can target any of ~71 areas, so we now keep a bucket per
-- (month, area). The Dubai-wide row uses the sentinel area_name
-- `__all__` (the RPC handles the NULL/empty input).
--
-- Applied to propsight-prod (hcbpveurcfdvfjskovvf) on 20 May 2026.
-- Existing rows are TRUNCATEd; the dld-monthly-aggregate-build
-- edge function emits per-area + Dubai-wide buckets in one pass.

ALTER TABLE public.dld_monthly_aggregates
  ADD COLUMN IF NOT EXISTS area_name text;

TRUNCATE public.dld_monthly_aggregates;

ALTER TABLE public.dld_monthly_aggregates
  DROP CONSTRAINT IF EXISTS dld_monthly_aggregates_pkey;
ALTER TABLE public.dld_monthly_aggregates
  ALTER COLUMN area_name SET DEFAULT '__all__';
UPDATE public.dld_monthly_aggregates
   SET area_name = '__all__'
 WHERE area_name IS NULL;
ALTER TABLE public.dld_monthly_aggregates
  ALTER COLUMN area_name SET NOT NULL;
ALTER TABLE public.dld_monthly_aggregates
  ADD CONSTRAINT dld_monthly_aggregates_pkey PRIMARY KEY (month, area_name);

-- Drop the old single-arg signature, replace with (months, area).
DROP FUNCTION IF EXISTS public.get_dld_monthly_trend(int);

CREATE OR REPLACE FUNCTION public.get_dld_monthly_trend(
  p_months int DEFAULT 24,
  p_area   text DEFAULT NULL
)
RETURNS TABLE (
  month        text,
  sales_count  int,
  total_aed    numeric,
  avg_psqft    numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT CASE
             WHEN p_area IS NULL OR trim(p_area) = ''
               THEN '__all__'
             ELSE p_area
           END AS area
  )
  SELECT m.month, m.sales_count, m.total_aed, m.avg_psqft
    FROM public.dld_monthly_aggregates m, p
   WHERE m.area_name = p.area
   ORDER BY m.month DESC
   LIMIT GREATEST(LEAST(p_months, 60), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_dld_monthly_trend(int, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public._upsert_dld_monthly(batch jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected int;
BEGIN
  WITH incoming AS (
    SELECT (row->>'month')::text                                                AS month,
           COALESCE(NULLIF(row->>'area_name', ''), '__all__')::text              AS area_name,
           COALESCE((row->>'sales_count')::int, 0)                               AS sales_count,
           COALESCE((row->>'total_aed')::numeric, 0)                             AS total_aed,
           COALESCE((row->>'total_sqm')::numeric, 0)                             AS total_sqm,
           COALESCE((row->>'psqft_sum')::numeric, 0)                             AS psqft_sum,
           COALESCE((row->>'psqft_count')::int, 0)                               AS psqft_count
      FROM jsonb_array_elements(batch) row
  )
  INSERT INTO public.dld_monthly_aggregates AS m (
    month, area_name, sales_count, total_aed, total_sqm,
    psqft_sum, psqft_count, avg_psqft, last_updated
  )
  SELECT month, area_name, sales_count, total_aed, total_sqm,
         psqft_sum, psqft_count,
         CASE WHEN psqft_count > 0
              THEN (psqft_sum / psqft_count)::numeric
              ELSE NULL END,
         now()
    FROM incoming
   WHERE month IS NOT NULL AND month <> ''
  ON CONFLICT (month, area_name) DO UPDATE
    SET sales_count  = m.sales_count  + EXCLUDED.sales_count,
        total_aed    = m.total_aed    + EXCLUDED.total_aed,
        total_sqm    = m.total_sqm    + EXCLUDED.total_sqm,
        psqft_sum    = m.psqft_sum    + EXCLUDED.psqft_sum,
        psqft_count  = m.psqft_count  + EXCLUDED.psqft_count,
        avg_psqft    = CASE WHEN (m.psqft_count + EXCLUDED.psqft_count) > 0
                            THEN ((m.psqft_sum + EXCLUDED.psqft_sum) /
                                  (m.psqft_count + EXCLUDED.psqft_count))::numeric
                            ELSE NULL END,
        last_updated = now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
