-- Allow anonymous (public) read access to market data tables
-- This enables the home page to show real DLD data without requiring login
-- Per REALSIGHT_MASTER_SPEC.md: home page market data is FREE and PUBLIC

-- dld_areas: area-level market statistics
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dld_areas' AND policyname = 'Public read access for dld_areas'
  ) THEN
    CREATE POLICY "Public read access for dld_areas"
      ON dld_areas FOR SELECT USING (true);
  END IF;
END $$;

-- dld_developers: developer reliability rankings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dld_developers' AND policyname = 'Public read access for dld_developers'
  ) THEN
    CREATE POLICY "Public read access for dld_developers"
      ON dld_developers FOR SELECT USING (true);
  END IF;
END $$;

-- dubai_market_index_series: historical market index
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dubai_market_index_series' AND policyname = 'Public read access for market index'
  ) THEN
    CREATE POLICY "Public read access for market index"
      ON dubai_market_index_series FOR SELECT USING (true);
  END IF;
END $$;
