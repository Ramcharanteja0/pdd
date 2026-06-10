/**
 * Fix: Re-insert attendees with realistic timestamps spread across the event day
 * This gives buildCrowdTimeline() real hourly data to chart
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hpdnuczygunkndzklaik.supabase.co',
  'sb_publishable_Wlvq-QD7k68Vi_LNEi9mWA_UiarPpgX'
);

function jitter(lat, lng, meters = 25) {
  const dLat = (Math.random() - 0.5) * (meters / 111320) * 2;
  const dLng = (Math.random() - 0.5) * (meters / (111320 * Math.cos(lat * Math.PI / 180))) * 2;
  return { lat: lat + dLat, lng: lng + dLng };
}

async function fixTimeline() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Fixing Crowd Flow Timeline — Spreading across event day ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Clear ALL old attendee data
  await supabase.from('attendee_locations').delete().eq('event_id', 'current');
  console.log('✅ Cleared old attendee data\n');

  // SIMATS zones
  const zones = [
    { id: 'zone-1',  name: 'Main Auditorium',       lat: 12.8115, lng: 80.0435 },
    { id: 'zone-2',  name: 'Dental Sciences Block',  lat: 12.8122, lng: 80.0442 },
    { id: 'zone-3',  name: 'Engineering Block',      lat: 12.8108, lng: 80.0428 },
    { id: 'zone-4',  name: 'Main Entrance Gate',     lat: 12.8130, lng: 80.0420 },
    { id: 'zone-5',  name: 'Central Library',        lat: 12.8118, lng: 80.0448 },
    { id: 'zone-6',  name: 'Medical College',        lat: 12.8102, lng: 80.0440 },
    { id: 'zone-7',  name: 'Sports Complex',         lat: 12.8095, lng: 80.0430 },
    { id: 'zone-8',  name: 'Seminar Hall A',         lat: 12.8120, lng: 80.0425 },
    { id: 'zone-9',  name: 'Parking Area',           lat: 12.8135, lng: 80.0415 },
    { id: 'zone-10', name: 'Canteen & Food Court',   lat: 12.8112, lng: 80.0450 },
    { id: 'zone-11', name: 'Hostel Block',           lat: 12.8090, lng: 80.0445 },
    { id: 'zone-12', name: 'Research Lab Wing',      lat: 12.8105, lng: 80.0420 },
  ];

  // Realistic crowd arrivals per hour (tech fest pattern)
  // People arrive gradually, peak at lunch, stay for afternoon sessions
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hourlyPattern = [
    // { hour, newArrivals, zoneWeights (which zones get traffic at that hour) }
    { hour: 8,  arrivals: 15,  weights: { 'zone-4': 8, 'zone-9': 5, 'zone-8': 2 } },
    { hour: 9,  arrivals: 35,  weights: { 'zone-4': 12, 'zone-1': 8, 'zone-3': 6, 'zone-8': 5, 'zone-9': 4 } },
    { hour: 10, arrivals: 50,  weights: { 'zone-1': 15, 'zone-3': 12, 'zone-6': 8, 'zone-2': 6, 'zone-5': 5, 'zone-8': 4 } },
    { hour: 11, arrivals: 65,  weights: { 'zone-1': 18, 'zone-3': 14, 'zone-7': 10, 'zone-6': 8, 'zone-2': 7, 'zone-12': 4, 'zone-5': 4 } },
    { hour: 12, arrivals: 80,  weights: { 'zone-10': 22, 'zone-1': 15, 'zone-3': 12, 'zone-7': 10, 'zone-6': 8, 'zone-2': 6, 'zone-11': 4, 'zone-5': 3 } },
    { hour: 13, arrivals: 70,  weights: { 'zone-10': 18, 'zone-1': 14, 'zone-3': 10, 'zone-7': 8, 'zone-8': 7, 'zone-6': 5, 'zone-2': 4, 'zone-12': 4 } },
    { hour: 14, arrivals: 85,  weights: { 'zone-1': 22, 'zone-3': 16, 'zone-10': 12, 'zone-7': 10, 'zone-8': 8, 'zone-6': 7, 'zone-2': 5, 'zone-12': 3, 'zone-5': 2 } },
    { hour: 15, arrivals: 90,  weights: { 'zone-1': 25, 'zone-3': 18, 'zone-10': 14, 'zone-7': 10, 'zone-8': 8, 'zone-6': 6, 'zone-2': 5, 'zone-12': 4 } },
    { hour: 16, arrivals: 75,  weights: { 'zone-1': 20, 'zone-3': 15, 'zone-10': 10, 'zone-7': 8, 'zone-4': 7, 'zone-8': 6, 'zone-6': 5, 'zone-9': 4 } },
  ];

  let totalInserted = 0;
  let deviceCounter = 0;

  for (const { hour, arrivals, weights } of hourlyPattern) {
    const batch = [];
    
    // Distribute arrivals across the hour (random minutes)
    for (const [zoneId, count] of Object.entries(weights)) {
      const zone = zones.find(z => z.id === zoneId);
      if (!zone) continue;

      for (let i = 0; i < count; i++) {
        deviceCounter++;
        const pos = jitter(zone.lat, zone.lng, 30);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        const timestamp = new Date(today);
        timestamp.setHours(hour, minute, second);

        batch.push({
          device_id: `simats-${String(deviceCounter).padStart(4, '0')}`,
          latitude: pos.lat,
          longitude: pos.lng,
          accuracy: Math.floor(Math.random() * 15) + 3,
          zone_id: zoneId,
          zone_name: zone.name,
          event_id: 'current',
          created_at: timestamp.toISOString(),
          updated_at: new Date().toISOString(), // current time so they show as "active"
        });
      }
    }

    // Insert in chunks of 50 to avoid payload limits
    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      const { error } = await supabase.from('attendee_locations').insert(chunk);
      if (error) {
        console.log(`  ❌ Hour ${hour}: ${error.message}`);
      }
    }

    totalInserted += batch.length;
    const bar = '█'.repeat(Math.round(arrivals / 5)) + '░'.repeat(20 - Math.round(arrivals / 5));
    console.log(`  ${String(hour).padStart(2, '0')}:00  ${bar}  ${String(arrivals).padStart(3)} check-ins`);
  }

  console.log(`\n  ✅ Total: ${totalInserted} GPS records across ${hourlyPattern.length} hours\n`);

  // Verify the timeline data
  console.log('┌── TIMELINE VERIFICATION ──────────────────────────────────┐');
  
  const { data: allLocs } = await supabase
    .from('attendee_locations')
    .select('created_at, zone_name')
    .eq('event_id', 'current')
    .order('created_at', { ascending: true });

  const hourMap = {};
  (allLocs || []).forEach(row => {
    const dt = new Date(row.created_at);
    const hourKey = `${String(dt.getHours()).padStart(2, '0')}:00`;
    if (!hourMap[hourKey]) hourMap[hourKey] = 0;
    hourMap[hourKey]++;
  });

  Object.entries(hourMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([hour, count]) => {
    const bar = '█'.repeat(Math.round(count / 5)) + '░'.repeat(20 - Math.round(count / 5));
    console.log(`│  ${hour}  ${bar}  ${String(count).padStart(3)} records`);
  });

  console.log(`│`);
  console.log(`│  📊 buildCrowdTimeline() will now show ${Object.keys(hourMap).length} data points!`);
  console.log('└───────────────────────────────────────────────────────────┘\n');

  console.log('🌐 Refresh dashboard: https://pdd-tawny.vercel.app/dashboard');
  console.log('📊 Refresh analytics: https://pdd-tawny.vercel.app/analytics');
}

fixTimeline().catch(console.error);
