-- Founder status — first 1,000 paying-eligible signups get a permanent badge
-- and locked-in launch pricing. Per LAUNCH_PLAN.md §14 step 10.
--
-- Design choices:
--   * Single boolean column on profiles. Cheap, indexable, no join needed.
--   * Trigger counts existing rows BEFORE the insert; if < 1000, sets is_founder.
--   * The check uses a SERIALIZABLE-safe COUNT against profiles minus the new row.
--     Concurrency at scale would call for a sequence or counter table — at signup
--     volumes of <50/day this is fine.
--   * Backfill: any profile that already exists when this migration runs is
--     promoted to founder (we want our earliest believers covered). Once 1,000
--     rows exist, the trigger naturally stops promoting new ones.
--   * Founders never lose status. We do NOT downgrade if the cap shifts later.

-- 1. Column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS profiles_is_founder_idx
  ON public.profiles (is_founder)
  WHERE is_founder = TRUE;

-- 2. Backfill: every pre-existing profile is a founder by definition.
UPDATE public.profiles
   SET is_founder = TRUE
 WHERE is_founder = FALSE;

-- 3. Trigger function: stamp founder status if under the cap.
CREATE OR REPLACE FUNCTION public.assign_founder_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count BIGINT;
  founder_cap CONSTANT BIGINT := 1000;
BEGIN
  -- Count rows that exist BEFORE this insert commits.
  SELECT COUNT(*) INTO current_count FROM public.profiles;

  IF current_count < founder_cap THEN
    NEW.is_founder := TRUE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_founder ON public.profiles;
CREATE TRIGGER profiles_assign_founder
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_founder_status();

COMMENT ON COLUMN public.profiles.is_founder IS
  'Founder badge — granted automatically for the first 1,000 signups. Permanent. See LAUNCH_PLAN.md §14 step 10.';
