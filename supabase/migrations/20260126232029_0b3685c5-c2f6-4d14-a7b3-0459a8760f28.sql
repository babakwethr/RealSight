-- Allow investors to insert their own holdings
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
ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz DEFAULT NULL;