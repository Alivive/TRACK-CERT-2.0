import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE] Missing Environment Variables. Check your .env file.');
}

// Ensure a true singleton across Vite HMR reloads to prevent GoTrue lock contention
const globalForSupabase = globalThis;

if (!globalForSupabase.supabase) {
  globalForSupabase.supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'certrack-v4-auth'
    }
  });
}

export const supabase = globalForSupabase.supabase;
