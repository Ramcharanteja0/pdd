import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tnqymrdctoxwawggaqvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRucXltcmRjdG94d2F3Z2dhcXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDQ5MjQsImV4cCI6MjA1NzYyMDkyNH0.75mPjPvhgTUp5mJp-5_Lh8_1ZzGvC40a1E_kY3k1s1o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
