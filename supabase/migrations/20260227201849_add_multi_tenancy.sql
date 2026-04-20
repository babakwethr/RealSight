-- 1. Create the tenants table
CREATE TABLE public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    custom_domain TEXT UNIQUE,
    broker_name TEXT NOT NULL,
    branding_config JSONB DEFAULT '{}'::jsonb NOT NULL,
    subscription_tier TEXT DEFAULT 'starter'::text NOT NULL,
    stripe_customer_id TEXT,
    CONSTRAINT valid_subdomain CHECK (subdomain ~ '^[a-z0-9-]+$')
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Everyone can read tenant information (required for public routing & subdomain matching)
CREATE POLICY "Public read access to tenants"
    ON public.tenants FOR SELECT
    USING (true);

-- 2. Create the Genesis Default Tenant to preserve existing data
INSERT INTO public.tenants (id, subdomain, broker_name, branding_config)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'realsight', 
    'RealSight Official', 
    '{"colors": {"primary": "#CAAF6C"}}'
);

-- 3. Add tenant_id to all relevant tables
ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.investors ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.monthly_picks ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 4. Backfill existing data to the default tenant
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.investors SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.projects SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE public.monthly_picks SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 5. Make tenant_id NOT NULL everywhere
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.investors ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.monthly_picks ALTER COLUMN tenant_id SET NOT NULL;

-- 6. Update the handle_new_user trigger to recognize tenant_id from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_is_admin BOOLEAN := false;
BEGIN
  -- Determine tenant_id from metadata (if signed up via a broker's subdomain) or fallback to default
  v_tenant_id := COALESCE(
    (new.raw_user_meta_data->>'tenant_id')::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );

  IF new.email = 'babakvetter@gmail.com' THEN
    v_is_admin := true;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, phone_number, tenant_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    CASE WHEN v_is_admin THEN 'admin' ELSE 'investor' END,
    CASE WHEN v_is_admin THEN '+971000000000' ELSE NULL END,
    v_tenant_id
  );

  INSERT INTO public.investors (
    user_id, 
    first_name, 
    last_name, 
    email, 
    phone,
    investment_capacity,
    preferences,
    tenant_id
  )
  VALUES (
    new.id,
    COALESCE(split_part(new.raw_user_meta_data->>'full_name', ' ', 1), 'New'),
    COALESCE(split_part(new.raw_user_meta_data->>'full_name', ' ', 2), 'Investor'),
    new.email,
    CASE WHEN v_is_admin THEN '+971000000000' ELSE NULL END,
    'Not Specified',
    '{}'::jsonb,
    v_tenant_id
  );

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
