-- Add Inventory Management Table

CREATE TABLE IF NOT EXISTS public.tenant_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL, -- Reelly IDs are strings
  project_source TEXT NOT NULL DEFAULT 'reelly', -- e.g., 'reelly' or 'custom'
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(tenant_id, project_id)
);

-- RLS
ALTER TABLE public.tenant_inventory ENABLE ROW LEVEL SECURITY;

-- Admins can manage their tenant's inventory
CREATE POLICY "Admins can manage their tenant inventory" 
ON public.tenant_inventory
FOR ALL 
USING (
  public.is_admin_of_tenant(tenant_id)
);

-- Investors can read their tenant's inventory
CREATE POLICY "Investors can view their tenant inventory"
ON public.tenant_inventory
FOR SELECT
USING (
  tenant_id = (
    SELECT tenant_id FROM public.investors 
    WHERE user_id = auth.uid() 
    LIMIT 1
  )
);
