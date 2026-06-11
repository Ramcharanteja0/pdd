-- CrowdIQ v2 — Event Setup Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Adds venue_lat/venue_lng columns to events table for admin-configured locations

-- Ensure events table has venue coordinate columns
DO $$
BEGIN
  -- Add venue_lat if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'venue_lat'
  ) THEN
    ALTER TABLE public.events ADD COLUMN venue_lat double precision;
  END IF;

  -- Add venue_lng if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'venue_lng'
  ) THEN
    ALTER TABLE public.events ADD COLUMN venue_lng double precision;
  END IF;
END $$;

-- Ensure zones table has radius_meters if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'zones' AND column_name = 'radius_meters'
  ) THEN
    ALTER TABLE public.zones ADD COLUMN radius_meters integer DEFAULT 50;
  END IF;
END $$;
