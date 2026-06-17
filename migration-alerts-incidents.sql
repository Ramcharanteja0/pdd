-- CrowdIQ — Fix alerts & incidents schema
-- Run in: Supabase Dashboard → SQL Editor → New Query

-- 1. Fix alerts table: add resolved_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'alerts' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE public.alerts ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;

-- Ensure resolved column exists and defaults to false
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'alerts' AND column_name = 'resolved'
  ) THEN
    ALTER TABLE public.alerts ADD COLUMN resolved boolean DEFAULT false;
  END IF;
END $$;

-- 2. Fix incidents table: add resolved_at and severity columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'incidents' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'incidents' AND column_name = 'severity'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN severity text DEFAULT 'medium';
  END IF;
END $$;

-- 3. Enable RLS on alerts with open write policy
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on alerts" ON public.alerts;
CREATE POLICY "Allow all on alerts"
  ON public.alerts FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Enable RLS on incidents with open write policy
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on incidents" ON public.incidents;
CREATE POLICY "Allow all on incidents"
  ON public.incidents FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Enable Realtime on both tables (required for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
