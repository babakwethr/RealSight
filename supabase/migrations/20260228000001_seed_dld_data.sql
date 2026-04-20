-- Seed data for DLD (Dubai Land Department) Intelligence Simulation

-- 1. Insert Top Areas
INSERT INTO public.dld_areas (name, avg_price_per_sqft_current, avg_price_per_sqft_12m_ago, transaction_volume_30d, rental_yield_avg, demand_score, supply_pipeline_units)
VALUES
('Downtown Dubai', 2850, 2450, 420, 5.8, 92, 1200),
('Business Bay', 2100, 1850, 580, 6.2, 88, 3500),
('Dubai Marina', 2300, 2050, 310, 6.5, 85, 800),
('Jumeirah Village Circle (JVC)', 1250, 1050, 850, 7.8, 95, 8500),
('Palm Jumeirah', 4500, 3800, 150, 4.5, 98, 400),
('Dubai Creek Harbour', 2200, 1900, 480, 5.5, 87, 4500),
('Jumeirah Golf Estates', 1850, 1600, 120, 5.2, 80, 600),
('Dubai Hills Estate', 2400, 2050, 350, 6.0, 90, 2200);

-- 2. Insert Developers
INSERT INTO public.dld_developers (name, license_number, total_projects_completed, total_projects_delayed, avg_delay_months, reliability_score)
VALUES
('Emaar Properties', 'DEV-001', 150, 5, 2.5, 96),
('Nakheel', 'DEV-002', 85, 12, 6.0, 82),
('Damac Properties', 'DEV-003', 95, 20, 8.5, 78),
('Sobha Realty', 'DEV-004', 25, 1, 1.5, 94),
('Meraas', 'DEV-005', 40, 3, 3.0, 88),
('Dubai Properties', 'DEV-006', 70, 8, 4.5, 85),
('Binghatti Developers', 'DEV-007', 35, 2, 2.0, 91),
('Azizi Developments', 'DEV-008', 45, 15, 12.0, 65);

-- 3. Insert Simulated Transactions (Using random IDs mapping back to areas)
DO $$
DECLARE
  area_downtown UUID;
  area_jvc UUID;
  area_palm UUID;
  area_marina UUID;
  area_dubai_hills UUID;
BEGIN
  SELECT id INTO area_downtown FROM public.dld_areas WHERE name = 'Downtown Dubai' LIMIT 1;
  SELECT id INTO area_jvc FROM public.dld_areas WHERE name = 'Jumeirah Village Circle (JVC)' LIMIT 1;
  SELECT id INTO area_palm FROM public.dld_areas WHERE name = 'Palm Jumeirah' LIMIT 1;
  SELECT id INTO area_marina FROM public.dld_areas WHERE name = 'Dubai Marina' LIMIT 1;
  SELECT id INTO area_dubai_hills FROM public.dld_areas WHERE name = 'Dubai Hills Estate' LIMIT 1;

  -- 1. Downtown Transactions
  INSERT INTO public.dld_transactions (transaction_number, area_id, project_name, property_type, transaction_type, status, price, size_sqft, price_per_sqft, transaction_date, buyer_nationality)
  VALUES
  ('TXN-DWT-001', area_downtown, 'Burj Khalifa', 'Apartment', 'Sales', 'Ready', 5500000, 1800, 3055, current_date - interval '2 days', 'United Kingdom'),
  ('TXN-DWT-002', area_downtown, 'Boulevard Point', 'Apartment', 'Sales', 'Ready', 3200000, 1200, 2666, current_date - interval '5 days', 'India'),
  ('TXN-DWT-003', area_downtown, 'Opera Grand', 'Apartment', 'Mortgage', 'Off-Plan', 4800000, 1600, 3000, current_date - interval '10 days', 'Russia'),
  ('TXN-DWT-004', area_downtown, 'Vida Residences', 'Apartment', 'Sales', 'Off-Plan', 2900000, 950, 3052, current_date - interval '12 days', 'Germany');

  -- 2. JVC Transactions
  INSERT INTO public.dld_transactions (transaction_number, area_id, project_name, property_type, transaction_type, status, price, size_sqft, price_per_sqft, transaction_date, buyer_nationality)
  VALUES
  ('TXN-JVC-001', area_jvc, 'Binghatti Nova', 'Apartment', 'Sales', 'Off-Plan', 850000, 650, 1307, current_date - interval '1 day', 'Pakistan'),
  ('TXN-JVC-002', area_jvc, 'District 13 Townhouses', 'Townhouse', 'Mortgage', 'Ready', 2400000, 2200, 1090, current_date - interval '3 days', 'United Arab Emirates'),
  ('TXN-JVC-003', area_jvc, 'Ellington Belgravia', 'Apartment', 'Sales', 'Ready', 1450000, 980, 1479, current_date - interval '8 days', 'United Kingdom'),
  ('TXN-JVC-004', area_jvc, 'Five JVC', 'Apartment', 'Sales', 'Ready', 1800000, 1100, 1636, current_date - interval '15 days', 'France');

  -- 3. Palm Jumeirah Transactions
  INSERT INTO public.dld_transactions (transaction_number, area_id, project_name, property_type, transaction_type, status, price, size_sqft, price_per_sqft, transaction_date, buyer_nationality)
  VALUES
  ('TXN-PLM-001', area_palm, 'Signature Villas', 'Villa', 'Sales', 'Ready', 35000000, 7000, 5000, current_date - interval '4 days', 'Russia'),
  ('TXN-PLM-002', area_palm, 'Serenia Residences', 'Apartment', 'Mortgage', 'Ready', 8500000, 2100, 4047, current_date - interval '7 days', 'United Kingdom'),
  ('TXN-PLM-003', area_palm, 'Atlantis The Royal', 'Apartment', 'Sales', 'Ready', 18000000, 3200, 5625, current_date - interval '11 days', 'China');

  -- 4. Dubai Marina Transactions
  INSERT INTO public.dld_transactions (transaction_number, area_id, project_name, property_type, transaction_type, status, price, size_sqft, price_per_sqft, transaction_date, buyer_nationality)
  VALUES
  ('TXN-MAR-001', area_marina, 'Marina Gate', 'Apartment', 'Sales', 'Ready', 4200000, 1650, 2545, current_date - interval '1 day', 'Germany'),
  ('TXN-MAR-002', area_marina, 'Cayan Tower', 'Apartment', 'Mortgage', 'Ready', 3100000, 1300, 2384, current_date - interval '6 days', 'Italy'),
  ('TXN-MAR-003', area_marina, 'LIV Residence', 'Apartment', 'Sales', 'Off-Plan', 2800000, 1100, 2545, current_date - interval '14 days', 'United Kingdom');

  -- 5. Dubai Hills Transactions
  INSERT INTO public.dld_transactions (transaction_number, area_id, project_name, property_type, transaction_type, status, price, size_sqft, price_per_sqft, transaction_date, buyer_nationality)
  VALUES
  ('TXN-DHL-001', area_dubai_hills, 'Maple Townhouses', 'Townhouse', 'Sales', 'Ready', 3800000, 2200, 1727, current_date - interval '2 days', 'India'),
  ('TXN-DHL-002', area_dubai_hills, 'Park Heights', 'Apartment', 'Mortgage', 'Ready', 1850000, 950, 1947, current_date - interval '5 days', 'United Arab Emirates'),
  ('TXN-DHL-003', area_dubai_hills, 'Golf Place', 'Villa', 'Sales', 'Off-Plan', 12500000, 5500, 2272, current_date - interval '9 days', 'Saudi Arabia');
END $$;
