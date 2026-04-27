-- Advisor security hardening — applied 25 Apr 2026 during Step 15 final QA.
--
-- Two of the five Supabase Security Advisor warnings are mechanical:
--   • `Function Search Path Mutable` on `public.rebuild_dld_indexes`
--   • `Function Search Path Mutable` on `public.is_admin_of_tenant`
--
-- Both functions were created without an explicit `search_path`, which lets a
-- malicious user with CREATE on a same-named schema mount a search-path
-- shadowing attack. The fix is to pin `search_path` to a known list at the
-- function level. Pinning to `public, pg_temp` (rather than empty) preserves
-- the existing behaviour where the bodies reference `public.*` tables
-- without schema-qualification.
--
-- We use a DO block with `format(... %I, signature)` so it works regardless of
-- how each function was originally declared (the original CREATE statements
-- aren't in repo for `is_admin_of_tenant`, only used).
--
-- Three warnings deliberately left untouched:
--   • `RLS Policy Always True` on access_requests — that's the INSERT policy
--     for the public waitlist form (anon can submit, only admins can read).
--     The advisor flags `WITH CHECK (true)` indiscriminately; for an
--     INSERT-only public form this is the correct shape.
--   • `Public Bucket Allows Listing` on storage.project-media — confirmed
--     intentional: this bucket holds project marketing imagery shown on
--     public pages. No private data lives there.
--   • `Leaked Password Protection Disabled` — that's a dashboard toggle, not
--     a SQL setting. Founder enables in: Auth → Policies → Password security.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname  AS schema_name,
      p.proname  AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('rebuild_dld_indexes', 'is_admin_of_tenant')
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      fn.schema_name, fn.function_name, fn.args
    );
    RAISE NOTICE 'Pinned search_path on %.%(%)',
      fn.schema_name, fn.function_name, fn.args;
  END LOOP;
END $$;
