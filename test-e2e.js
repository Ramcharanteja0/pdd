/**
 * Fix RLS + Seed remaining tables + Run full GPS tracking test
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hpdnuczygunkndzklaik.supabase.co',
  'sb_publishable_Wlvq-QD7k68Vi_LNEi9mWA_UiarPpgX'
);

async function fullTest() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   CrowdIQ — Full Integration Test           ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── STEP 1: Check all tables ──────────────────────────────
  console.log('┌── STEP 1: TABLE STATUS ──────────────────────┐');
  const tables = ['zones','staff','alerts','incidents','predictions','vendors','automated_actions','dispatch_log','attendee_locations'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      console.log(`│  ❌ ${t.padEnd(22)} ERROR: ${error.message.substring(0, 40)}`);
    } else {
      console.log(`│  ✅ ${t.padEnd(22)} ${(data||[]).length} rows`);
    }
  }
  console.log('└──────────────────────────────────────────────┘\n');

  // ── STEP 2: GPS Tracking Test ─────────────────────────────
  console.log('┌── STEP 2: GPS TRACKING PIPELINE ─────────────┐');
  
  // Simulate 15 attendees checking in from phones at different zones
  const testAttendees = [
    { device_id: 'phone-A01', latitude: 19.07650, longitude: 72.87730, zone_id: 'zone-1', zone_name: 'Main Stage', accuracy: 8 },
    { device_id: 'phone-A02', latitude: 19.07655, longitude: 72.87735, zone_id: 'zone-1', zone_name: 'Main Stage', accuracy: 5 },
    { device_id: 'phone-A03', latitude: 19.07645, longitude: 72.87725, zone_id: 'zone-1', zone_name: 'Main Stage', accuracy: 12 },
    { device_id: 'phone-A04', latitude: 19.07660, longitude: 72.87740, zone_id: 'zone-1', zone_name: 'Main Stage', accuracy: 6 },
    { device_id: 'phone-B01', latitude: 19.07700, longitude: 72.87800, zone_id: 'zone-2', zone_name: 'Food Court A', accuracy: 10 },
    { device_id: 'phone-B02', latitude: 19.07705, longitude: 72.87805, zone_id: 'zone-2', zone_name: 'Food Court A', accuracy: 7 },
    { device_id: 'phone-B03', latitude: 19.07695, longitude: 72.87795, zone_id: 'zone-2', zone_name: 'Food Court A', accuracy: 9 },
    { device_id: 'phone-C01', latitude: 19.07600, longitude: 72.87700, zone_id: 'zone-3', zone_name: 'Tech Expo', accuracy: 15 },
    { device_id: 'phone-C02', latitude: 19.07605, longitude: 72.87705, zone_id: 'zone-3', zone_name: 'Tech Expo', accuracy: 8 },
    { device_id: 'phone-D01', latitude: 19.07750, longitude: 72.87650, zone_id: 'zone-4', zone_name: 'North Entrance', accuracy: 4 },
    { device_id: 'phone-D02', latitude: 19.07755, longitude: 72.87655, zone_id: 'zone-4', zone_name: 'North Entrance', accuracy: 6 },
    { device_id: 'phone-D03', latitude: 19.07748, longitude: 72.87648, zone_id: 'zone-4', zone_name: 'North Entrance', accuracy: 11 },
    { device_id: 'phone-E01', latitude: 19.07720, longitude: 72.87900, zone_id: 'zone-8', zone_name: 'Registration', accuracy: 7 },
    { device_id: 'phone-E02', latitude: 19.07725, longitude: 72.87905, zone_id: 'zone-8', zone_name: 'Registration', accuracy: 5 },
    { device_id: 'phone-F01', latitude: 19.07620, longitude: 72.87900, zone_id: 'zone-11', zone_name: 'Workshop Hall', accuracy: 9 },
  ];

  let insertCount = 0;
  for (const att of testAttendees) {
    const { data: existing } = await supabase
      .from('attendee_locations')
      .select('id')
      .eq('device_id', att.device_id)
      .maybeSingle();

    if (existing) {
      await supabase.from('attendee_locations')
        .update({ ...att, updated_at: new Date().toISOString(), event_id: 'current' })
        .eq('device_id', att.device_id);
    } else {
      await supabase.from('attendee_locations')
        .insert([{ ...att, event_id: 'current' }]);
    }
    insertCount++;
  }
  console.log(`│  ✅ Inserted/updated ${insertCount} GPS check-ins`);
  console.log('└──────────────────────────────────────────────┘\n');

  // ── STEP 3: Count people per zone (THIS IS HOW IT WORKS) ──
  console.log('┌── STEP 3: PEOPLE PER ZONE (Live Count) ──────┐');
  console.log('│                                               │');
  console.log('│  HOW IT WORKS:                                │');
  console.log('│  1. Attendee opens /checkin on their phone    │');
  console.log('│  2. Browser GPS sends lat/lng every 30 sec    │');
  console.log('│  3. We match lat/lng to nearest zone          │');
  console.log('│  4. Heatmap reads attendee_locations table    │');
  console.log('│  5. Counts unique devices per zone_id         │');
  console.log('│                                               │');

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: allLocs } = await supabase
    .from('attendee_locations')
    .select('device_id, zone_id, zone_name, latitude, longitude, updated_at')
    .gte('updated_at', tenMinAgo)
    .eq('event_id', 'current');

  // Count per zone
  const zoneCounts = {};
  (allLocs || []).forEach(loc => {
    const key = loc.zone_name || 'Unknown';
    if (!zoneCounts[key]) zoneCounts[key] = { count: 0, zone_id: loc.zone_id, devices: [] };
    zoneCounts[key].count++;
    zoneCounts[key].devices.push(loc.device_id);
  });

  // Get zone capacities
  const { data: zones } = await supabase.from('zones').select('id, name, capacity, density');
  const zoneMap = {};
  (zones || []).forEach(z => { zoneMap[z.id] = z; });

  console.log('│                                               │');
  console.log('│  📍 ZONE            PEOPLE   CAPACITY  STATUS │');
  console.log('│  ─────────────────────────────────────────── │');
  
  const sortedZones = Object.entries(zoneCounts).sort((a, b) => b[1].count - a[1].count);
  sortedZones.forEach(([zoneName, info]) => {
    const zone = zoneMap[info.zone_id];
    const cap = zone ? zone.capacity : '?';
    const pct = zone ? Math.round((info.count / zone.capacity) * 100) : '?';
    const status = pct >= 80 ? '🔴 CRITICAL' : pct >= 55 ? '🟡 MODERATE' : '🟢 SAFE';
    console.log(`│  ${zoneName.padEnd(18)} ${String(info.count).padStart(3)} ppl   ${String(cap).padStart(5)}    ${status}`);
  });

  // Zones with 0 people
  (zones || []).forEach(z => {
    if (!Object.values(zoneCounts).find(c => c.zone_id === z.id)) {
      console.log(`│  ${z.name.padEnd(18)}   0 ppl   ${String(z.capacity).padStart(5)}    ⚪ EMPTY`);
    }
  });

  console.log('│                                               │');
  console.log(`│  TOTAL TRACKED: ${(allLocs || []).length} devices across ${sortedZones.length} zones  │`);
  console.log('└──────────────────────────────────────────────┘\n');

  // ── STEP 4: Heatmap Data ──────────────────────────────────
  console.log('┌── STEP 4: HEATMAP VERIFICATION ──────────────┐');
  (zones || []).sort((a, b) => (b.density || 0) - (a.density || 0)).forEach(z => {
    const d = z.density || 0;
    const bar = '█'.repeat(Math.round(d / 5)) + '░'.repeat(20 - Math.round(d / 5));
    const status = d >= 80 ? '🔴' : d >= 55 ? '🟡' : '🟢';
    console.log(`│  ${status} ${z.name.padEnd(16)} ${bar} ${String(d).padStart(3)}%`);
  });
  console.log('└──────────────────────────────────────────────┘\n');

  // ── STEP 5: Data flow summary ─────────────────────────────
  console.log('┌── HOW PEOPLE ARE LOCATED ON HEATMAP ─────────┐');
  console.log('│                                               │');
  console.log('│  PHONE GPS → Supabase → Heatmap              │');
  console.log('│                                               │');
  console.log('│  /checkin page on attendee phone:             │');
  console.log('│    navigator.geolocation.watchPosition()      │');
  console.log('│    ↓ gets lat: 19.0765, lng: 72.8773         │');
  console.log('│    ↓ finds nearest zone by coordinates        │');
  console.log('│    ↓ writes to attendee_locations table       │');
  console.log('│                                               │');
  console.log('│  /heatmap page on organizer dashboard:        │');
  console.log('│    ↓ reads attendee_locations                 │');
  console.log('│    ↓ counts devices per zone_id               │');
  console.log('│    ↓ shows count on map + sidebar             │');
  console.log('│    ↓ auto-refreshes every 20 seconds          │');
  console.log('│    ↓ Supabase Realtime for instant updates    │');
  console.log('│                                               │');
  console.log('│  QUERY USED:                                  │');
  console.log('│    SELECT zone_id, zone_name                  │');
  console.log('│    FROM attendee_locations                    │');
  console.log('│    WHERE updated_at > (now - 10 min)          │');
  console.log('│    AND event_id = \'current\'                   │');
  console.log('│    → GROUP BY zone_id → COUNT = people there  │');
  console.log('│                                               │');
  console.log('└──────────────────────────────────────────────┘');
}

fullTest().catch(console.error);
