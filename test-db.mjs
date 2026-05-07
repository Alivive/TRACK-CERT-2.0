import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Checking database tables and realtime status...');
  
  // Check users for Luqman
  const { data: users, error: usersError } = await supabase.from('users').select('*').ilike('full_name', '%Luqman%');
  console.log('Users matching Luqman:', users, usersError?.message || '');
  
  const { data: interns, error: internsError } = await supabase.from('interns').select('*').ilike('first_name', '%Luqman%');
  console.log('Interns matching Luqman:', interns, internsError?.message || '');
  
  // Try to check realtime publications
  try {
    const { data: pub, error: pubError } = await supabase.rpc('get_realtime_tables').catch(() => ({}));
    console.log('Realtime tables:', pub, pubError?.message || '');
  } catch(e) {
    console.log('Could not check realtime tables');
  }
}
run();
