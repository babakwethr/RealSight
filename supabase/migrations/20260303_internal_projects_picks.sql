-- Internal Project Management & Monthly Picks Overhaul

-- 1. Create custom_projects table
CREATE TABLE IF NOT EXISTS public.custom_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    developer TEXT NOT NULL,
    property_category TEXT NOT NULL CHECK (property_category IN ('Off-plan', 'Secondary Market', 'Land', 'Commercial', 'Full Building')),
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    coordinates JSONB,
    starting_price DECIMAL(15,2),
    unit_sizes JSONB, -- { min: number, max: number, unit: string }
    completion_date DATE,
    construction_status TEXT CHECK (construction_status IN ('Under Construction', 'Completed', 'Launch Soon')),
    sale_status TEXT CHECK (sale_status IN ('For Sale', 'Sold Out', 'Pre-launch')),
    description TEXT, -- rich text
    key_highlights TEXT[],
    amenities TEXT[],
    media JSONB DEFAULT '{"cover_image": null, "gallery": [], "floor_plans": [], "brochure": null, "video": null}'::jsonb,
    payment_plan JSONB DEFAULT '[]'::jsonb,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for custom_projects
ALTER TABLE public.custom_projects ENABLE ROW LEVEL SECURITY;

-- Admins can manage their projects
-- Use public.is_admin_of_tenant(tenant_id) if it exists, otherwise check user_roles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin_of_tenant') THEN
        EXECUTE 'CREATE POLICY "Admins can manage their projects" ON public.custom_projects FOR ALL USING ( (public.is_admin_of_tenant(tenant_id)) OR (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin'')) )';
    ELSE
        EXECUTE 'CREATE POLICY "Admins can manage their projects" ON public.custom_projects FOR ALL USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin'') )';
    END IF;
END $$;

-- Investors can read their projects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin_of_tenant') THEN
        EXECUTE 'CREATE POLICY "Investors can read their projects" ON public.custom_projects FOR SELECT USING ( tenant_id = (SELECT tenant_id FROM public.investors WHERE user_id = auth.uid() LIMIT 1) OR (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin'')) )';
    ELSE
        EXECUTE 'CREATE POLICY "Investors can read their projects" ON public.custom_projects FOR SELECT USING ( EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin'') )';
    END IF;
END $$;

-- 2. Update monthly_pick_items
ALTER TABLE public.monthly_pick_items ADD COLUMN IF NOT EXISTS reason_1 TEXT;
ALTER TABLE public.monthly_pick_items ADD COLUMN IF NOT EXISTS reason_2 TEXT;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_projects_tenant ON public.custom_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monthly_picks_month ON public.monthly_picks(month);
