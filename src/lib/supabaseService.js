/**
 * supabaseService.js
 * Reusable helpers for all Supabase DB operations in CrowdIQ
 */
import { supabase } from './supabase';

// ── INCIDENTS ──────────────────────────────────────────────
export async function fetchIncidents() {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createIncident({ title, zone, type, description, severity = 'medium' }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('incidents')
    .insert([{ title, zone, type, description, severity, reported_by: user?.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function resolveIncident(id) {
  const { data, error } = await supabase
    .from('incidents')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── ALERTS ─────────────────────────────────────────────────
export async function fetchAlerts() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function resolveAlert(id) {
  const { data, error } = await supabase
    .from('alerts')
    .update({ resolved: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── STAFF ──────────────────────────────────────────────────
export async function fetchStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function logDispatch({ staffId, message }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('dispatch_log')
    .insert([{ staff_id: staffId, message, sent_by: user?.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchDispatchLog() {
  const { data, error } = await supabase
    .from('dispatch_log')
    .select('*, staff:staff_id(name, role)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

// ── ZONES ──────────────────────────────────────────────────
export async function fetchZones() {
  const { data, error } = await supabase
    .from('zones')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

export async function updateZoneDensity(id, density) {
  const { data, error } = await supabase
    .from('zones')
    .update({ density })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── VENDORS ────────────────────────────────────────────────
export async function fetchVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

// ── PREDICTIONS ────────────────────────────────────────────
export async function fetchPredictions() {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ── AUTOMATED ACTIONS ──────────────────────────────────────
export async function fetchAutomatedActions() {
  const { data, error } = await supabase
    .from('automated_actions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function logAutomatedAction({ zone, title, description, triggered_by = 'system' }) {
  const { data, error } = await supabase
    .from('automated_actions')
    .insert([{ zone, title, description, triggered_by }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── ATTENDEE TRACKING (Real GPS) ──────────────────────────
export async function upsertAttendeeLocation({ deviceId, latitude, longitude, accuracy, zoneId, zoneName }) {
  const { data: existing } = await supabase
    .from('attendee_locations')
    .select('id')
    .eq('device_id', deviceId)
    .eq('event_id', 'current')
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('attendee_locations')
      .update({
        latitude, longitude, accuracy,
        zone_id: zoneId, zone_name: zoneName,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('attendee_locations')
      .insert([{
        device_id: deviceId, latitude, longitude, accuracy,
        zone_id: zoneId, zone_name: zoneName, event_id: 'current'
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function fetchAttendeeLocations() {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('attendee_locations')
    .select('*')
    .gte('updated_at', tenMinAgo)
    .eq('event_id', 'current');
  if (error) throw error;
  return data;
}

export async function countAttendeesByZone() {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('attendee_locations')
    .select('zone_id, zone_name')
    .gte('updated_at', tenMinAgo)
    .eq('event_id', 'current');
  if (error) throw error;

  const counts = {};
  (data || []).forEach(row => {
    const key = row.zone_id || 'unknown';
    if (!counts[key]) counts[key] = { zone_id: row.zone_id, zone_name: row.zone_name, count: 0 };
    counts[key].count++;
  });
  return Object.values(counts);
}

export async function removeAttendeeLocation(deviceId) {
  const { error } = await supabase
    .from('attendee_locations')
    .delete()
    .eq('device_id', deviceId)
    .eq('event_id', 'current');
  if (error) throw error;
}

// ── GATE SCANS ────────────────────────────────────────────
export async function createGateScan({ gateName, scanType, ticketId }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('gate_scans')
    .insert([{ gate_name: gateName, scan_type: scanType, ticket_id: ticketId, scanned_by: user?.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchGateScans() {
  const { data, error } = await supabase
    .from('gate_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function getGateScanCounts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('gate_scans')
    .select('scan_type, gate_name')
    .gte('created_at', today.toISOString());
  if (error) throw error;

  const entries = (data || []).filter(s => s.scan_type === 'entry').length;
  const exits = (data || []).filter(s => s.scan_type === 'exit').length;
  return { entries, exits, inside: entries - exits };
}

// ── EVENT CONFIG ──────────────────────────────────────────
export async function fetchEventInfo() {
  try {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();
    if (data) return data;
  } catch (e) {
    // Table may not exist yet — return defaults
  }
  // Sensible defaults derived from zones table
  const { data: zones } = await supabase.from('zones').select('capacity');
  const totalCapacity = (zones || []).reduce((s, z) => s + (z.capacity || 0), 0);
  return {
    id: 'current',
    name: 'Live Event',
    venue: 'Event Venue',
    city: '',
    total_capacity: totalCapacity || 0,
  };
}

// ── CROWD TIMELINE (built from real GPS data) ─────────────
export async function buildCrowdTimeline() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('attendee_locations')
    .select('created_at, zone_id, zone_name')
    .gte('created_at', today.toISOString())
    .eq('event_id', 'current')
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return [];

  // Group by hour
  const hourMap = {};
  data.forEach(row => {
    const dt = new Date(row.created_at);
    const hourKey = `${String(dt.getHours()).padStart(2, '0')}:00`;
    if (!hourMap[hourKey]) hourMap[hourKey] = { time: hourKey, attendees: 0, zones: {} };
    hourMap[hourKey].attendees++;
    const zn = row.zone_name || 'Outside';
    hourMap[hourKey].zones[zn] = (hourMap[hourKey].zones[zn] || 0) + 1;
  });

  return Object.values(hourMap).sort((a, b) => a.time.localeCompare(b.time));
}

// ── ZONE DENSITY SNAPSHOT (for radar/analytics) ───────────
export async function fetchZoneDensitySnapshot() {
  const { data: zones } = await supabase.from('zones').select('id, name, density, capacity');
  return (zones || []).map(z => ({
    zone: z.name,
    density: z.density || 0,
    capacity: z.capacity || 0,
    occupancy: Math.round((z.capacity || 0) * (z.density || 0) / 100),
  }));
}

// ── H3 DENSITY GRID (raw GPS → hex cells) ─────────────────
export async function fetchGPSForH3() {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('attendee_locations')
    .select('device_id, latitude, longitude, accuracy, zone_name, updated_at')
    .gte('updated_at', tenMinAgo)
    .eq('event_id', 'current');
  if (error) throw error;
  return (data || []).map(r => ({
    lat: r.latitude,
    lng: r.longitude,
    anon_token: r.device_id,
    accuracy: r.accuracy,
    zone_name: r.zone_name,
    updated_at: r.updated_at,
  }));
}

// ── ROLLING PREDICTION (5-min average → 15-min forecast) ──
export async function fetchRollingPrediction() {
  // Get last 30 min of GPS data in 5-min windows
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('attendee_locations')
    .select('zone_name, created_at')
    .gte('created_at', thirtyMinAgo)
    .eq('event_id', 'current')
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return [];

  // Group into 5-minute windows per zone
  const windows = {};
  data.forEach(row => {
    const ts = new Date(row.created_at);
    const windowKey = Math.floor(ts.getTime() / (5 * 60 * 1000));
    const zone = row.zone_name || 'Unknown';
    const key = `${zone}-${windowKey}`;
    if (!windows[key]) windows[key] = { zone, window: windowKey, count: 0 };
    windows[key].count++;
  });

  // Group by zone, compute trend
  const zoneWindows = {};
  Object.values(windows).forEach(w => {
    if (!zoneWindows[w.zone]) zoneWindows[w.zone] = [];
    zoneWindows[w.zone].push(w);
  });

  // For each zone: linear regression on the 5-min counts → predict +15 min
  return Object.entries(zoneWindows).map(([zone, wins]) => {
    wins.sort((a, b) => a.window - b.window);
    const counts = wins.map(w => w.count);
    const n = counts.length;
    if (n < 2) return { zone, predicted: counts[0] || 0, trend: 'stable', confidence: 50 };

    // Simple linear regression
    const xMean = (n - 1) / 2;
    const yMean = counts.reduce((s, c) => s + c, 0) / n;
    let num = 0, den = 0;
    counts.forEach((y, x) => {
      num += (x - xMean) * (y - yMean);
      den += (x - xMean) * (x - xMean);
    });
    const slope = den !== 0 ? num / den : 0;
    const predicted = Math.max(0, Math.round(yMean + slope * 3)); // 3 windows = 15 min

    const trend = slope > 0.5 ? 'increasing' : slope < -0.5 ? 'decreasing' : 'stable';
    const confidence = Math.min(95, 50 + n * 8);

    return { zone, predicted, trend, confidence, currentCount: counts[n - 1], slope };
  }).sort((a, b) => b.predicted - a.predicted);
}

// ── PREVIOUS POSITIONS (for flow vectors) ──────────────────
export async function fetchPreviousPositions(secondsAgo = 30) {
  const cutoff = new Date(Date.now() - secondsAgo * 1000).toISOString();
  const { data, error } = await supabase
    .from('attendee_locations')
    .select('device_id, latitude, longitude')
    .lt('updated_at', cutoff)
    .eq('event_id', 'current');
  if (error) return [];
  return (data || []).map(r => ({
    anon_token: r.device_id,
    lat: r.latitude,
    lng: r.longitude,
  }));
}
