-- Update handle_new_user to check for existing investor records first
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
$$;