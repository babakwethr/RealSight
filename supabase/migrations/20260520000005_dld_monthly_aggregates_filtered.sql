-- DLD monthly aggregates v2: filter outliers per-row instead of
-- averaging the global total. The previous (total_aed / total_sqm)
-- formula was wildly skewed by huge land plots and bulk portfolio
-- deals; this version computes a sensible monthly mean from
-- per-row AED/sqft values that fall within a plausible band
-- (AED 200–6000 per sqft).
--
-- Applied to propsight-prod (hcbpveurcfdvfjskovvf) on 20 May 2026.
-- Also TRUNCATEs the table so the re-ingestion writes clean data.

ALTER TABLE public.dld_monthly_aggregates
  ADD COLUMN IF NOT EXISTS psqft_sum numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS psqft_count int DEFAULT 0;

-- Reset existing rows — they used the noisy formula.
TRUNCATE public.dld_monthly_aggregates;

CREATE OR REPLACE FUNCTION public._upsert_dld_monthly(batch jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected int;
BEGIN
  WITH incoming AS (
    SELECT (row->>'month')::text                            AS month,
           COALESCE((row->>'sales_count')::int, 0)          AS sales_count,
           COALESCE((row->>'total_aed')::numeric, 0)        AS total_aed,
           COALESCE((row->>'total_sqm')::numeric, 0)        AS total_sqm,
           COALESCE((row->>'psqft_sum')::numeric, 0)        AS psqft_sum,
           COALESCE((row->>'psqft_count')::int, 0)          AS psqft_count
      FROM jsonb_array_elements(batch) row
  )
  INSERT INTO public.dld_monthly_aggregates AS m (
    month, sales_count, total_aed, total_sqm,
    psqft_sum, psqft_count, avg_psqft, last_updated
  )
  SELECT month, sales_count, total_aed, total_sqm,
         psqft_sum, psqft_count,
         CASE WHEN psqft_count > 0
              THEN (psqft_sum / psqft_count)::numeric
              ELSE NULL END,
         now()
    FROM incoming
   WHERE month IS NOT NULL AND month <> ''
  ON CONFLICT (month) DO UPDATE
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
