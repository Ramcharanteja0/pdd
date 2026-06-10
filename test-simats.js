/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  CrowdIQ — FULL EVENT SIMULATION                                 ║
 * ║  Saveetha Institute of Medical & Technical Sciences (SIMATS)      ║
 * ║  Thandalam, Chennai 602105, Tamil Nadu                            ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * Simulates a real college tech fest with:
 *  - 12 campus zones with real SIMATS coordinates
 *  - 150 attendees tracked via GPS across campus
 *  - Realistic density patterns (auditorium packed, parking empty)
 *  - Live alerts, incidents, predictions, staff, vendors
 *  - Dashboard traffic data
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hpdnuczygunkndzklaik.supabase.co',
  'sb_publishable_Wlvq-QD7k68Vi_LNEi9mWA_UiarPpgX'
);

// Helper: generate random GPS jitter within a zone
function jitter(lat, lng, meters = 25) {
  const dLat = (Math.random() - 0.5) * (meters / 111320) * 2;
  const dLng = (Math.random() - 0.5) * (meters / (111320 * Math.cos(lat * Math.PI / 180))) * 2;
  return { lat: lat + dLat, lng: lng + dLng };
}

async function runFullTest() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🎓 SIMATS TECH FEST 2026 — FULL EVENT TEST                  ║');
  console.log('║  Saveetha Institute of Medical & Technical Sciences           ║');
  console.log('║  Thandalam, Chennai 602105                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Set up SIMATS campus zones
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 1: SETTING UP SIMATS CAMPUS ZONES ─────────────────────┐');

  // SIMATS Thandalam campus coordinates (approximate real locations)
  const simatsZones = [
    { id: 'zone-1',  name: 'Main Auditorium',       lat: 12.8115, lng: 80.0435, capacity: 1500, density: 0, radius_meters: 60 },
    { id: 'zone-2',  name: 'Dental Sciences Block',  lat: 12.8122, lng: 80.0442, capacity: 800,  density: 0, radius_meters: 50 },
    { id: 'zone-3',  name: 'Engineering Block',      lat: 12.8108, lng: 80.0428, capacity: 1200, density: 0, radius_meters: 55 },
    { id: 'zone-4',  name: 'Main Entrance Gate',     lat: 12.8130, lng: 80.0420, capacity: 500,  density: 0, radius_meters: 40 },
    { id: 'zone-5',  name: 'Central Library',        lat: 12.8118, lng: 80.0448, capacity: 600,  density: 0, radius_meters: 45 },
    { id: 'zone-6',  name: 'Medical College',        lat: 12.8102, lng: 80.0440, capacity: 1000, density: 0, radius_meters: 55 },
    { id: 'zone-7',  name: 'Sports Complex',         lat: 12.8095, lng: 80.0430, capacity: 2000, density: 0, radius_meters: 80 },
    { id: 'zone-8',  name: 'Seminar Hall A',         lat: 12.8120, lng: 80.0425, capacity: 400,  density: 0, radius_meters: 35 },
    { id: 'zone-9',  name: 'Parking Area',           lat: 12.8135, lng: 80.0415, capacity: 800,  density: 0, radius_meters: 60 },
    { id: 'zone-10', name: 'Canteen & Food Court',   lat: 12.8112, lng: 80.0450, capacity: 700,  density: 0, radius_meters: 50 },
    { id: 'zone-11', name: 'Hostel Block',           lat: 12.8090, lng: 80.0445, capacity: 500,  density: 0, radius_meters: 45 },
    { id: 'zone-12', name: 'Research Lab Wing',      lat: 12.8105, lng: 80.0420, capacity: 300,  density: 0, radius_meters: 35 },
  ];

  const { error: zErr } = await supabase.from('zones').upsert(simatsZones, { onConflict: 'id' });
  console.log(zErr ? `│  ❌ Zone error: ${zErr.message}` : '│  ✅ 12 SIMATS campus zones configured');
  simatsZones.forEach(z => {
    console.log(`│     📍 ${z.name.padEnd(24)} [${z.lat}, ${z.lng}]  cap: ${z.capacity}`);
  });
  console.log('└───────────────────────────────────────────────────────────────┘\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Clear old data and insert 150 attendees
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 2: DEPLOYING 150 ATTENDEES ACROSS CAMPUS ──────────────┐');

  // Clear old test data
  await supabase.from('attendee_locations').delete().like('device_id', 'saveetha-%');
  await supabase.from('attendee_locations').delete().like('device_id', 'simats-%');
  await supabase.from('attendee_locations').delete().like('device_id', 'test-%');
  await supabase.from('attendee_locations').delete().like('device_id', 'phone-%');

  // Realistic crowd distribution for a college tech fest at 2:30 PM
  const crowdDistribution = [
    { zone: simatsZones[0], count: 35, label: 'Main Auditorium — Keynote happening'      },
    { zone: simatsZones[1], count: 12, label: 'Dental Sciences — Workshop session'        },
    { zone: simatsZones[2], count: 28, label: 'Engineering Block — Project demos'         },
    { zone: simatsZones[3], count: 8,  label: 'Main Entrance — Steady flow'               },
    { zone: simatsZones[4], count: 10, label: 'Library — Study/quiet zone'                },
    { zone: simatsZones[5], count: 15, label: 'Medical College — Health booth'             },
    { zone: simatsZones[6], count: 18, label: 'Sports Complex — Competitions'             },
    { zone: simatsZones[7], count: 9,  label: 'Seminar Hall A — Panel discussion'         },
    { zone: simatsZones[8], count: 3,  label: 'Parking — Sparse'                          },
    { zone: simatsZones[9], count: 22, label: 'Food Court — Lunch rush continuing'        },
    { zone: simatsZones[10], count: 5, label: 'Hostel Block — Low activity'               },
    { zone: simatsZones[11], count: 6, label: 'Research Lab — Demos'                      },
  ];

  let totalInserted = 0;
  for (const { zone, count, label } of crowdDistribution) {
    const batch = [];
    for (let i = 0; i < count; i++) {
      const pos = jitter(zone.lat, zone.lng, 30);
      batch.push({
        device_id: `simats-${zone.id}-${String(i).padStart(3, '0')}`,
        latitude: pos.lat,
        longitude: pos.lng,
        accuracy: Math.floor(Math.random() * 15) + 3,
        zone_id: zone.id,
        zone_name: zone.name,
        event_id: 'current',
      });
    }
    const { error } = await supabase.from('attendee_locations').insert(batch);
    if (!error) {
      totalInserted += count;
      const bar = '█'.repeat(Math.min(20, Math.round(count / 2))) + '░'.repeat(Math.max(0, 20 - Math.round(count / 2)));
      console.log(`│  ${bar} ${String(count).padStart(3)} ppl  ${label}`);
    } else {
      console.log(`│  ❌ ${zone.name}: ${error.message}`);
    }
  }
  console.log(`│`);
  console.log(`│  ✅ Total: ${totalInserted} attendees checked in via GPS`);
  console.log('└───────────────────────────────────────────────────────────────┘\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Update zone densities based on crowd counts
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 3: UPDATING ZONE DENSITIES ────────────────────────────┐');

  for (const { zone, count } of crowdDistribution) {
    // Scale: for demo purposes, multiply tracked count to represent larger crowd
    // In production: density = (actual_count / capacity) * 100
    const scaleFactor = 12; // Each tracked device represents ~12 actual people
    const estimatedReal = count * scaleFactor;
    const density = Math.min(98, Math.round((estimatedReal / zone.capacity) * 100));

    await supabase.from('zones').update({ density }).eq('id', zone.id);

    const status = density >= 80 ? '🔴 CRITICAL' : density >= 55 ? '🟡 MODERATE' : density > 0 ? '🟢 SAFE' : '⚪ EMPTY';
    console.log(`│  ${status}  ${zone.name.padEnd(24)} ${String(density).padStart(3)}%  (${estimatedReal}/${zone.capacity} est.)`);
  }
  console.log('└───────────────────────────────────────────────────────────────┘\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Seed predictions for the event
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 4: AI PREDICTIONS ─────────────────────────────────────┐');

  // Clear old predictions
  await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const predictions = [
    { zone: 'Main Auditorium',     risk: 'HIGH',   prediction: 'Keynote session ending in 15 min — expect 300+ crowd surge at exits', action: 'Deploy 6 volunteers at exit gates, open side doors', confidence: 94 },
    { zone: 'Canteen & Food Court', risk: 'HIGH',   prediction: 'Food court at 92% capacity, queue times exceeding 25 minutes', action: 'Activate overflow seating in Hostel Block courtyard', confidence: 89 },
    { zone: 'Engineering Block',   risk: 'MEDIUM', prediction: 'Project demo area congested, bottleneck at corridor B2', action: 'Open alternate corridor via Research Lab Wing', confidence: 82 },
    { zone: 'Main Entrance Gate',  risk: 'MEDIUM', prediction: 'VIP convoy arriving at 3:00 PM, expect traffic spike', action: 'Reserve Lane 1 for VIP, redirect others to Gate 2', confidence: 76 },
    { zone: 'Sports Complex',      risk: 'LOW',    prediction: 'Cricket finals starting at 3:30 PM, crowd building steadily', action: 'Maintain current security, add 2 medical staff', confidence: 71 },
  ];

  const { error: pErr } = await supabase.from('predictions').insert(predictions);
  predictions.forEach(p => {
    const icon = p.risk === 'HIGH' ? '🔴' : p.risk === 'MEDIUM' ? '🟡' : '🟢';
    console.log(`│  ${icon} [${p.risk.padEnd(6)}] ${p.zone.padEnd(22)} conf: ${p.confidence}%`);
    console.log(`│     → ${p.action}`);
  });
  console.log(pErr ? `│  ❌ ${pErr.message}` : '│  ✅ 5 AI predictions loaded');
  console.log('└───────────────────────────────────────────────────────────────┘\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Seed vendors
  // ═══════════════════════════════════════════════════════════
  console.log('┌── STEP 5: VENDOR DATA ────────────────────────────────────────┐');

  await supabase.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const vendors = [
    { name: 'Saveetha Canteen',     zone: 'Canteen & Food Court', type: 'Food',       status: 'critical', visits: 580, revenue: 43500, wait_time: 25, rating: 3.8 },
    { name: 'Chai Sutta Bar',       zone: 'Canteen & Food Court', type: 'Beverage',   status: 'moderate', visits: 420, revenue: 12600, wait_time: 10, rating: 4.4 },
    { name: 'Pizza Point',          zone: 'Canteen & Food Court', type: 'Food',       status: 'moderate', visits: 310, revenue: 28000, wait_time: 15, rating: 4.1 },
    { name: 'Tech Merch Store',     zone: 'Engineering Block',    type: 'Merchandise', status: 'safe',    visits: 190, revenue: 67000, wait_time: 3,  rating: 4.3 },
    { name: 'Juice Junction',       zone: 'Sports Complex',       type: 'Beverage',   status: 'safe',    visits: 280, revenue: 8400,  wait_time: 4,  rating: 4.6 },
    { name: 'Photobooth Studio',    zone: 'Main Auditorium',      type: 'Service',    status: 'moderate', visits: 150, revenue: 22500, wait_time: 12, rating: 4.5 },
    { name: 'Medical First Aid',    zone: 'Medical College',      type: 'Service',    status: 'safe',    visits: 45,  revenue: 0,     wait_time: 2,  rating: 4.9 },
    { name: 'Stationery Corner',    zone: 'Central Library',      type: 'Merchandise', status: 'safe',   visits: 120, revenue: 9600,  wait_time: 1,  rating: 4.2 },
  ];

  const { error: vErr } = await supabase.from('vendors').insert(vendors);
  vendors.forEach(v => {
    const icon = v.status === 'critical' ? '🔴' : v.status === 'moderate' ? '🟡' : '🟢';
    console.log(`│  ${icon} ${v.name.padEnd(20)} ${v.zone.padEnd(22)} ₹${v.revenue.toLocaleString()}`);
  });
  console.log(vErr ? `│  ❌ ${vErr.message}` : '│  ✅ 8 vendors loaded');
  console.log('└───────────────────────────────────────────────────────────────┘\n');

  // ═══════════════════════════════════════════════════════════
  // STEP 6: Final Dashboard Summary
  // ═══════════════════════════════════════════════════════════
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  📊 DASHBOARD TRAFFIC SUMMARY                                ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');

  // Read back all data
  const { data: finalZones } = await supabase.from('zones').select('*').order('density', { ascending: false });
  const { data: finalAttendees } = await supabase.from('attendee_locations').select('zone_name').eq('event_id', 'current');
  const { data: finalPreds } = await supabase.from('predictions').select('*');
  const { data: finalVendors } = await supabase.from('vendors').select('*');

  const totalPeople = (finalAttendees || []).length;
  const totalCapacity = (finalZones || []).reduce((s, z) => s + z.capacity, 0);
  const criticalZones = (finalZones || []).filter(z => z.density >= 80);
  const moderateZones = (finalZones || []).filter(z => z.density >= 55 && z.density < 80);
  const safeZones = (finalZones || []).filter(z => z.density > 0 && z.density < 55);
  const totalRevenue = (finalVendors || []).reduce((s, v) => s + (v.revenue || 0), 0);

  console.log('║                                                               ║');
  console.log(`║  👥 TRACKED ATTENDEES:    ${String(totalPeople).padStart(6)}                            ║`);
  console.log(`║  🏟️  VENUE CAPACITY:      ${String(totalCapacity).padStart(6)}                            ║`);
  console.log(`║  📊 OVERALL LOAD:         ${String(Math.round((totalPeople * 12 / totalCapacity) * 100)).padStart(5)}%                            ║`);
  console.log(`║  🔴 CRITICAL ZONES:       ${String(criticalZones.length).padStart(6)}                            ║`);
  console.log(`║  🟡 MODERATE ZONES:       ${String(moderateZones.length).padStart(6)}                            ║`);
  console.log(`║  🟢 SAFE ZONES:           ${String(safeZones.length).padStart(6)}                            ║`);
  console.log(`║  ⚡ AI PREDICTIONS:       ${String((finalPreds || []).length).padStart(6)}                            ║`);
  console.log(`║  💰 VENDOR REVENUE:    ₹${totalRevenue.toLocaleString().padStart(8)}                            ║`);
  console.log('║                                                               ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  ZONE HEATMAP                                                ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');

  (finalZones || []).forEach(z => {
    const d = z.density || 0;
    const bar = '█'.repeat(Math.round(d / 5)) + '░'.repeat(20 - Math.round(d / 5));
    const status = d >= 80 ? '🔴' : d >= 55 ? '🟡' : d > 0 ? '🟢' : '⚪';
    const count = crowdDistribution.find(c => c.zone.id === z.id)?.count || 0;
    console.log(`║  ${status} ${z.name.padEnd(22)} ${bar} ${String(d).padStart(3)}% │ ${String(count).padStart(3)} GPS ║`);
  });

  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  CROWD FLOW BY ZONE                                          ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║                                                               ║');
  console.log('║  Main Auditorium  ████████████████████████████████████ 35     ║');
  console.log('║  Engineering Blk  ████████████████████████████░░░░░░░ 28     ║');
  console.log('║  Food Court       ██████████████████████░░░░░░░░░░░░ 22     ║');
  console.log('║  Sports Complex   ██████████████████░░░░░░░░░░░░░░░░ 18     ║');
  console.log('║  Medical College  ███████████████░░░░░░░░░░░░░░░░░░░ 15     ║');
  console.log('║  Dental Sciences  ████████████░░░░░░░░░░░░░░░░░░░░░░ 12     ║');
  console.log('║  Library          ██████████░░░░░░░░░░░░░░░░░░░░░░░░ 10     ║');
  console.log('║  Seminar Hall     █████████░░░░░░░░░░░░░░░░░░░░░░░░░  9     ║');
  console.log('║  Main Entrance    ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  8     ║');
  console.log('║  Research Lab     ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  6     ║');
  console.log('║  Hostel Block     █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  5     ║');
  console.log('║  Parking          ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  3     ║');
  console.log('║                                                               ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  ⏰ Time: ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).padEnd(51) + '║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║                                                               ║');
  console.log('║  🌐 LIVE DASHBOARD:  https://pdd-tawny.vercel.app/dashboard  ║');
  console.log('║  🗺️  LIVE HEATMAP:   https://pdd-tawny.vercel.app/heatmap   ║');
  console.log('║  📍 GPS TRACKING:    https://pdd-tawny.vercel.app/tracking   ║');
  console.log('║  📱 ATTENDEE CHECK:  https://pdd-tawny.vercel.app/checkin    ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
}

runFullTest().catch(console.error);
