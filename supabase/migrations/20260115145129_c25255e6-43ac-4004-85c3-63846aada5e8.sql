-- First, let's make user_id nullable temporarily OR add a special handling
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
$$;