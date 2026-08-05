/**
 * Quick fix: Set realistic densities directly to show dashboard traffic
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hpdnuczygunkndzklaik.supabase.co',
  'sb_publishable_Wlvq-QD7k68Vi_LNEi9mWA_UiarPpgX'
);

async function fixDensities() {
  // Realistic afternoon tech fest densities
  const densities = {
    'zone-1':  88,  // Main Auditorium — keynote happening → CRITICAL
    'zone-2':  55,  // Dental Sciences — workshop → MODERATE
    'zone-3':  78,  // Engineering Block — packed with demos → MODERATE
    'zone-4':  62,  // Main Entrance — steady flow → MODERATE
    'zone-5':  35,  // Library — quiet → SAFE
    'zone-6':  48,  // Medical College → SAFE
    'zone-7':  42,  // Sports Complex → SAFE
    'zone-8':  85,  // Seminar Hall A — packed → CRITICAL
    'zone-9':  12,  // Parking → SAFE
    'zone-10': 92,  // Food Court — lunch rush → CRITICAL
    'zone-11': 18,  // Hostel Block → SAFE
    'zone-12': 45,  // Research Lab → SAFE
  };

  console.log('Updating zone densities for realistic traffic...\n');

  for (const [id, density] of Object.entries(densities)) {
    await supabase.from('zones').update({ density }).eq('id', id);
  }

  // Verify
  const { data: zones } = await supabase.from('zones').select('name, density, capacity').order('density', { ascending: false });
  
  let critical = 0, moderate = 0, safe = 0;
  (zones || []).forEach(z => {
    const d = z.density;
    const bar = '█'.repeat(Math.round(d / 5)) + '░'.repeat(20 - Math.round(d / 5));
    const status = d >= 80 ? '🔴 CRITICAL' : d >= 55 ? '🟡 MODERATE' : '🟢 SAFE';
    if (d >= 80) critical++;
    else if (d >= 55) moderate++;
    else safe++;
    console.log(`${status}  ${z.name.padEnd(24)} ${bar} ${String(d).padStart(3)}%  (${Math.round(z.capacity * d / 100)}/${z.capacity})`);
  });

  console.log(`\n✅ Done! Critical: ${critical} | Moderate: ${moderate} | Safe: ${safe}`);
  console.log('\n🌐 Open https://pdd-tawny.vercel.app/dashboard to see the traffic!');
}

fixDensities().catch(console.error);
