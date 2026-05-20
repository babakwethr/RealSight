-- Monthly aggregates of DLD residential sales for the UAE 24-month
-- price-trend chart on /market-intelligence (mirrors the UK + US
-- national-trend cards on their respective market pages).
--
-- Applied to propsight-prod (hcbpveurcfdvfjskovvf) on 20 May 2026.

CREATE TABLE IF NOT EXISTS public.dld_monthly_aggregates (
  month         text PRIMARY KEY,            -- YYYY-MM
  sales_count   int NOT NULL DEFAULT 0,
  total_aed     numeric NOT NULL DEFAULT 0,
  total_sqm     numeric NOT NULL DEFAULT 0,
  avg_psqft     numeric,                     -- derived: total_aed / (total_sqm * 10.7639)
  last_updated  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dld_monthly_aggregates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read DLD monthly aggregates"
  ON public.dld_monthly_aggregates;
CREATE POLICY "Public can read DLD monthly aggregates"
  ON public.dld_monthly_aggregates FOR SELECT USING (true);

-- Fast-read RPC the frontend calls.
CREATE OR REPLACE FUNCTION public.get_dld_monthly_trend(p_months int DEFAULT 24)
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
  SELECT month, sales_count, total_aed, avg_psqft
    FROM public.dld_monthly_aggregates
   ORDER BY month DESC
   LIMIT GREATEST(LEAST(p_months, 60), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_dld_monthly_trend(int) TO anon, authenticated;

-- Bulk-upsert helper called from the dld-monthly-aggregate-build
-- edge function. Sums into existing buckets and recomputes avg_psqft.
CREATE OR REPLACE FUNCTION public._upsert_dld_monthly(batch jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected int;
BEGIN
  WITH incoming AS (
    SELECT (row->>'month')::text AS month,
           COALESCE((row->>'sales_count')::int, 0) AS sales_count,
           COALESCE((row->>'total_aed')::numeric, 0) AS total_aed,
           COALESCE((row->>'total_sqm')::numeric, 0) AS total_sqm
      FROM jsonb_array_elements(batch) row
  )
  INSERT INTO public.dld_monthly_aggregates AS m (
    month, sales_count, total_aed, total_sqm, avg_psqft, last_updated
  )
  SELECT month, sales_count, total_aed, total_sqm,
         CASE WHEN total_sqm > 0
              THEN (total_aed / (total_sqm * 10.7639))::numeric
              ELSE NULL END,
         now()
    FROM incoming
   WHERE month IS NOT NULL AND month <> ''
  ON CONFLICT (month) DO UPDATE
    SET sales_count = m.sales_count + EXCLUDED.sales_count,
        total_aed   = m.total_aed   + EXCLUDED.total_aed,
        total_sqm   = m.total_sqm   + EXCLUDED.total_sqm,
        avg_psqft   = CASE WHEN (m.total_sqm + EXCLUDED.total_sqm) > 0
                           THEN ((m.total_aed + EXCLUDED.total_aed) /
                                 ((m.total_sqm + EXCLUDED.total_sqm) * 10.7639))::numeric
                           ELSE NULL END,
        last_updated = now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public._upsert_dld_monthly(jsonb) TO service_role;
