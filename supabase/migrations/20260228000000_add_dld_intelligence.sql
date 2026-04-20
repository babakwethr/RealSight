-- Simulation tables for DLD (Dubai Land Department) Data
-- This provides the foundational data for the Admin Deep Analytics and Investor Simplified Insights views.

-- 1. dld_areas (Macro Area Intelligence)
CREATE TABLE IF NOT EXISTS public.dld_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avg_price_per_sqft_current NUMERIC NOT NULL,
  avg_price_per_sqft_12m_ago NUMERIC NOT NULL,
  transaction_volume_30d INTEGER NOT NULL DEFAULT 0,
  rental_yield_avg NUMERIC NOT NULL, -- e.g., 6.5 for 6.5%
  demand_score INTEGER NOT NULL CHECK (demand_score BETWEEN 1 AND 100),
  supply_pipeline_units INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. dld_developers (Developer Licensing & Risk Scoring)
CREATE TABLE IF NOT EXISTS public.dld_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  total_projects_completed INTEGER NOT NULL DEFAULT 0,
  total_projects_delayed INTEGER NOT NULL DEFAULT 0,
  avg_delay_months NUMERIC NOT NULL DEFAULT 0,
  reliability_score INTEGER NOT NULL CHECK (reliability_score BETWEEN 1 AND 100), -- Internal DLD rating
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. dld_transactions (Raw Sales/Transfer Records)
CREATE TABLE IF NOT EXISTS public.dld_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT UNIQUE NOT NULL,
  area_id UUID NOT NULL REFERENCES public.dld_areas(id) ON DELETE CASCADE,
  project_name TEXT,
  property_type TEXT NOT NULL, -- 'Apartment', 'Villa', 'Townhouse', 'Plot'
  transaction_type TEXT NOT NULL, -- 'Sales', 'Mortgage', 'Gift'
  status TEXT NOT NULL, -- 'Off-Plan', 'Ready'
  price NUMERIC NOT NULL,
  size_sqft NUMERIC NOT NULL,
  price_per_sqft NUMERIC NOT NULL,
  transaction_date DATE NOT NULL,
  buyer_nationality TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS setup (These tables are strictly application-wide reference data, NOT tenant-specific)
ALTER TABLE public.dld_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dld_developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dld_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins have full access to DLD tables"
  ON public.dld_areas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have full access to Dev tables"
  ON public.dld_developers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have full access to DLD txn tables"
  ON public.dld_transactions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Investors can READ areas and developers (for the simplified view) but NOT individual private transactions
CREATE POLICY "Investors can read DLD aggregations"
  ON public.dld_areas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Investors can read DLD developers"
  ON public.dld_developers
  FOR SELECT TO authenticated
  USING (true);

-- Explicitly block standard users from reading raw transactions to protect privacy.
-- Only edge functions passing service_role key can read them to generate AI insights.

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dld_areas_updated_at
    BEFORE UPDATE ON public.dld_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
