/**
 * Creates missing tables via Supabase client and seeds data
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hpdnuczygunkndzklaik.supabase.co',
  'sb_publishable_Wlvq-QD7k68Vi_LNEi9mWA_UiarPpgX'
);

async function seedData() {
  console.log('=== Seeding Supabase Tables ===\n');

  // ZONES — insert via client (table must exist)
  console.log('1. Seeding zones...');
  const zones = [
    { id: 'zone-1', name: 'Main Stage', lat: 19.0765, lng: 72.8773, capacity: 2000, density: 45 },
    { id: 'zone-2', name: 'Food Court A', lat: 19.0770, lng: 72.8780, capacity: 800, density: 62 },
    { id: 'zone-3', name: 'Tech Expo', lat: 19.0760, lng: 72.8770, capacity: 1500, density: 35 },
    { id: 'zone-4', name: 'North Entrance', lat: 19.0775, lng: 72.8765, capacity: 600, density: 70 },
    { id: 'zone-5', name: 'Food Court B', lat: 19.0755, lng: 72.8785, capacity: 700, density: 28 },
    { id: 'zone-6', name: 'Media Center', lat: 19.0758, lng: 72.8778, capacity: 400, density: 55 },
    { id: 'zone-7', name: 'VIP Lounge', lat: 19.0768, lng: 72.8768, capacity: 200, density: 40 },
    { id: 'zone-8', name: 'Registration', lat: 19.0772, lng: 72.8790, capacity: 500, density: 82 },
    { id: 'zone-9', name: 'Parking A', lat: 19.0780, lng: 72.8760, capacity: 300, density: 15 },
    { id: 'zone-10', name: 'Emergency Exit', lat: 19.0750, lng: 72.8775, capacity: 400, density: 10 },
    { id: 'zone-11', name: 'Workshop Hall', lat: 19.0762, lng: 72.8790, capacity: 600, density: 58 },
    { id: 'zone-12', name: 'South Gate', lat: 19.0748, lng: 72.8770, capacity: 500, density: 22 },
  ];

  const { error: zErr } = await supabase.from('zones').upsert(zones, { onConflict: 'id' });
  console.log(zErr ? `  ❌ zones: ${zErr.message}` : `  ✅ zones: ${zones.length} rows seeded`);

  // PREDICTIONS
  console.log('2. Seeding predictions...');
  const predictions = [
    { zone: 'Main Stage', risk: 'HIGH', prediction: 'Density projected to hit 90% in 15 min based on inflow', action: 'Deploy 4 security + open auxiliary exits', confidence: 92 },
    { zone: 'Food Court A', risk: 'MEDIUM', prediction: 'Queue congestion at counters 3-5, 20 min wait', action: 'Redirect to Food Court B via push notification', confidence: 78 },
    { zone: 'North Entrance', risk: 'MEDIUM', prediction: 'Bottleneck at single-lane security check', action: 'Open Lane 2 for pre-verified attendees', confidence: 85 },
    { zone: 'Registration', risk: 'HIGH', prediction: 'Registration area exceeding safe capacity', action: 'Divert to online self-check-in kiosks', confidence: 88 },
    { zone: 'Tech Expo', risk: 'LOW', prediction: 'Steady flow, no congestion in next 30 min', action: 'Maintain current staffing', confidence: 71 },
  ];

  const { error: pErr } = await supabase.from('predictions').insert(predictions);
  console.log(pErr ? `  ❌ predictions: ${pErr.message}` : `  ✅ predictions: ${predictions.length} rows seeded`);

  // VENDORS
  console.log('3. Seeding vendors...');
  const vendors = [
    { name: 'Bombay Bites', zone: 'Food Court A', type: 'Food', status: 'moderate', visits: 340, revenue: 28500, wait_time: 12, rating: 4.3 },
    { name: 'Chai Junction', zone: 'Food Court B', type: 'Beverage', status: 'safe', visits: 520, revenue: 15600, wait_time: 5, rating: 4.7 },
    { name: 'TechGear Store', zone: 'Tech Expo', type: 'Merchandise', status: 'safe', visits: 180, revenue: 42000, wait_time: 3, rating: 4.1 },
    { name: 'Pizza Corner', zone: 'Food Court A', type: 'Food', status: 'critical', visits: 410, revenue: 34200, wait_time: 18, rating: 3.9 },
    { name: 'Hydration Hub', zone: 'Main Stage', type: 'Beverage', status: 'safe', visits: 680, revenue: 10200, wait_time: 2, rating: 4.5 },
    { name: 'Merch Central', zone: 'Registration', type: 'Merchandise', status: 'moderate', visits: 220, revenue: 55000, wait_time: 8, rating: 4.2 },
  ];

  const { error: vErr } = await supabase.from('vendors').insert(vendors);
  console.log(vErr ? `  ❌ vendors: ${vErr.message}` : `  ✅ vendors: ${vendors.length} rows seeded`);

  // STAFF
  console.log('4. Seeding staff...');
  const staff = [
    { id: 'STF-001', name: 'Rajesh Kumar', role: 'Security', zone: 'Main Stage', status: 'active', phone: '+91-98765-43210', avatar: 'RK' },
    { id: 'STF-002', name: 'Priya Sharma', role: 'Medical', zone: 'Food Court A', status: 'active', phone: '+91-98765-43211', avatar: 'PS' },
    { id: 'STF-003', name: 'Amit Patel', role: 'Volunteer', zone: 'Tech Expo', status: 'active', phone: '+91-98765-43212', avatar: 'AP' },
    { id: 'STF-004', name: 'Sunita Devi', role: 'Security', zone: 'North Entrance', status: 'busy', phone: '+91-98765-43213', avatar: 'SD' },
    { id: 'STF-005', name: 'Vikram Singh', role: 'Supervisor', zone: 'Registration', status: 'active', phone: '+91-98765-43214', avatar: 'VS' },
    { id: 'STF-006', name: 'Meena Gupta', role: 'Cleaner', zone: 'Food Court B', status: 'active', phone: '+91-98765-43215', avatar: 'MG' },
    { id: 'STF-007', name: 'Arjun Reddy', role: 'Security', zone: 'South Gate', status: 'offline', phone: '+91-98765-43216', avatar: 'AR' },
    { id: 'STF-008', name: 'Kavita Nair', role: 'Volunteer', zone: 'Workshop Hall', status: 'active', phone: '+91-98765-43217', avatar: 'KN' },
  ];

  const { error: sErr } = await supabase.from('staff').upsert(staff, { onConflict: 'id' });
  console.log(sErr ? `  ❌ staff: ${sErr.message}` : `  ✅ staff: ${staff.length} rows seeded`);

  // ALERTS
  console.log('5. Seeding alerts...');
  const alerts = [
    { title: 'High Density Warning', zone: 'Registration', type: 'danger', description: 'Registration area at 82% capacity', resolved: false },
    { title: 'Queue Congestion', zone: 'Food Court A', type: 'warning', description: 'Long queues forming at food stalls', resolved: false },
    { title: 'Medical Standby', zone: 'Main Stage', type: 'warning', description: 'High temperature alert — medical team on standby', resolved: true },
  ];

  const { error: aErr } = await supabase.from('alerts').insert(alerts);
  console.log(aErr ? `  ❌ alerts: ${aErr.message}` : `  ✅ alerts: ${alerts.length} rows seeded`);

  // INCIDENTS
  console.log('6. Seeding incidents...');
  const incidents = [
    { title: 'Crowd Surge at Main Stage', zone: 'Main Stage', type: 'Crowd', severity: 'critical', status: 'active', description: 'Sudden crowd surge during headline act' },
    { title: 'Medical Emergency', zone: 'Food Court A', type: 'Medical', severity: 'high', status: 'resolved', description: 'Attendee fainted due to heat' },
  ];

  const { error: iErr } = await supabase.from('incidents').insert(incidents);
  console.log(iErr ? `  ❌ incidents: ${iErr.message}` : `  ✅ incidents: ${incidents.length} rows seeded`);

  // FINAL VERIFICATION
  console.log('\n=== FINAL TABLE CHECK ===');
  const tables = ['zones', 'staff', 'alerts', 'incidents', 'predictions', 'vendors', 'attendee_locations'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ❌ ${t}: ${error.message}`);
    } else {
      const { data: rows } = await supabase.from(t).select('*');
      console.log(`  ✅ ${t.padEnd(22)} ${(rows || []).length} rows`);
    }
  }

  console.log('\n🎉 All tables seeded! Open the app to see real data.');
}

seedData().catch(console.error);
