import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hpdnuczygunkndzklaik.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wlvq-QD7k68Vi_LNEi9mWA_UiarPpgX';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
