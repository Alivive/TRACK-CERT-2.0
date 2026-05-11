// Check Fahiye's complete profile
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFahiye() {
  const email = 'fahiye254@gmail.com';
  
  console.log('\n=== Checking Fahiye Muhammad Profile ===\n');
  
  // 1. Check users table
  console.log('1. Users Table:');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);
  
  if (userError) {
    console.log('   ❌ Error:', userError.message);
  } else if (users && users.length > 0) {
    const user = users[0];
    console.log('   ✅ User found');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Full Name:', user.full_name);
    console.log('   Role:', user.role);
    console.log('   Intern ID:', user.intern_id || '❌ NULL/MISSING');
    console.log('   Created:', user.created_at);
  } else {
    console.log('   ❌ User not found');
  }
  
  // 2. Check interns table
  console.log('\n2. Interns Table:');
  const { data: interns, error: internError } = await supabase
    .from('interns')
    .select('*')
    .eq('email', email);
  
  if (internError) {
    console.log('   ❌ Error:', internError.message);
  } else if (interns && interns.length > 0) {
    const intern = interns[0];
    console.log('   ✅ Intern found');
    console.log('   ID:', intern.id);
    console.log('   Name:', intern.first_name, intern.last_name);
    console.log('   Email:', intern.email);
    console.log('   Start Date:', intern.start_date);
  } else {
    console.log('   ❌ Intern not found');
  }
  
  // 3. Check if they match
  if (users && users.length > 0 && interns && interns.length > 0) {
    const user = users[0];
    const intern = interns[0];
    
    console.log('\n3. Link Status:');
    if (user.intern_id === intern.id) {
      console.log('   ✅ User and Intern are properly linked');
    } else {
      console.log('   ❌ MISMATCH!');
      console.log('   User.intern_id:', user.intern_id);
      console.log('   Intern.id:', intern.id);
      console.log('\n   🔧 Fixing link...');
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ intern_id: intern.id })
        .eq('id', user.id);
      
      if (updateError) {
        console.log('   ❌ Failed to fix:', updateError.message);
      } else {
        console.log('   ✅ Link fixed! User should now be able to access profile.');
      }
    }
  }
  
  // 4. Test the API endpoint
  console.log('\n4. Testing API Endpoint:');
  if (users && users.length > 0) {
    const userId = users[0].id;
    console.log(`   Fetching: /api/users/${userId}`);
    
    try {
      const response = await fetch(`http://localhost:3000/api/users/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('   ✅ API Response successful');
        console.log('   Returned intern_id:', data.data.intern_id || '❌ NULL/MISSING');
      } else {
        console.log('   ❌ API Error:', data.error);
      }
    } catch (fetchError) {
      console.log('   ⚠️  API not running or unreachable');
      console.log('   (This is OK if backend is not started)');
    }
  }
  
  console.log('\n=== End Check ===\n');
}

checkFahiye().catch(console.error);
