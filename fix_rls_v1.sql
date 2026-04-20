-- Ensure base RLS is enabled
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- Re-create helper functions with SECURITY DEFINER and explicit search_path
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

CREATE OR REPLACE FUNCTION public.get_investor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.investors WHERE user_id = auth.uid()
$$;

-- Drop existing policies if they exist to avoid conflicts (best effort)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own chat threads" ON public.chat_threads;
    DROP POLICY IF EXISTS "Users can create their own chat threads" ON public.chat_threads;
    DROP POLICY IF EXISTS "Users can update their own chat threads" ON public.chat_threads;
    DROP POLICY IF EXISTS "Users can view messages in their threads" ON public.chat_messages;
    DROP POLICY IF EXISTS "Users can insert messages in their threads" ON public.chat_messages;
END $$;

-- Apply Chat Threads Policies
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

-- Apply Chat Messages Policies
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

-- Ensure investors table allows users to view their own record (required for get_investor_id)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own investor record" ON public.investors;
END $$;

CREATE POLICY "Users can view their own investor record"
ON public.investors FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Fix for existing users that might have been created before the trigger was fully active
-- Link any investor record that matches the email but has no user_id
UPDATE public.investors i
SET user_id = u.id
FROM auth.users u
WHERE i.email = u.email AND i.user_id IS NULL;
