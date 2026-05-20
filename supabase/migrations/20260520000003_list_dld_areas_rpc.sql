-- list_dld_areas() — returns every distinct (area, total_sales,
-- latest_sale) tuple in the DLD building catalogue, ordered by
-- transaction activity.
--
-- Replaces the previously-hand-curated `dld_areas` table as the area
-- picker's source of truth: the catalogue holds ~71 areas vs the 8
-- in dld_areas, so users can now drill into every area DLD has
-- recorded sales in (Al Jadaf, Marsa Dubai, Wadi Al Safa, etc.).
--
-- Applied to propsight-prod (hcbpveurcfdvfjskovvf) on 20 May 2026.

CREATE OR REPLACE FUNCTION public.list_dld_areas()
RETURNS TABLE (
  area_name    text,
  total_sales  bigint,
  latest_sale  date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT area_name_en,
         SUM(transaction_count)::bigint AS total_sales,
         MAX(last_seen_date)            AS latest_sale
    FROM public.dld_building_catalogue
   WHERE area_name_en IS NOT NULL AND area_name_en <> ''
   GROUP BY area_name_en
   ORDER BY SUM(transaction_count) DESC NULLS LAST, area_name_en ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_dld_areas() TO anon, authenticated;
