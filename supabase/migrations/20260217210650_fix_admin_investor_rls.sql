-- Allow admins to manage investors
CREATE POLICY "Admins can manage investors"
ON public.investors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
