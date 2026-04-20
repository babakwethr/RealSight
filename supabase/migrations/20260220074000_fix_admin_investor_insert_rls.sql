-- Fix investors RLS: replace all policies with correct set
-- Previous policies blocked admin INSERT (user_id = auth.uid() check failed for null user_id)

DROP POLICY IF EXISTS "Admins can manage investors" ON public.investors;
DROP POLICY IF EXISTS "Users can view their own investor record" ON public.investors;
DROP POLICY IF EXISTS "Users can update their own investor record" ON public.investors;
DROP POLICY IF EXISTS "Users can insert their own investor record" ON public.investors;

-- SELECT: own record or admin
CREATE POLICY "investors_select"
ON public.investors FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- INSERT: own record (user_id matches) OR admin (user_id can be null)
CREATE POLICY "investors_insert"
ON public.investors FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- UPDATE: own record or admin
CREATE POLICY "investors_update"
ON public.investors FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- DELETE: admin only
CREATE POLICY "investors_delete"
ON public.investors FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
