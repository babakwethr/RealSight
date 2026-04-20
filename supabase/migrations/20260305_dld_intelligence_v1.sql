-- 1️⃣ Modifying existing tables adding normalized fields
ALTER TABLE public.dld_areas ADD COLUMN IF NOT EXISTS name_normalized text;
ALTER TABLE public.dld_areas ADD COLUMN IF NOT EXISTS city text DEFAULT 'Dubai';

ALTER TABLE public.dld_developers ADD COLUMN IF NOT EXISTS name_normalized text;

-- Update existing data with normalized strings
UPDATE public.dld_areas SET name_normalized = lower(regexp_replace(name, '[^\w\s]', '', 'g'));
UPDATE public.dld_developers SET name_normalized = lower(regexp_replace(name, '[^\w\s]', '', 'g'));

-- Ensure dld_transactions holds a dev ID if missing, but user says it should be there.
ALTER TABLE public.dld_transactions ADD COLUMN IF NOT EXISTS developer_id uuid REFERENCES public.dld_developers(id);


-- 2️⃣ Market Index Tables
CREATE TABLE IF NOT EXISTS public.area_price_index_monthly (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id uuid REFERENCES public.dld_areas(id) NOT NULL,
    month date NOT NULL,
    avg_price_per_sqft numeric,
    median_price_per_sqft numeric,
    tx_volume int,
    yoy_growth numeric,
    created_at timestamptz DEFAULT now(),
    UNIQUE(area_id, month)
);

CREATE TABLE IF NOT EXISTS public.dubai_price_index_monthly (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    month date NOT NULL UNIQUE,
    avg_price_per_sqft numeric,
    median_price_per_sqft numeric,
    tx_volume int,
    yoy_growth numeric,
    created_at timestamptz DEFAULT now()
);

-- Phase 2 Tables
CREATE TABLE IF NOT EXISTS public.dubai_market_index_series (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    month date NOT NULL UNIQUE,
    index_value numeric,
    yoy_growth numeric,
    tx_volume int,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.area_market_index_series (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id uuid REFERENCES public.dld_areas(id) NOT NULL,
    month date NOT NULL,
    index_value numeric,
    yoy_growth numeric,
    tx_volume int,
    created_at timestamptz DEFAULT now(),
    UNIQUE(area_id, month)
);


-- Function to rebuild indices
CREATE OR REPLACE FUNCTION rebuild_dld_indexes() RETURNS void AS $$
DECLARE
    base_dubai_price numeric;
    rec record;
    area_base_prices jsonb := '{}'::jsonb;
BEGIN
    -- Truncate existing index data to rebuild cleanly
    TRUNCATE TABLE public.area_price_index_monthly;
    TRUNCATE TABLE public.dubai_price_index_monthly;
    TRUNCATE TABLE public.dubai_market_index_series;
    TRUNCATE TABLE public.area_market_index_series;

    -- 1. Area Price Index Builder
    INSERT INTO public.area_price_index_monthly (area_id, month, avg_price_per_sqft, median_price_per_sqft, tx_volume)
    SELECT 
        area_id,
        date_trunc('month', transaction_date::date)::date as month,
        ROUND(AVG(price_per_sqft), 2) as avg_price_per_sqft,
        ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_sqft)::numeric, 2) as median_price_per_sqft,
        COUNT(id) as tx_volume
    FROM public.dld_transactions
    WHERE price_per_sqft > 0
    GROUP BY area_id, date_trunc('month', transaction_date::date)::date
    ORDER BY month;

    -- Update YoY for Area
    UPDATE public.area_price_index_monthly current
    SET yoy_growth = ROUND(((current.avg_price_per_sqft - past.avg_price_per_sqft) / NULLIF(past.avg_price_per_sqft, 0)) * 100, 2)
    FROM public.area_price_index_monthly past
    WHERE current.area_id = past.area_id AND current.month = past.month + interval '1 year';

    -- 2. Dubai Price Index Builder
    INSERT INTO public.dubai_price_index_monthly (month, avg_price_per_sqft, median_price_per_sqft, tx_volume)
    SELECT 
        date_trunc('month', transaction_date::date)::date as month,
        ROUND(AVG(price_per_sqft), 2) as avg_price_per_sqft,
        ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_sqft)::numeric, 2) as median_price_per_sqft,
        COUNT(id) as tx_volume
    FROM public.dld_transactions
    WHERE price_per_sqft > 0
    GROUP BY date_trunc('month', transaction_date::date)::date
    ORDER BY month;

    -- Update YoY for Dubai
    UPDATE public.dubai_price_index_monthly current
    SET yoy_growth = ROUND(((current.avg_price_per_sqft - past.avg_price_per_sqft) / NULLIF(past.avg_price_per_sqft, 0)) * 100, 2)
    FROM public.dubai_price_index_monthly past
    WHERE current.month = past.month + interval '1 year';


    -- 3. Market Index Series Builder (Base 100)
    
    -- Getting Base Dubai Price
    SELECT avg_price_per_sqft INTO base_dubai_price 
    FROM public.dubai_price_index_monthly 
    ORDER BY month ASC LIMIT 1;

    IF base_dubai_price IS NOT NULL AND base_dubai_price > 0 THEN
        INSERT INTO public.dubai_market_index_series (month, index_value, yoy_growth, tx_volume)
        SELECT 
            month,
            ROUND((avg_price_per_sqft / base_dubai_price) * 100, 2) as index_value,
            yoy_growth,
            tx_volume
        FROM public.dubai_price_index_monthly;
    END IF;

    -- Area Market Indexes (Base 100 per area)
    FOR rec IN SELECT DISTINCT area_id FROM public.area_price_index_monthly LOOP
        DECLARE
            base_area_price numeric;
        BEGIN
            SELECT avg_price_per_sqft INTO base_area_price 
            FROM public.area_price_index_monthly 
            WHERE area_id = rec.area_id 
            ORDER BY month ASC LIMIT 1;

            IF base_area_price IS NOT NULL AND base_area_price > 0 THEN
                INSERT INTO public.area_market_index_series (area_id, month, index_value, yoy_growth, tx_volume)
                SELECT 
                    area_id,
                    month,
                    ROUND((avg_price_per_sqft / base_area_price) * 100, 2),
                    yoy_growth,
                    tx_volume
                FROM public.area_price_index_monthly
                WHERE area_id = rec.area_id;
            END IF;
        END;
    END LOOP;

END;
$$ LANGUAGE plpgsql;

-- Insert Mock Data into `dld_transactions` spanning several years to generate good indexes if it's empty, 
-- but we assume existing seed data has some transactions. If we need more historical data for charts to look good:
-- (The user said "The data source is DLD / Dubai Pulse datasets ... This ensures fast dashboard". We'll just build the index maker).

-- Ensure everything is accessible via public API
ALTER TABLE public.area_price_index_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dubai_price_index_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dubai_market_index_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_market_index_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to anyone" ON public.area_price_index_monthly FOR SELECT USING (true);
CREATE POLICY "Allow read access to anyone" ON public.dubai_price_index_monthly FOR SELECT USING (true);
CREATE POLICY "Allow read access to anyone" ON public.dubai_market_index_series FOR SELECT USING (true);
CREATE POLICY "Allow read access to anyone" ON public.area_market_index_series FOR SELECT USING (true);

