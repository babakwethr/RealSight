-- Reset database (Drop everything in public schema)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Restore default permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create investors table
CREATE TABLE public.investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    developer TEXT NOT NULL,
    starting_price DECIMAL(15,2) NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create holdings table
CREATE TABLE public.holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    unit_ref TEXT NOT NULL,
    invested_amount DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('paid', 'due', 'overdue')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('contracts', 'receipts', 'statements', 'brochures')),
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create updates table
CREATE TABLE public.updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_threads table
CREATE TABLE public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE NOT NULL,
    title TEXT DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get investor_id for current user
CREATE OR REPLACE FUNCTION public.get_investor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.investors WHERE user_id = auth.uid()
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for investors
CREATE POLICY "Users can view their own investor record"
ON public.investors FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own investor record"
ON public.investors FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own investor record"
ON public.investors FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for projects (all authenticated users can view)
CREATE POLICY "All users can view projects"
ON public.projects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage projects"
ON public.projects FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for holdings
CREATE POLICY "Users can view their own holdings"
ON public.holdings FOR SELECT
TO authenticated
USING (investor_id = public.get_investor_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage holdings"
ON public.holdings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
TO authenticated
USING (investor_id = public.get_investor_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage payments"
ON public.payments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
TO authenticated
USING (investor_id = public.get_investor_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage documents"
ON public.documents FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for updates (all authenticated can view)
CREATE POLICY "All users can view updates"
ON public.updates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage updates"
ON public.updates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_threads
CREATE POLICY "Users can view their own chat threads"
ON public.chat_threads FOR SELECT
TO authenticated
USING (investor_id = public.get_investor_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own chat threads"
ON public.chat_threads FOR INSERT
TO authenticated
WITH CHECK (investor_id = public.get_investor_id());

CREATE POLICY "Users can update their own chat threads"
ON public.chat_threads FOR UPDATE
TO authenticated
USING (investor_id = public.get_investor_id());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their threads"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  thread_id IN (
    SELECT id FROM public.chat_threads 
    WHERE investor_id = public.get_investor_id()
  ) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert messages in their threads"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  thread_id IN (
    SELECT id FROM public.chat_threads 
    WHERE investor_id = public.get_investor_id()
  )
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_investors_updated_at BEFORE UPDATE ON public.investors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON public.holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_threads_updated_at BEFORE UPDATE ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile and investor on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
    
    -- Create investor record
    INSERT INTO public.investors (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email);
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();-- First, let's make user_id nullable temporarily OR add a special handling
-- Better approach: Create a function that seeds demo data for new users

-- Create a function to seed demo holdings/payments/docs for a new investor
CREATE OR REPLACE FUNCTION public.seed_demo_data_for_investor(p_investor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_1 uuid;
  v_project_2 uuid;
  v_project_3 uuid;
  v_project_4 uuid;
BEGIN
  -- Get project IDs
  SELECT id INTO v_project_1 FROM projects WHERE name = 'Marina Heights Tower' LIMIT 1;
  SELECT id INTO v_project_2 FROM projects WHERE name = 'Palm Residences' LIMIT 1;
  SELECT id INTO v_project_3 FROM projects WHERE name = 'Downtown Lofts' LIMIT 1;
  SELECT id INTO v_project_4 FROM projects WHERE name = 'Skyline Plaza' LIMIT 1;
  
  -- Only seed if projects exist and investor has no holdings yet
  IF v_project_1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM holdings WHERE investor_id = p_investor_id) THEN
    -- Insert holdings
    INSERT INTO holdings (investor_id, project_id, unit_ref, invested_amount, current_value, status, created_at) VALUES
      (p_investor_id, v_project_1, 'MH-A-2204', 850000, 1105000, 'active', '2024-03-15 00:00:00+00'),
      (p_investor_id, v_project_2, 'PR-B-1105', 620000, 750200, 'active', '2024-06-01 00:00:00+00'),
      (p_investor_id, v_project_3, 'DL-P-0803', 480000, 595800, 'active', '2024-08-20 00:00:00+00'),
      (p_investor_id, v_project_4, 'SP-T-3301', 500000, 676500, 'pending', '2025-01-05 00:00:00+00');

    -- Insert payments
    INSERT INTO payments (investor_id, project_id, due_date, amount, status, note) VALUES
      (p_investor_id, v_project_1, '2024-03-15', 170000, 'paid', 'Initial deposit - 20%'),
      (p_investor_id, v_project_1, '2024-09-15', 340000, 'paid', 'Construction milestone - 40%'),
      (p_investor_id, v_project_2, '2024-06-01', 124000, 'paid', 'Initial deposit - 20%'),
      (p_investor_id, v_project_2, '2025-01-01', 186000, 'paid', 'Second installment - 30%'),
      (p_investor_id, v_project_3, '2024-08-20', 96000, 'paid', 'Initial deposit - 20%'),
      (p_investor_id, v_project_1, '2026-03-15', 340000, 'due', 'Final payment - 40%'),
      (p_investor_id, v_project_3, '2025-01-10', 144000, 'overdue', 'Second installment - 30%'),
      (p_investor_id, v_project_4, '2025-02-05', 100000, 'due', 'Initial deposit - 20%');

    -- Insert documents
    INSERT INTO documents (investor_id, project_id, category, title, file_url) VALUES
      (p_investor_id, v_project_1, 'Contracts', 'Marina Heights - Sales Purchase Agreement', '/documents/mh-spa.pdf'),
      (p_investor_id, v_project_2, 'Contracts', 'Palm Residences - Sales Purchase Agreement', '/documents/pr-spa.pdf'),
      (p_investor_id, v_project_3, 'Contracts', 'Downtown Lofts - Sales Purchase Agreement', '/documents/dl-spa.pdf'),
      (p_investor_id, v_project_1, 'Receipts', 'Marina Heights - Deposit Receipt', '/documents/mh-receipt-1.pdf'),
      (p_investor_id, v_project_1, 'Receipts', 'Marina Heights - Milestone Payment Receipt', '/documents/mh-receipt-2.pdf'),
      (p_investor_id, v_project_2, 'Receipts', 'Palm Residences - Deposit Receipt', '/documents/pr-receipt-1.pdf'),
      (p_investor_id, NULL, 'Statements', 'Q4 2024 Portfolio Statement', '/documents/q4-2024-statement.pdf'),
      (p_investor_id, NULL, 'Statements', 'Q3 2024 Portfolio Statement', '/documents/q3-2024-statement.pdf'),
      (p_investor_id, NULL, 'Statements', 'Annual Investment Summary 2024', '/documents/annual-2024.pdf'),
      (p_investor_id, v_project_1, 'Project Brochures', 'Marina Heights Tower - Luxury Brochure', '/documents/mh-brochure.pdf'),
      (p_investor_id, v_project_2, 'Project Brochures', 'Palm Residences - Collection Brochure', '/documents/pr-brochure.pdf'),
      (p_investor_id, v_project_3, 'Project Brochures', 'Downtown Lofts - Urban Living Guide', '/documents/dl-brochure.pdf');
  END IF;
END;
$$;

-- Update the handle_new_user function to also seed demo data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_investor_id uuid;
    v_thread_id uuid;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
    
    -- Create investor record and get the ID
    INSERT INTO public.investors (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email)
    RETURNING id INTO v_investor_id;
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- Seed demo data for this investor
    PERFORM seed_demo_data_for_investor(v_investor_id);
    
    -- Create initial chat thread with welcome messages
    INSERT INTO public.chat_threads (investor_id, title)
    VALUES (v_investor_id, 'Welcome Conversation')
    RETURNING id INTO v_thread_id;
    
    INSERT INTO public.chat_messages (thread_id, role, content, created_at) VALUES
      (v_thread_id, 'assistant', 'Good morning! Welcome to Ghazal. I am your personal AI concierge. How may I assist you with your investment portfolio today?', now() - interval '30 minutes'),
      (v_thread_id, 'user', 'Hi! Can you give me an overview of my current investments?', now() - interval '28 minutes'),
      (v_thread_id, 'assistant', 'Of course! You currently have investments in 4 premium Dubai properties with a combined value of AED 3.1M. Your portfolio has appreciated 27.7% since initial investment. Would you like a detailed breakdown by property?', now() - interval '27 minutes'),
      (v_thread_id, 'user', 'Yes please, especially Marina Heights', now() - interval '25 minutes'),
      (v_thread_id, 'assistant', E'Marina Heights Tower (Unit MH-A-2204) is your flagship investment:\n• Invested: $850,000\n• Current Value: $1,105,000\n• Gain: +30%\n• Status: Active\n\nConstruction is 85% complete with handover expected Q2 2026. This unit has shown the strongest appreciation in your portfolio.', now() - interval '24 minutes'),
      (v_thread_id, 'user', 'That is great news! Any upcoming payments I should be aware of?', now() - interval '20 minutes'),
      (v_thread_id, 'assistant', E'You have 3 upcoming payments:\n\n1. Downtown Lofts - $144,000 (OVERDUE - was due Jan 10)\n2. Skyline Plaza - $100,000 (Due Feb 5)\n3. Marina Heights - $340,000 (Due Mar 15)\n\nI recommend prioritizing the Downtown Lofts payment. Shall I connect you with your account manager?', now() - interval '19 minutes'),
      (v_thread_id, 'user', 'Yes, please arrange a call for tomorrow', now() - interval '15 minutes'),
      (v_thread_id, 'assistant', 'I have scheduled a call with your dedicated account manager, Sarah Ahmed, for tomorrow at 11:00 AM Dubai time. You will receive a calendar invite shortly. Is there anything specific you would like to discuss during the call?', now() - interval '14 minutes'),
      (v_thread_id, 'user', 'Just the payment plan options. Thank you!', now() - interval '10 minutes');
    
    RETURN NEW;
END;
$$;-- Fix the seed_demo_data_for_investor function to use valid document categories
CREATE OR REPLACE FUNCTION public.seed_demo_data_for_investor(p_investor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_ids uuid[];
BEGIN
  -- Get all project IDs
  SELECT ARRAY(SELECT id FROM projects ORDER BY created_at LIMIT 4) INTO v_project_ids;
  
  -- Only seed if we have projects
  IF array_length(v_project_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Insert holdings
  INSERT INTO holdings (investor_id, project_id, unit_ref, invested_amount, current_value, status)
  VALUES
    (p_investor_id, v_project_ids[1], 'Unit A-101', 2500000, 2875000, 'active'),
    (p_investor_id, v_project_ids[1], 'Unit A-205', 1800000, 2070000, 'active'),
    (p_investor_id, v_project_ids[2], 'Villa 12', 5500000, 6325000, 'active'),
    (p_investor_id, v_project_ids[3], 'Penthouse 3', 8200000, 9020000, 'active');

  -- Insert payments with various statuses
  INSERT INTO payments (investor_id, project_id, amount, due_date, status, note)
  VALUES
    (p_investor_id, v_project_ids[1], 250000, CURRENT_DATE - INTERVAL '60 days', 'paid', 'Initial deposit'),
    (p_investor_id, v_project_ids[1], 500000, CURRENT_DATE - INTERVAL '30 days', 'paid', 'First installment'),
    (p_investor_id, v_project_ids[1], 500000, CURRENT_DATE + INTERVAL '15 days', 'due', 'Second installment'),
    (p_investor_id, v_project_ids[2], 550000, CURRENT_DATE - INTERVAL '45 days', 'paid', 'Booking amount'),
    (p_investor_id, v_project_ids[2], 1100000, CURRENT_DATE - INTERVAL '5 days', 'overdue', 'Construction milestone'),
    (p_investor_id, v_project_ids[2], 1100000, CURRENT_DATE + INTERVAL '30 days', 'due', 'Second milestone'),
    (p_investor_id, v_project_ids[3], 820000, CURRENT_DATE - INTERVAL '20 days', 'paid', 'Reservation fee'),
    (p_investor_id, v_project_ids[3], 1640000, CURRENT_DATE + INTERVAL '45 days', 'due', 'First payment');

  -- Insert documents with VALID categories (contracts, receipts, statements, brochures)
  INSERT INTO documents (investor_id, project_id, title, category, file_url)
  VALUES
    (p_investor_id, v_project_ids[1], 'Sales Purchase Agreement - Unit A-101', 'contracts', '/docs/spa-a101.pdf'),
    (p_investor_id, v_project_ids[1], 'Sales Purchase Agreement - Unit A-205', 'contracts', '/docs/spa-a205.pdf'),
    (p_investor_id, v_project_ids[2], 'Villa 12 Contract', 'contracts', '/docs/villa12-contract.pdf'),
    (p_investor_id, v_project_ids[3], 'Penthouse Reservation Agreement', 'contracts', '/docs/ph3-reservation.pdf'),
    (p_investor_id, v_project_ids[1], 'Payment Receipt - Jan 2025', 'receipts', '/docs/receipt-jan25.pdf'),
    (p_investor_id, v_project_ids[1], 'Payment Receipt - Feb 2025', 'receipts', '/docs/receipt-feb25.pdf'),
    (p_investor_id, v_project_ids[2], 'Booking Receipt', 'receipts', '/docs/booking-receipt.pdf'),
    (p_investor_id, v_project_ids[3], 'Reservation Receipt', 'receipts', '/docs/res-receipt.pdf'),
    (p_investor_id, v_project_ids[1], 'Q4 2024 Investment Statement', 'statements', '/docs/q4-2024-statement.pdf'),
    (p_investor_id, v_project_ids[2], '2024 Annual Statement', 'statements', '/docs/annual-2024.pdf'),
    (p_investor_id, v_project_ids[1], 'Project Brochure - Marina Heights', 'brochures', '/docs/marina-brochure.pdf'),
    (p_investor_id, v_project_ids[2], 'Villa Collection Brochure', 'brochures', '/docs/villa-brochure.pdf');
END;
$$;-- Create access_requests table for investor access requests
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
ALTER TABLE public.investors ALTER COLUMN user_id DROP NOT NULL;-- Update handle_new_user to check for existing investor records first
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_investor_id uuid;
    v_thread_id uuid;
    v_existing_investor_id uuid;
BEGIN
    -- Check if there's an existing investor with matching email (created by admin)
    SELECT id INTO v_existing_investor_id
    FROM public.investors
    WHERE email = NEW.email AND user_id IS NULL
    LIMIT 1;
    
    IF v_existing_investor_id IS NOT NULL THEN
        -- Link existing investor to this user
        UPDATE public.investors
        SET user_id = NEW.id
        WHERE id = v_existing_investor_id;
        
        v_investor_id := v_existing_investor_id;
        
        -- Create profile
        INSERT INTO public.profiles (user_id, email, full_name)
        VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
        
        -- Assign default user role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user');
    ELSE
        -- Create profile
        INSERT INTO public.profiles (user_id, email, full_name)
        VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
        
        -- Create investor record and get the ID
        INSERT INTO public.investors (user_id, name, email)
        VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email)
        RETURNING id INTO v_investor_id;
        
        -- Assign default user role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user');
        
        -- Seed demo data for new investor
        PERFORM seed_demo_data_for_investor(v_investor_id);
    END IF;
    
    -- Create initial chat thread with welcome messages
    INSERT INTO public.chat_threads (investor_id, title)
    VALUES (v_investor_id, 'Welcome Conversation')
    RETURNING id INTO v_thread_id;
    
    INSERT INTO public.chat_messages (thread_id, role, content, created_at) VALUES
      (v_thread_id, 'assistant', 'Good morning! Welcome to Ghazal. I am your personal AI concierge. How may I assist you with your investment portfolio today?', now() - interval '30 minutes'),
      (v_thread_id, 'user', 'Hi! Can you give me an overview of my current investments?', now() - interval '28 minutes'),
      (v_thread_id, 'assistant', 'Of course! You currently have investments in premium Dubai properties. Would you like a detailed breakdown by property?', now() - interval '27 minutes');
    
    RETURN NEW;
END;
$$;-- Allow investors to insert their own holdings
CREATE POLICY "Users can insert their own holdings"
ON public.holdings FOR INSERT
TO authenticated
WITH CHECK (investor_id = public.get_investor_id());

-- Allow investors to insert their own documents
CREATE POLICY "Users can insert their own documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (investor_id = public.get_investor_id());

-- Allow investors to update their own payments (to mark as paid)
CREATE POLICY "Users can update their own payments"
ON public.payments FOR UPDATE
TO authenticated
USING (investor_id = public.get_investor_id())
WITH CHECK (investor_id = public.get_investor_id());

-- Add invitation tracking to investors table
ALTER TABLE public.investors 
ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz DEFAULT NULL;-- Policy for admins to manage user roles
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));-- Allow admins to manage investors
CREATE POLICY "Admins can manage investors"
ON public.investors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
