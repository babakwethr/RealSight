-- Nightly refresh of the DLD building catalogue.
--
-- Strategy: re-ingest the most-recent 50 000 DLD transactions every
-- night. Existing buildings have their transaction_count incremented
-- and last_seen_date refreshed; new buildings get inserted.
--
-- 50 000 rows / night catches newly-launched buildings + brand-new
-- transactions for existing ones without re-paging the entire DLD
-- archive every night. Full backfill is run on demand via
-- scripts/dld-catalogue-refresh.sh.
--
-- Implementation: pg_cron fires `refresh_dld_catalogue_nightly()`,
-- which uses pg_net to invoke the dld-catalogue-build edge function
-- 10 times sequentially (10 × 5000 = 50 000 rows).

CREATE TABLE IF NOT EXISTS public.dld_catalogue_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.dld_catalogue_config ENABLE ROW LEVEL SECURITY;

-- The anon key is already shipped in the frontend bundle. We just need
-- a valid JWT for the edge function call; storing it here is fine.
-- Replace the seed values below for non-prod environments.
INSERT INTO public.dld_catalogue_config(key, value) VALUES (
  'anon_jwt',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYnZqdm5nemZ2bXd5d2N1c2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzg5MjQsImV4cCI6MjA5MjAxNDkyNH0.OivfByeDMjYmRWP5ewZnQ6b3qw0z17i2fkwWNRXCz5I'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.dld_catalogue_config(key, value) VALUES (
  'supabase_url',
  'https://ojbvjvngzfvmwywcusec.supabase.co'
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public._dld_catalogue_invoke_batch(p_offset int, p_batches int DEFAULT 5)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  base_url text;
  jwt      text;
  req_id   bigint;
BEGIN
  SELECT value INTO base_url FROM public.dld_catalogue_config WHERE key='supabase_url';
  SELECT value INTO jwt      FROM public.dld_catalogue_config WHERE key='anon_jwt';
  IF base_url IS NULL OR jwt IS NULL THEN
    RAISE EXCEPTION 'dld_catalogue_config missing supabase_url or anon_jwt';
  END IF;

  SELECT net.http_post(
    url     := base_url || '/functions/v1/dld-catalogue-build',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || jwt,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'offset',   p_offset,
      'batches',  p_batches,
      'pageSize', 1000
    ),
    timeout_milliseconds := 150000
  ) INTO req_id;

  RETURN req_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_dld_catalogue_nightly()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  job_id     uuid;
  cur_offset int := 0;
  req_id     bigint;
  resp_row   record;
  done_flag  boolean := false;
  rounds     int := 0;
  max_rounds int := 10;
BEGIN
  INSERT INTO public.dld_catalogue_jobs(status, started_at)
       VALUES ('running', now())
    RETURNING id INTO job_id;

  WHILE NOT done_flag AND rounds < max_rounds LOOP
    rounds := rounds + 1;
    req_id := public._dld_catalogue_invoke_batch(cur_offset, 5);

    FOR i IN 1..36 LOOP
      PERFORM pg_sleep(5);
      SELECT * INTO resp_row FROM net._http_response WHERE id = req_id;
      EXIT WHEN resp_row.status_code IS NOT NULL;
    END LOOP;

    IF resp_row.status_code IS NULL THEN
      UPDATE public.dld_catalogue_jobs
         SET status='timeout', finished_at=now(), last_offset=cur_offset
       WHERE id = job_id;
      RAISE EXCEPTION 'dld-catalogue-build did not respond within 180s';
    END IF;

    IF resp_row.status_code >= 300 THEN
      UPDATE public.dld_catalogue_jobs
         SET status='error', finished_at=now(), last_offset=cur_offset
       WHERE id = job_id;
      RAISE EXCEPTION 'dld-catalogue-build returned %: %', resp_row.status_code, resp_row.content;
    END IF;

    DECLARE
      body_json jsonb := resp_row.content::jsonb;
      nxt int := NULLIF(body_json->>'next_offset','')::int;
      d   boolean := COALESCE((body_json->>'done')::boolean, false);
    BEGIN
      done_flag := d OR nxt IS NULL;
      IF nxt IS NOT NULL THEN cur_offset := nxt; END IF;
    END;
  END LOOP;

  UPDATE public.dld_catalogue_jobs
     SET status='done', finished_at=now(), last_offset=cur_offset
   WHERE id = job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_dld_catalogue_nightly() TO postgres;

-- Schedule the nightly job at 02:30 UAE time (= 22:30 UTC).
SELECT cron.unschedule('dld-catalogue-nightly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='dld-catalogue-nightly');

SELECT cron.schedule(
  'dld-catalogue-nightly',
  '30 22 * * *',
  $cron$ SELECT public.refresh_dld_catalogue_nightly(); $cron$
);
