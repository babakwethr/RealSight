-- RPC function for advisor platform setup
-- Uses SECURITY DEFINER to bypass RLS for user_roles insert (chicken-and-egg: user needs admin role but only admins can insert roles)

CREATE OR REPLACE FUNCTION public.setup_advisor_platform(
  p_broker_name TEXT,
  p_subdomain TEXT,
  p_brand_color TEXT DEFAULT '#caaf6c'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Create tenant
  INSERT INTO public.tenants (broker_name, subdomain, branding_config, subscription_tier)
  VALUES (p_broker_name, lower(p_subdomain), jsonb_build_object('primary_color', p_brand_color), 'starter')
  RETURNING id INTO v_tenant_id;

  -- Update profile with new tenant
  INSERT INTO public.profiles (user_id, full_name, email, tenant_id)
  VALUES (v_user_id, p_broker_name, v_email, v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    tenant_id = EXCLUDED.tenant_id,
    updated_at = now();

  -- Create investor record
  INSERT INTO public.investors (user_id, name, email, phone, tenant_id)
  VALUES (v_user_id, p_broker_name, v_email, '0000000000', v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    tenant_id = EXCLUDED.tenant_id,
    updated_at = now();

  -- Assign admin role (bypasses RLS since SECURITY DEFINER)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN json_build_object('success', true, 'tenant_id', v_tenant_id);
EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('success', false, 'error', 'Subdomain is already taken. Please choose another.');
WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
