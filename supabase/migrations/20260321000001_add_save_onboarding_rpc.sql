-- Create an RPC function for onboarding profile save
-- This uses SECURITY DEFINER to bypass RLS and uses auth.uid() directly
-- to avoid any client-side user_id mismatch issues.

CREATE OR REPLACE FUNCTION public.save_onboarding_profile(
  p_full_name TEXT,
  p_phone TEXT,
  p_country TEXT DEFAULT NULL,
  p_preferred_language TEXT DEFAULT NULL,
  p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- Get the authenticated user's ID directly from auth context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (user_id, full_name, email, country, preferred_language, tenant_id)
  VALUES (v_user_id, p_full_name, v_email, p_country, p_preferred_language, p_tenant_id)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    country = EXCLUDED.country,
    preferred_language = EXCLUDED.preferred_language,
    tenant_id = EXCLUDED.tenant_id,
    updated_at = now();

  -- Upsert investor
  INSERT INTO public.investors (user_id, name, email, phone, country, preferred_language, tenant_id)
  VALUES (v_user_id, p_full_name, v_email, p_phone, p_country, p_preferred_language, p_tenant_id)
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    country = EXCLUDED.country,
    preferred_language = EXCLUDED.preferred_language,
    tenant_id = EXCLUDED.tenant_id,
    updated_at = now();

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
