-- 1. Fix RLS on tenant_inventory
-- Redefine the policy to be more robust for admins
DROP POLICY IF EXISTS "Admins can manage their tenant inventory" ON public.tenant_inventory;

CREATE POLICY "Admins can manage their tenant inventory" 
ON public.tenant_inventory
FOR ALL 
USING (
  (public.is_admin_of_tenant(tenant_id)) OR 
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- 2. Update monthly_pick_items constraint to allow 'custom'
ALTER TABLE public.monthly_pick_items DROP CONSTRAINT IF EXISTS monthly_pick_items_project_source_check;
ALTER TABLE public.monthly_pick_items ADD CONSTRAINT monthly_pick_items_project_source_check CHECK (project_source IN ('reelly', 'demo', 'custom'));

-- 3. Comprehensive Seeding Script
DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
  v_investor_id UUID;
  v_user_id UUID;
  v_project_atlantis UUID;
  v_project_burj UUID;
  v_project_one UUID;
  v_project_marina UUID;
  v_custom_project_1 UUID;
  v_custom_project_2 UUID;
BEGIN
  -- A. Ensure Tenant exists
  INSERT INTO public.tenants (id, subdomain, broker_name)
  VALUES (v_tenant_id, 'realsight', 'RealSight Official')
  ON CONFLICT (id) DO NOTHING;

  -- B. Find or Create a Target Investor
  -- Try babakwethr (correct) and then babakvetter (typo backup)
  SELECT user_id INTO v_user_id FROM public.profiles WHERE email = 'babakwethr@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id FROM public.profiles WHERE email = 'babakvetter@gmail.com' LIMIT 1;
  END IF;
  
  -- Fallback: if no user found yet, try any user who might be an admin or owner
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id FROM public.profiles LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    -- Ensure investor record exists for this user
    INSERT INTO public.investors (user_id, name, email, tenant_id)
    VALUES (v_user_id, 'Premium Investor', (SELECT email FROM public.profiles WHERE user_id = v_user_id LIMIT 1), v_tenant_id)
    ON CONFLICT (user_id) DO UPDATE SET tenant_id = v_tenant_id
    RETURNING id INTO v_investor_id;
  END IF;

  IF v_investor_id IS NULL THEN
    -- Try to find any investor record globally
    SELECT id INTO v_investor_id FROM public.investors LIMIT 1;
  END IF;

  -- C. Create High-End Projects
  INSERT INTO public.projects (name, location, developer, starting_price, description, tenant_id, image_url)
  VALUES 
  ('Atlantis The Royal Residences', 'Palm Jumeirah, Dubai', 'Kerzner International', 45000000, 'Ultra-luxury sky courts and penthouses.', v_tenant_id, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1600'),
  ('Burj Khalifa Armani Residences', 'Downtown Dubai', 'Emaar Properties', 35000000, 'Exclusive Armani-designed residences.', v_tenant_id, 'https://images.unsplash.com/photo-1541913080-214aa644cd83?auto=format&fit=crop&q=80&w=1600'),
  ('One Za''abeel The Residences', 'Za''abeel, Dubai', 'Ithra Dubai', 25000000, 'Iconic twin-tower development with the world''s longest cantilever.', v_tenant_id, 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1600'),
  ('Marina Gate Penthouse', 'Dubai Marina', 'Select Group', 15000000, 'Super-luxury penthouse with panoramic marina views.', v_tenant_id, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1600')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_project_atlantis FROM public.projects WHERE name = 'Atlantis The Royal Residences' LIMIT 1;
  SELECT id INTO v_project_burj FROM public.projects WHERE name = 'Burj Khalifa Armani Residences' LIMIT 1;
  SELECT id INTO v_project_one FROM public.projects WHERE name = 'One Za''abeel The Residences' LIMIT 1;
  SELECT id INTO v_project_marina FROM public.projects WHERE name = 'Marina Gate Penthouse' LIMIT 1;

  -- D. Seed Holdings if investor exists (~$120M total)
  IF v_investor_id IS NOT NULL THEN
    INSERT INTO public.holdings (investor_id, project_id, unit_ref, invested_amount, current_value, status)
    VALUES 
    (v_investor_id, v_project_atlantis, 'PH-01', 45000000, 48500000, 'active'),
    (v_investor_id, v_project_burj, 'AR-88', 35000000, 36200000, 'active'),
    (v_investor_id, v_project_one, 'OZ-102', 25000000, 25800000, 'active'),
    (v_investor_id, v_project_marina, 'MG-P05', 15000000, 16100000, 'active')
    ON CONFLICT DO NOTHING;

    -- E. Seed Payments
    INSERT INTO public.payments (investor_id, project_id, due_date, amount, status, note)
    VALUES 
    (v_investor_id, v_project_atlantis, current_date + interval '30 days', 2500000, 'due', 'Installment 4/10'),
    (v_investor_id, v_project_atlantis, current_date - interval '60 days', 2500000, 'paid', 'Installment 3/10'),
    (v_investor_id, v_project_burj, current_date + interval '15 days', 1800000, 'due', 'Service Charge 2026'),
    (v_investor_id, v_project_one, current_date + interval '90 days', 5000000, 'due', 'Construction Milestone 12')
    ON CONFLICT DO NOTHING;

    -- F. Seed Documents
    INSERT INTO public.documents (investor_id, project_id, category, title, file_url)
    VALUES 
    (v_investor_id, v_project_atlantis, 'contracts', 'Sales & Purchase Agreement', 'https://example.com/spa.pdf'),
    (v_investor_id, v_project_atlantis, 'statements', 'Payment Receipt - Jan 2026', 'https://example.com/receipt.pdf'),
    (v_investor_id, v_project_marina, 'brochures', 'Project Brochure - Legacy Marina', 'https://example.com/brochure.pdf')
    ON CONFLICT DO NOTHING;
  END IF;

  -- G. Seed Latest Updates
  INSERT INTO public.updates (project_id, title, summary)
  VALUES 
  (v_project_atlantis, 'Construction Milestone', 'Sky courts glass installation is now 95% complete.'),
  (v_project_one, 'Internal Fit-out Started', 'Premium interior work in progress.'),
  (v_project_marina, 'Handover Window Confirmed', 'Official handover scheduled for Q4 2026.')
  ON CONFLICT DO NOTHING;

  -- H. Seed Custom Projects
  INSERT INTO public.custom_projects (name, developer, district, city, starting_price, property_category, tenant_id, media)
  VALUES 
  ('Exclusive Palm Mansion', 'Luxury Estates', 'Palm Jumeirah', 'Dubai', 85000000, 'Secondary Market', v_tenant_id, 
   '{"cover_image": "https://images.unsplash.com/photo-1628744276229-47e443ce0ee0?auto=format&fit=crop&q=80&w=1600", "gallery": ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1600"]}'::jsonb),
  ('Business Bay Sky Villa', 'Premium Living', 'Business Bay', 'Dubai', 32000000, 'Off-plan', v_tenant_id,
   '{"cover_image": "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&q=80&w=1600", "gallery": ["https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1600"]}'::jsonb)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_custom_project_1 FROM public.custom_projects WHERE name = 'Exclusive Palm Mansion' LIMIT 1;
  SELECT id INTO v_custom_project_2 FROM public.custom_projects WHERE name = 'Business Bay Sky Villa' LIMIT 1;

  -- I. Seed Monthly Picks
  INSERT INTO public.monthly_picks (title, month, tenant_id)
  VALUES ('Top Luxury Picks - March 2026', '2026-03', v_tenant_id)
  ON CONFLICT DO NOTHING;

  DECLARE
    v_pick_id UUID;
  BEGIN
    SELECT id INTO v_pick_id FROM public.monthly_picks WHERE title = 'Top Luxury Picks - March 2026' LIMIT 1;
    
    IF v_pick_id IS NOT NULL THEN
      INSERT INTO public.monthly_pick_items (pick_id, project_id, project_source, rank, reason_1, reason_2)
      VALUES 
      (v_pick_id, v_custom_project_1::text, 'custom', 1, 'Top investment choice.', 'Exceptional Palm location.'),
      (v_pick_id, v_custom_project_2::text, 'custom', 2, 'High rental yield.', 'Premium Business Bay view.')
      ON CONFLICT DO NOTHING;
    END IF;
  END;

END $$;
