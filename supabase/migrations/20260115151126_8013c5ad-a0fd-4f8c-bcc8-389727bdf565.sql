-- Fix the seed_demo_data_for_investor function to use valid document categories
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
$$;