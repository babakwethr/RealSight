-- Create access_requests table for investor access requests
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  preferred_language TEXT,
  investor_type TEXT,
  budget_range TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'denied')),
  admin_notes TEXT
);

-- Enable RLS on access_requests
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Allow public/anon to insert (submit requests)
CREATE POLICY "Anyone can submit access requests"
ON public.access_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view access requests
CREATE POLICY "Admins can view all access requests"
ON public.access_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update access requests
CREATE POLICY "Admins can update access requests"
ON public.access_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS preferred_language TEXT;

-- Add missing columns to investors table  
ALTER TABLE public.investors
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS preferred_language TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create function to link existing investor record on login
CREATE OR REPLACE FUNCTION public.link_investor_on_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_investor_id uuid;
BEGIN
  -- Check if there's an unlinked investor with matching email
  SELECT id INTO v_existing_investor_id
  FROM public.investors
  WHERE email = NEW.email AND user_id IS NULL
  LIMIT 1;
  
  -- If found, link it to this user
  IF v_existing_investor_id IS NOT NULL THEN
    UPDATE public.investors
    SET user_id = NEW.id
    WHERE id = v_existing_investor_id;
    
    -- Create profile if not exists
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Assign default user role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
  END IF;
  
  -- Otherwise, let the original handle_new_user trigger handle everything
  RETURN NEW;
END;
$$;

-- Create function to check if user needs onboarding
CREATE OR REPLACE FUNCTION public.needs_onboarding(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.investors i ON i.user_id = p.user_id
    WHERE p.user_id = p_user_id
      AND p.full_name IS NOT NULL 
      AND p.full_name != ''
      AND i.phone IS NOT NULL
      AND i.phone != ''
  )
$$;

-- Make investors.user_id nullable to allow admin-created investors without auth accounts
ALTER TABLE public.investors ALTER COLUMN user_id DROP NOT NULL;