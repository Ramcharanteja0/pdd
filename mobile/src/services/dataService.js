import { supabase } from './supabase';

// ── ZONES ──────────────────────────────────────────────────
export async function fetchZones() {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('id');
    if (!error && data && data.length > 0) {
      return data.map(z => ({
        ...z,
        max_capacity: z.capacity,
        current_count: z.density != null && z.capacity ? Math.round((z.capacity * z.density) / 100) : (z.current_count || 0),
        density_percent: z.density != null ? z.density : (z.density_percent || 0),
        latitude: z.lat,
        longitude: z.lng,
        radius_meters: z.radius_meters,
      }));
    }
    return fallbackZones();
  } catch (err) {
    return fallbackZones();
  }
}

function fallbackZones() {
  return [
    { id: '1', name: 'Main Stage Arena', current_count: 8500, max_capacity: 10000, density_level: 'critical', trend: 'increasing', latitude: 13.1945, longitude: 80.2425, density_percent: 85, latency: 0 },
    { id: '2', name: 'Food Court & Plaza', current_count: 3200, max_capacity: 6000, density_level: 'moderate', trend: 'stable', latitude: 13.1935, longitude: 80.2435, density_percent: 53, latency: 0 },
    { id: '3', name: 'North Gate Entrance', current_count: 1400, max_capacity: 4000, density_level: 'safe', trend: 'decreasing', latitude: 13.1925, longitude: 80.2415, density_percent: 35, latency: 0 },
    { id: '4', name: 'VIP Pavilion', current_count: 950, max_capacity: 1500, density_level: 'moderate', trend: 'increasing', latitude: 13.1955, longitude: 80.2445, density_percent: 63, latency: 0 },
  ];
}

export async function updateZoneDensity(id, density) {
  if (!id) return false;
  try {
    const { error } = await supabase
      .from('zones')
      .update({ density })
      .eq('id', id);
    return !error;
  } catch (err) {
    return false;
  }
}

// ── INCIDENTS ──────────────────────────────────────────────
export async function fetchIncidents() {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data && data.length > 0) return data;
    return fallbackIncidents();
  } catch (err) {
    return fallbackIncidents();
  }
}

function fallbackIncidents() {
  return [
    { id: '101', title: 'Bottleneck at Gate B', zone: 'North Gate', severity: 'critical', status: 'open', type: 'bottleneck', description: 'Crowd bottleneck detected', created_at: new Date().toISOString() },
    { id: '102', title: 'Medical Assist - Dehydration', zone: 'Main Stage', severity: 'moderate', status: 'open', type: 'medical', description: 'Attendee requires medical assistance', created_at: new Date().toISOString() },
  ];
}

export async function createIncident({ title, zone, type, description, severity = 'medium' }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('incidents')
      .insert([{ title, zone, type, description, severity, reported_by: user?.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

export async function resolveIncident(id) {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error && error.message && error.message.includes('resolved_at')) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('incidents')
        .update({ status: 'resolved' })
        .eq('id', id)
        .select()
        .single();
      if (fallbackError) throw fallbackError;
      return fallbackData;
    }
    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

// ── ALERTS ─────────────────────────────────────────────────
export async function fetchAlerts() {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data;
    return [];
  } catch (err) {
    return [];
  }
}

export async function createAlert({ title, zone, type = 'warning', description }) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .insert([{ title, zone, type, description }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

export async function resolveAlert(id) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error && error.message && error.message.includes('resolved_at')) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('alerts')
        .update({ resolved: true })
        .eq('id', id)
        .select()
        .single();
      if (fallbackError) throw fallbackError;
      return fallbackData;
    }
    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

// ── STAFF ──────────────────────────────────────────────────
export async function fetchStaff() {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');
    if (!error && data && data.length > 0) {
      return data.map(s => ({ ...s, status: s.status === 'active' ? 'Active' : s.status === 'busy' ? 'On Task' : s.status === 'offline' ? 'Offline' : 'On Break' }));
    }
    return fallbackStaff();
  } catch (err) {
    return fallbackStaff();
  }
}

function fallbackStaff() {
  return [
    { id: 's1', name: 'Vikram Singh', role: 'Security Lead', zone: 'Main Stage', status: 'Active', battery: '92%' },
    { id: 's2', name: 'Ananya Sharma', role: 'Medical Ops', zone: 'Food Plaza', status: 'Active', battery: '85%' },
  ];
}

export async function logDispatch({ staffId, message }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('dispatch_log')
      .insert([{ staff_id: staffId, message, sent_by: user?.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

export async function fetchDispatchLog() {
  try {
    const { data, error } = await supabase
      .from('dispatch_log')
      .select('*, staff:staff_id(name, role)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) return data;
    return [];
  } catch (err) {
    return [];
  }
}

// ── PREDICTIONS ────────────────────────────────────────────
export async function fetchPredictions() {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data;
    return [];
  } catch (err) {
    return [];
  }
}

export async function generateLivePredictions() {
  try {
    const { data: zones } = await supabase.from('zones').select('*').order('density', { ascending: false });
    if (!zones || zones.length === 0) return [];

    const predictions = [];
    const now = new Date();

    zones.forEach(zone => {
      const density = zone.density || 0;
      const count = zone.capacity > 0 ? Math.round(zone.capacity * density / 100) : 0;
      const remaining = (zone.capacity || 0) - count;

      if (density >= 80) {
        predictions.push({
          id: `live-${zone.id}-critical`,
          zone: zone.name,
          risk: 'HIGH',
          prediction: `Zone at ${density}% capacity (${count}/${zone.capacity}). Risk of overcrowding within 15 minutes if inflow continues.`,
          action: `Deploy ${Math.ceil(count * 0.05)} staff to control entry. Open overflow areas and redirect foot traffic.`,
          confidence: Math.min(97, 70 + Math.round(density * 0.3)),
          created_at: now.toISOString(),
        });
      } else if (density >= 55) {
        predictions.push({
          id: `live-${zone.id}-moderate`,
          zone: zone.name,
          risk: 'MEDIUM',
          prediction: `Zone reaching ${density}% capacity (${count}/${zone.capacity}). Approaching crowd threshold — monitor closely.`,
          action: `Prepare ${Math.ceil(count * 0.03)} additional staff. Consider activating queue management.`,
          confidence: Math.min(90, 55 + Math.round(density * 0.25)),
          created_at: now.toISOString(),
        });
      } else if (density >= 30) {
        predictions.push({
          id: `live-${zone.id}-normal`,
          zone: zone.name,
          risk: 'LOW',
          prediction: `Zone at ${density}% capacity (${count}/${zone.capacity}). Comfortable occupancy with room for ${remaining} more attendees.`,
          action: 'No action needed. Standard monitoring continues.',
          confidence: Math.min(95, 80 + Math.round(density * 0.1)),
          created_at: now.toISOString(),
        });
      }
    });

    if (predictions.length === 0) {
      predictions.push({
        id: 'live-status',
        zone: 'All Zones',
        risk: 'LOW',
        prediction: `All ${zones.length} zones below 30% capacity. No crowd concerns detected.`,
        action: 'Continue standard monitoring. System will auto-alert at 55% threshold.',
        confidence: 95,
        created_at: now.toISOString(),
      });
    }

    return predictions.slice(0, 5);
  } catch (err) {
    return [];
  }
}

// ── AUTOMATED ACTIONS ──────────────────────────────────────
export async function fetchAutomatedActions() {
  try {
    const { data, error } = await supabase
      .from('automated_actions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data;
    return [];
  } catch (err) {
    return [];
  }
}

export async function logAutomatedAction({ zone, title, description, triggered_by = 'system' }) {
  try {
    const { data, error } = await supabase
      .from('automated_actions')
      .insert([{ zone, title, description, triggered_by }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

// ── ATTENDEE TRACKING (Real GPS) ──────────────────────────
export async function upsertAttendeeLocation({ deviceId, latitude, longitude, accuracy, zoneId, zoneName }) {
  try {
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
          updated_at: new Date().toISOString(),
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
          zone_id: zoneId, zone_name: zoneName, event_id: 'current',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  } catch (err) {
    return null;
  }
}

export async function fetchAttendeeLocations() {
  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('attendee_locations')
      .select('*')
      .gte('updated_at', tenMinAgo)
      .eq('event_id', 'current');
    if (!error && data) return data;
    return [];
  } catch (err) {
    return [];
  }
}

export async function removeAttendeeLocation(deviceId) {
  try {
    const { error } = await supabase
      .from('attendee_locations')
      .delete()
      .eq('device_id', deviceId)
      .eq('event_id', 'current');
    return !error;
  } catch (err) {
    return false;
  }
}

export async function countAttendeesByZone() {
  try {
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
  } catch (err) {
    return [];
  }
}

// ── GATE SCANS ────────────────────────────────────────────
export async function createGateScan({ gateName, scanType, ticketId }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('gate_scans')
      .insert([{ gate_name: gateName, scan_type: scanType, ticket_id: ticketId, scanned_by: user?.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

export async function fetchGateScans() {
  try {
    const { data, error } = await supabase
      .from('gate_scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) return data;
    return [];
  } catch (err) {
    return [];
  }
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
    // Table may not exist
  }
  const zones = await fetchZones();
  const totalCapacity = zones.reduce((s, z) => s + (z.capacity || 0), 0);
  return { id: 'current', name: 'Live Event', venue: 'Event Venue', city: '', date: '', total_capacity: totalCapacity || 0 };
}

export async function saveEventInfo(event) {
  try {
    const { data, error } = await supabase
      .from('events')
      .upsert({ id: 'current', ...event }, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

export async function saveZone(zone) {
  try {
    const { data, error } = await supabase
      .from('zones')
      .upsert(zone, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

export async function deleteZone(id) {
  try {
    const { error } = await supabase.from('zones').delete().eq('id', id);
    return !error;
  } catch (err) {
    return false;
  }
}

// ── CROWD TIMELINE ────────────────────────────────────────
export async function fetchCrowdTimeline() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('attendee_locations')
      .select('created_at, updated_at, zone_id, zone_name')
      .gte('created_at', today.toISOString())
      .eq('event_id', 'current');

    const startHour = 8;
    const endHour = 22;
    const hourMap = {};
    for (let h = startHour; h <= endHour; h++) {
      const key = `${String(h).padStart(2, '0')}:00`;
      hourMap[key] = { time: key, attendees: 0 };
    }

    if (data && data.length > 0) {
      data.forEach(row => {
        const createdHour = new Date(row.created_at).getHours();
        const key = `${String(createdHour).padStart(2, '0')}:00`;
        if (hourMap[key]) hourMap[key].attendees++;
      });
    }

    const timeline = Object.values(hourMap);
    if (error || timeline.every(t => t.attendees === 0)) {
      return [
        { time: '08:00', attendees: 1200 },
        { time: '10:00', attendees: 3100 },
        { time: '12:00', attendees: 5400 },
        { time: '14:00', attendees: 6800 },
        { time: '16:00', attendees: 7900 },
        { time: '18:00', attendees: 8600 },
        { time: '20:00', attendees: 7200 },
      ];
    }
    return timeline.filter(t => t.attendees > 0);
  } catch (err) {
    return [
      { time: '08:00', attendees: 1200 },
      { time: '10:00', attendees: 3100 },
      { time: '12:00', attendees: 5400 },
      { time: '14:00', attendees: 6800 },
      { time: '16:00', attendees: 7900 },
      { time: '18:00', attendees: 8600 },
      { time: '20:00', attendees: 7200 },
    ];
  }
}

// ── ZONE DENSITY SNAPSHOT / SYNC ──────────────────────────
export async function syncZoneDensityFromGPS() {
  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const [{ data: locations }, { data: zones }] = await Promise.all([
      supabase.from('attendee_locations').select('zone_id').gte('updated_at', tenMinAgo).eq('event_id', 'current'),
      supabase.from('zones').select('id, capacity'),
    ]);
    if (!zones || zones.length === 0) return;

    const counts = {};
    (locations || []).forEach(loc => {
      if (loc.zone_id) counts[loc.zone_id] = (counts[loc.zone_id] || 0) + 1;
    });

    const updates = zones.map(z => {
      const count = counts[z.id] || 0;
      const density = z.capacity > 0 ? Math.min(100, Math.round((count / z.capacity) * 100)) : 0;
      return supabase.from('zones').update({ density }).eq('id', z.id);
    });
    await Promise.all(updates);
  } catch (err) {
    // ignore
  }
}

export async function fetchZoneDensitySnapshot() {
  try {
    await syncZoneDensityFromGPS();
    const { data: zones } = await supabase.from('zones').select('id, name, density, capacity');
    return (zones || []).map(z => ({
      zone: z.name,
      density: z.density || 0,
      capacity: z.capacity || 0,
      occupancy: Math.round((z.capacity || 0) * (z.density || 0) / 100),
    }));
  } catch (err) {
    return [];
  }
}