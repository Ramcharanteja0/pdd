/**
 * CrowdIQ — Full Test at SAVEETHA ENGINEERING COLLEGE, Chennai
 * 
 * This script:
 * 1. Updates all zones to Saveetha Engineering College campus locations
 * 2. Inserts 25 attendee GPS check-ins across campus
 * 3. Shows how heatmap auto-centers on the new location
 * 4. Counts people per zone
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hpdnuczygunkndzklaik.supabase.co',
  'sb_publishable_Wlvq-QD7k68Vi_LNEi9mWA_UiarPpgX'
);

async function runSaveethaTest() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  CrowdIQ — SAVEETHA ENGINEERING COLLEGE TEST         ║');
  console.log('║  Thandalam, Chennai 602105, Tamil Nadu               ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Update zones to Saveetha campus locations
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 1: SWITCHING VENUE TO SAVEETHA ────────────────┐');
  console.log('│                                                        │');
  console.log('│  HOW HEATMAP CHANGES BASED ON EVENT LOCATION:          │');
  console.log('│                                                        │');
  console.log('│  1. Zones table stores lat/lng for each zone           │');
  console.log('│  2. Heatmap computes CENTER from all zone coordinates  │');
  console.log('│     center = average(all zone latitudes, longitudes)   │');
  console.log('│  3. Map auto-pans to that center                       │');
  console.log('│  4. CircleMarkers placed at each zone lat/lng          │');
  console.log('│                                                        │');
  console.log('│  TO CHANGE VENUE: Just update zone lat/lng in Supabase │');
  console.log('│  The heatmap will automatically show the new location! │');
  console.log('│                                                        │');

  // Saveetha Engineering College campus zones with real coordinates
  // Campus center: approximately 12.8523, 80.0514
  const saveethaZones = [
    { id: 'zone-1',  name: 'Main Auditorium',     lat: 12.8528, lng: 80.0518, capacity: 1200, density: 0 },
    { id: 'zone-2',  name: 'Cafeteria',           lat: 12.8520, lng: 80.0525, capacity: 500,  density: 0 },
    { id: 'zone-3',  name: 'CSE Block',           lat: 12.8530, lng: 80.0510, capacity: 800,  density: 0 },
    { id: 'zone-4',  name: 'Main Gate',           lat: 12.8535, lng: 80.0505, capacity: 400,  density: 0 },
    { id: 'zone-5',  name: 'Library',             lat: 12.8525, lng: 80.0508, capacity: 600,  density: 0 },
    { id: 'zone-6',  name: 'ECE Block',           lat: 12.8518, lng: 80.0512, capacity: 700,  density: 0 },
    { id: 'zone-7',  name: 'Sports Ground',       lat: 12.8515, lng: 80.0520, capacity: 2000, density: 0 },
    { id: 'zone-8',  name: 'Seminar Hall',        lat: 12.8532, lng: 80.0522, capacity: 300,  density: 0 },
    { id: 'zone-9',  name: 'Parking Lot',         lat: 12.8538, lng: 80.0500, capacity: 500,  density: 0 },
    { id: 'zone-10', name: 'Admin Block',         lat: 12.8522, lng: 80.0515, capacity: 200,  density: 0 },
    { id: 'zone-11', name: 'Mechanical Workshop', lat: 12.8512, lng: 80.0508, capacity: 400,  density: 0 },
    { id: 'zone-12', name: 'Back Gate',           lat: 12.8510, lng: 80.0525, capacity: 300,  density: 0 },
  ];

  console.log('│                                                        │');
  console.log('│  Previous: NESCO Mumbai (19.07°N, 72.87°E)             │');
  console.log('│  New:      Saveetha Chennai (12.85°N, 80.05°E)         │');
  console.log('│                                                        │');

  const { error: zErr } = await supabase.from('zones').upsert(saveethaZones, { onConflict: 'id' });
  if (zErr) {
    console.log(`│  ❌ Zone update failed: ${zErr.message}`);
  } else {
    console.log('│  ✅ 12 zones updated to Saveetha campus coordinates    │');
    saveethaZones.forEach(z => {
      console.log(`│     📍 ${z.name.padEnd(22)} ${z.lat}, ${z.lng}  cap:${z.capacity}`);
    });
  }

  // Compute center
  const avgLat = saveethaZones.reduce((s, z) => s + z.lat, 0) / saveethaZones.length;
  const avgLng = saveethaZones.reduce((s, z) => s + z.lng, 0) / saveethaZones.length;
  console.log(`│                                                        │`);
  console.log(`│  🗺️  Map will auto-center at: ${avgLat.toFixed(4)}, ${avgLng.toFixed(4)}  │`);
  console.log('└────────────────────────────────────────────────────────┘\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Clear old GPS data and insert Saveetha attendees
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 2: SIMULATING 25 ATTENDEE GPS CHECK-INS ───────┐');

  // Clear old test data
  await supabase.from('attendee_locations').delete().like('device_id', 'test-%');
  await supabase.from('attendee_locations').delete().like('device_id', 'phone-%');
  await supabase.from('attendee_locations').delete().like('device_id', 'saveetha-%');

  const attendees = [
    // Main Auditorium — 7 people (crowded)
    { device_id: 'saveetha-001', latitude: 12.85280, longitude: 80.05180, zone_id: 'zone-1', zone_name: 'Main Auditorium' },
    { device_id: 'saveetha-002', latitude: 12.85285, longitude: 80.05185, zone_id: 'zone-1', zone_name: 'Main Auditorium' },
    { device_id: 'saveetha-003', latitude: 12.85275, longitude: 80.05175, zone_id: 'zone-1', zone_name: 'Main Auditorium' },
    { device_id: 'saveetha-004', latitude: 12.85282, longitude: 80.05178, zone_id: 'zone-1', zone_name: 'Main Auditorium' },
    { device_id: 'saveetha-005', latitude: 12.85278, longitude: 80.05182, zone_id: 'zone-1', zone_name: 'Main Auditorium' },
    { device_id: 'saveetha-006', latitude: 12.85290, longitude: 80.05190, zone_id: 'zone-1', zone_name: 'Main Auditorium' },
    { device_id: 'saveetha-007', latitude: 12.85270, longitude: 80.05170, zone_id: 'zone-1', zone_name: 'Main Auditorium' },
    // Cafeteria — 5 people
    { device_id: 'saveetha-008', latitude: 12.85200, longitude: 80.05250, zone_id: 'zone-2', zone_name: 'Cafeteria' },
    { device_id: 'saveetha-009', latitude: 12.85205, longitude: 80.05255, zone_id: 'zone-2', zone_name: 'Cafeteria' },
    { device_id: 'saveetha-010', latitude: 12.85195, longitude: 80.05245, zone_id: 'zone-2', zone_name: 'Cafeteria' },
    { device_id: 'saveetha-011', latitude: 12.85202, longitude: 80.05248, zone_id: 'zone-2', zone_name: 'Cafeteria' },
    { device_id: 'saveetha-012', latitude: 12.85198, longitude: 80.05252, zone_id: 'zone-2', zone_name: 'Cafeteria' },
    // CSE Block — 4 people
    { device_id: 'saveetha-013', latitude: 12.85300, longitude: 80.05100, zone_id: 'zone-3', zone_name: 'CSE Block' },
    { device_id: 'saveetha-014', latitude: 12.85305, longitude: 80.05105, zone_id: 'zone-3', zone_name: 'CSE Block' },
    { device_id: 'saveetha-015', latitude: 12.85295, longitude: 80.05095, zone_id: 'zone-3', zone_name: 'CSE Block' },
    { device_id: 'saveetha-016', latitude: 12.85302, longitude: 80.05102, zone_id: 'zone-3', zone_name: 'CSE Block' },
    // Main Gate — 3 people
    { device_id: 'saveetha-017', latitude: 12.85350, longitude: 80.05050, zone_id: 'zone-4', zone_name: 'Main Gate' },
    { device_id: 'saveetha-018', latitude: 12.85355, longitude: 80.05055, zone_id: 'zone-4', zone_name: 'Main Gate' },
    { device_id: 'saveetha-019', latitude: 12.85345, longitude: 80.05045, zone_id: 'zone-4', zone_name: 'Main Gate' },
    // Sports Ground — 3 people
    { device_id: 'saveetha-020', latitude: 12.85150, longitude: 80.05200, zone_id: 'zone-7', zone_name: 'Sports Ground' },
    { device_id: 'saveetha-021', latitude: 12.85155, longitude: 80.05205, zone_id: 'zone-7', zone_name: 'Sports Ground' },
    { device_id: 'saveetha-022', latitude: 12.85145, longitude: 80.05195, zone_id: 'zone-7', zone_name: 'Sports Ground' },
    // Library — 2 people
    { device_id: 'saveetha-023', latitude: 12.85250, longitude: 80.05080, zone_id: 'zone-5', zone_name: 'Library' },
    { device_id: 'saveetha-024', latitude: 12.85255, longitude: 80.05085, zone_id: 'zone-5', zone_name: 'Library' },
    // Seminar Hall — 1 person
    { device_id: 'saveetha-025', latitude: 12.85320, longitude: 80.05220, zone_id: 'zone-8', zone_name: 'Seminar Hall' },
  ];

  let inserted = 0;
  for (const att of attendees) {
    const { error } = await supabase.from('attendee_locations').insert([{
      ...att, accuracy: Math.floor(Math.random() * 15) + 3, event_id: 'current'
    }]);
    if (!error) inserted++;
  }
  console.log(`│  ✅ ${inserted} attendee GPS check-ins inserted at Saveetha   │`);
  console.log('└────────────────────────────────────────────────────────┘\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Count people per zone
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 3: LIVE PEOPLE COUNT PER ZONE ─────────────────┐');

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: allLocs } = await supabase
    .from('attendee_locations')
    .select('device_id, zone_id, zone_name, latitude, longitude')
    .gte('updated_at', tenMinAgo)
    .eq('event_id', 'current');

  const zoneCounts = {};
  (allLocs || []).forEach(loc => {
    const key = loc.zone_name || 'Unknown';
    if (!zoneCounts[key]) zoneCounts[key] = { count: 0, zone_id: loc.zone_id };
    zoneCounts[key].count++;
  });

  // Get zone capacities
  const { data: zones } = await supabase.from('zones').select('id, name, capacity');
  const zoneMap = {};
  (zones || []).forEach(z => { zoneMap[z.id] = z; });

  console.log('│                                                        │');
  console.log('│  📍 SAVEETHA CAMPUS        PEOPLE   CAPACITY   STATUS  │');
  console.log('│  ──────────────────────────────────────────────────── │');

  const sorted = Object.entries(zoneCounts).sort((a, b) => b[1].count - a[1].count);
  sorted.forEach(([zoneName, info]) => {
    const zone = zoneMap[info.zone_id];
    const cap = zone ? zone.capacity : '?';
    const pct = zone ? Math.round((info.count / zone.capacity) * 100) : 0;
    const status = pct >= 80 ? '🔴 CRITICAL' : pct >= 55 ? '🟡 MODERATE' : pct >= 1 ? '🟢 ACTIVE' : '⚪ EMPTY';
    const bar = '█'.repeat(Math.min(10, Math.round(info.count / 2))) + '░'.repeat(Math.max(0, 10 - Math.round(info.count / 2)));
    console.log(`│  ${bar} ${zoneName.padEnd(20)} ${String(info.count).padStart(3)} ppl   ${String(cap).padStart(5)}    ${status}`);
  });

  // Empty zones
  (zones || []).forEach(z => {
    if (!Object.values(zoneCounts).find(c => c.zone_id === z.id)) {
      console.log(`│  ░░░░░░░░░░ ${z.name.padEnd(20)}   0 ppl   ${String(z.capacity).padStart(5)}    ⚪ EMPTY`);
    }
  });

  const total = (allLocs || []).length;
  console.log('│                                                        │');
  console.log(`│  📊 TOTAL: ${total} people tracked across ${sorted.length} active zones   │`);
  console.log('└────────────────────────────────────────────────────────┘\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Update zone densities based on actual GPS counts
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 4: UPDATING ZONE DENSITIES ────────────────────┐');

  for (const [zoneName, info] of Object.entries(zoneCounts)) {
    const zone = zoneMap[info.zone_id];
    if (zone) {
      // In production: density = (tracked_count / capacity) * 100
      // For demo: multiply by factor since we have few test devices
      const rawPct = Math.round((info.count / zone.capacity) * 100);
      const demoPct = Math.min(95, rawPct * 15); // Scale up for visual impact
      await supabase.from('zones').update({ density: demoPct }).eq('id', info.zone_id);
      console.log(`│  ✅ ${zoneName.padEnd(22)} → ${demoPct}% density (${info.count} tracked)`);
    }
  }
  console.log('└────────────────────────────────────────────────────────┘\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Final heatmap verification
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 5: HEATMAP VISUALIZATION ──────────────────────┐');
  const { data: finalZones } = await supabase.from('zones').select('*').order('density', { ascending: false });
  (finalZones || []).forEach(z => {
    const d = z.density || 0;
    const bar = '█'.repeat(Math.round(d / 5)) + '░'.repeat(20 - Math.round(d / 5));
    const status = d >= 80 ? '🔴' : d >= 55 ? '🟡' : d > 0 ? '🟢' : '⚪';
    const gps = zoneCounts[z.name]?.count || 0;
    console.log(`│  ${status} ${z.name.padEnd(20)} ${bar} ${String(d).padStart(3)}%  (${gps} ppl GPS)`);
  });
  console.log('└────────────────────────────────────────────────────────┘\n');

  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  ✅ TEST COMPLETE — Saveetha Engineering College      ║');
  console.log('║                                                       ║');
  console.log('║  The heatmap now shows Saveetha campus, Chennai.      ║');
  console.log('║  Map auto-centered at 12.8523°N, 80.0514°E           ║');
  console.log('║                                                       ║');
  console.log('║  Open: https://pdd-tawny.vercel.app/heatmap          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
}

runSaveethaTest().catch(console.error);
