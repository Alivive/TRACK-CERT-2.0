// List all users in the system
// Usage: node list-users.js [search-term]

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listUsers(searchTerm = '') {
  console.log('\n=== User List ===');
  if (searchTerm) {
    console.log('Search term:', searchTerm);
  }
  console.log('================\n');

  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // Get all database users
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (dbError) throw dbError;

    // Filter if search term provided
    let filteredAuthUsers = authUsers.users;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredAuthUsers = authUsers.users.filter(u => 
        u.email.toLowerCase().includes(term) ||
        u.user_metadata?.full_name?.toLowerCase().includes(term)
      );
    }

    console.log(`Found ${filteredAuthUsers.length} user(s) in Supabase Auth:\n`);

    for (const authUser of filteredAuthUsers) {
      const dbUser = dbUsers.find(u => u.id === authUser.id);
      const status = dbUser ? '✅' : '❌';
      
      console.log(`${status} ${authUser.email}`);
      console.log(`   Auth ID: ${authUser.id}`);
      console.log(`   Name: ${authUser.user_metadata?.full_name || 'Not set'}`);
      console.log(`   Role: ${authUser.user_metadata?.role || 'Not set'}`);
      console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(authUser.created_at).toLocaleString()}`);
      
      if (dbUser) {
        console.log(`   DB Profile: ✅ Found`);
        console.log(`   DB Name: ${dbUser.full_name}`);
        console.log(`   DB Role: ${dbUser.role}`);
        console.log(`   Intern ID: ${dbUser.intern_id || 'None'}`);
      } else {
        console.log(`   DB Profile: ❌ MISSING - User cannot login!`);
      }
      console.log('');
    }

    // Check for orphaned database users
    const orphanedUsers = dbUsers.filter(dbUser => 
      !authUsers.users.find(authUser => authUser.id === dbUser.id)
    );

    if (orphanedUsers.length > 0) {
      console.log(`\n⚠️  Found ${orphanedUsers.length} orphaned database user(s):`);
      console.log('(Users in database but not in auth - should be cleaned up)\n');
      
      for (const orphan of orphanedUsers) {
        console.log(`❌ ${orphan.email}`);
        console.log(`   DB ID: ${orphan.id}`);
        console.log(`   Name: ${orphan.full_name}`);
        console.log(`   Role: ${orphan.role}`);
        console.log('');
      }
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total Auth Users: ${authUsers.users.length}`);
    console.log(`Total DB Users: ${dbUsers.length}`);
    console.log(`Users with complete profiles: ${dbUsers.filter(db => authUsers.users.find(a => a.id === db.id)).length}`);
    console.log(`Users missing DB profile: ${authUsers.users.filter(a => !dbUsers.find(db => db.id === a.id)).length}`);
    console.log(`Orphaned DB records: ${orphanedUsers.length}`);
    console.log('================\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

const searchTerm = process.argv[2] || '';
listUsers(searchTerm).catch(console.error);
