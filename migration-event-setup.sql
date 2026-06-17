-- CrowdIQ — Create Events Table + Venue Coordinates
-- Run in: Supabase Dashboard → SQL Editor → New Query

-- 1. Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.events (
  id              text PRIMARY KEY DEFAULT 'current',
  name            text DEFAULT 'Untitled Event',
  venue           text,
  city            text,
  date            text,
  total_capacity  integer DEFAULT 5000,
  venue_lat       double precision,
  venue_lng       double precision,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2. Enable RLS but allow all operations (admin-only page handles auth)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on events"
  ON public.events FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Insert default event row if none exists
INSERT INTO public.events (id, name, venue, city, total_capacity)
VALUES ('current', 'My Event', 'Set via Event Setup', '', 5000)
ON CONFLICT (id) DO NOTHING;

-- 4. Ensure zones table has radius_meters column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'zones' AND column_name = 'radius_meters'
  ) THEN
    ALTER TABLE public.zones ADD COLUMN radius_meters integer DEFAULT 50;
  END IF;
END $$;
