-- CrowdIQ — Complete Database Schema
-- Run this in Supabase SQL Editor to create all missing tables

-- ============================================
-- ZONES TABLE (for heatmap + density tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL DEFAULT 19.0765,
  lng DOUBLE PRECISION NOT NULL DEFAULT 72.8773,
  capacity INTEGER NOT NULL DEFAULT 500,
  density INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones_read" ON public.zones FOR SELECT USING (true);
CREATE POLICY "zones_write" ON public.zones FOR ALL USING (true);

-- Seed zones with NESCO Exhibition Centre coordinates
INSERT INTO public.zones (id, name, lat, lng, capacity, density) VALUES
  ('zone-1', 'Main Stage', 19.0765, 72.8773, 2000, 0),
  ('zone-2', 'Food Court A', 19.0770, 72.8780, 800, 0),
  ('zone-3', 'Tech Expo', 19.0760, 72.8770, 1500, 0),
  ('zone-4', 'North Entrance', 19.0775, 72.8765, 600, 0),
  ('zone-5', 'Food Court B', 19.0755, 72.8785, 700, 0),
  ('zone-6', 'Media Center', 19.0758, 72.8778, 400, 0),
  ('zone-7', 'VIP Lounge', 19.0768, 72.8768, 200, 0),
  ('zone-8', 'Registration', 19.0772, 72.8790, 500, 0),
  ('zone-9', 'Parking A', 19.0780, 72.8760, 300, 0),
  ('zone-10', 'Emergency Exit', 19.0750, 72.8775, 400, 0),
  ('zone-11', 'Workshop Hall', 19.0762, 72.8790, 600, 0),
  ('zone-12', 'South Gate', 19.0748, 72.8770, 500, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PREDICTIONS TABLE (AI predictions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone TEXT NOT NULL,
  risk TEXT NOT NULL DEFAULT 'LOW',
  prediction TEXT NOT NULL,
  action TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predictions_read" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "predictions_write" ON public.predictions FOR ALL USING (true);

-- Seed initial predictions
INSERT INTO public.predictions (zone, risk, prediction, action, confidence) VALUES
  ('Main Stage', 'HIGH', 'Crowd density projected to exceed 90% in 15 minutes based on current inflow rate', 'Deploy 4 additional security personnel and open auxiliary exits', 92),
  ('Food Court A', 'MEDIUM', 'Queue congestion building at counters 3-5, estimated 20 min wait times', 'Redirect attendees to Food Court B via push notification', 78),
  ('North Entrance', 'MEDIUM', 'Entry bottleneck forming due to single-lane security check', 'Open Lane 2 for pre-verified attendees', 85),
  ('Tech Expo', 'LOW', 'Steady flow patterns, no congestion expected in next 30 minutes', 'Maintain current staffing levels', 71)
ON CONFLICT DO NOTHING;

-- ============================================
-- VENDORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Food',
  status TEXT NOT NULL DEFAULT 'safe',
  visits INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  wait_time INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 4.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_read" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "vendors_write" ON public.vendors FOR ALL USING (true);

INSERT INTO public.vendors (name, zone, type, status, visits, revenue, wait_time, rating) VALUES
  ('Bombay Bites', 'Food Court A', 'Food', 'moderate', 340, 28500, 12, 4.3),
  ('Chai Junction', 'Food Court B', 'Beverage', 'safe', 520, 15600, 5, 4.7),
  ('TechGear Store', 'Tech Expo', 'Merchandise', 'safe', 180, 42000, 3, 4.1),
  ('Pizza Corner', 'Food Court A', 'Food', 'critical', 410, 34200, 18, 3.9),
  ('Hydration Hub', 'Main Stage', 'Beverage', 'safe', 680, 10200, 2, 4.5),
  ('Merch Central', 'Registration', 'Merchandise', 'moderate', 220, 55000, 8, 4.2)
ON CONFLICT DO NOTHING;

-- ============================================
-- AUTOMATED ACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.automated_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  triggered_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.automated_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actions_read" ON public.automated_actions FOR SELECT USING (true);
CREATE POLICY "actions_write" ON public.automated_actions FOR ALL USING (true);

-- ============================================
-- VERIFY: Show all tables and row counts
-- ============================================
SELECT 'zones' as tbl, count(*) as rows FROM public.zones
UNION ALL SELECT 'staff', count(*) FROM public.staff
UNION ALL SELECT 'alerts', count(*) FROM public.alerts
UNION ALL SELECT 'incidents', count(*) FROM public.incidents
UNION ALL SELECT 'predictions', count(*) FROM public.predictions
UNION ALL SELECT 'vendors', count(*) FROM public.vendors
UNION ALL SELECT 'automated_actions', count(*) FROM public.automated_actions
UNION ALL SELECT 'dispatch_log', count(*) FROM public.dispatch_log
UNION ALL SELECT 'attendee_locations', count(*) FROM public.attendee_locations;
