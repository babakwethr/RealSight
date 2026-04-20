-- Fix handle_new_user trigger: wrong column names caused it to fail on every signup
-- The previous version inserted into non-existent columns (role, phone_number on profiles;
-- first_name, last_name, investment_capacity, preferences on investors) and used 'id'
-- instead of 'user_id' for the profiles insert.

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

  -- Insert profile using correct column names
  INSERT INTO public.profiles (user_id, full_name, email, tenant_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    v_tenant_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert investor record using correct column names
  INSERT INTO public.investors (
    user_id,
    name,
    email,
    phone,
    tenant_id
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    '0000000000',
    v_tenant_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
