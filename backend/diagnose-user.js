// Diagnostic script for user login issues
// Usage: npm run diagnose <email>

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseUser(email) {
  console.log('\n=== User Diagnosis Report ===');
  console.log('Email:', email);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================\n');

  const normalizedEmail = email.toLowerCase().trim();
  const issues = [];
  const fixes = [];

  // 1. Check Supabase Auth
  console.log('1. Checking Supabase Auth...');
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const authUser = authUsers.users.find(u => 
      u.email.toLowerCase() === normalizedEmail
    );

    if (!authUser) {
      console.log('   ❌ User NOT found in Supabase Auth');
      issues.push('User does not exist in authentication system');
    } else {
      console.log('   ✅ User found in Supabase Auth');
      console.log('      - User ID:', authUser.id);
      console.log('      - Email:', authUser.email);
      console.log('      - Email Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
      console.log('      - Created:', authUser.created_at);
      console.log('      - Metadata:', JSON.stringify(authUser.user_metadata, null, 2));

      if (!authUser.email_confirmed_at) {
        issues.push('Email not confirmed - user needs to verify email');
      }

      // 2. Check users table
      console.log('\n2. Checking users table...');
      const { data: dbUsers, error: dbError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', normalizedEmail);

      if (dbError) {
        console.log('   ❌ Error querying users table:', dbError.message);
        issues.push('Database query error: ' + dbError.message);
      } else if (!dbUsers || dbUsers.length === 0) {
        console.log('   ❌ User profile NOT found in users table');
        issues.push('User profile missing in database');
        fixes.push('Create user profile from auth data');

        // Auto-fix: Create user profile
        console.log('\n   🔧 Attempting to create user profile...');
        const newProfile = {
          id: authUser.id,
          email: authUser.email.toLowerCase(),
          full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
          role: authUser.user_metadata?.role || 'intern',
        };

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          console.log('   ❌ Failed to create profile:', createError.message);
        } else {
          console.log('   ✅ User profile created successfully!');
          console.log('      - ID:', createdUser.id);
          console.log('      - Name:', createdUser.full_name);
          console.log('      - Role:', createdUser.role);

          // 3. Create intern record if needed
          if (createdUser.role === 'intern') {
            console.log('\n3. Creating intern record...');
            const nameParts = createdUser.full_name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const { data: internData, error: internError } = await supabase
              .from('interns')
              .insert([{
                first_name: firstName,
                last_name: lastName,
                email: createdUser.email,
                start_date: new Date().toISOString().split('T')[0]
              }])
              .select()
              .single();

            if (internError) {
              console.log('   ❌ Failed to create intern record:', internError.message);
            } else {
              console.log('   ✅ Intern record created!');
              console.log('      - Intern ID:', internData.id);

              // Link intern to user
              const { error: linkError } = await supabase
                .from('users')
                .update({ intern_id: internData.id })
                .eq('id', createdUser.id);

              if (linkError) {
                console.log('   ❌ Failed to link intern:', linkError.message);
              } else {
                console.log('   ✅ Intern linked to user profile!');
              }
            }
          }
        }
      } else {
        const dbUser = dbUsers[0];
        console.log('   ✅ User profile found in users table');
        console.log('      - ID:', dbUser.id);
        console.log('      - Name:', dbUser.full_name);
        console.log('      - Role:', dbUser.role);
        console.log('      - Intern ID:', dbUser.intern_id || 'None');

        // Check ID match
        if (dbUser.id !== authUser.id) {
          console.log('   ⚠️  WARNING: User ID mismatch!');
          console.log('      - Auth ID:', authUser.id);
          console.log('      - DB ID:', dbUser.id);
          issues.push('User ID mismatch between auth and database');
          fixes.push('Update database user ID to match auth ID');
        }

        // 3. Check intern record if role is intern
        if (dbUser.role === 'intern') {
          console.log('\n3. Checking intern record...');
          const { data: interns, error: internError } = await supabase
            .from('interns')
            .select('*')
            .ilike('email', normalizedEmail);

          if (internError) {
            console.log('   ❌ Error querying interns table:', internError.message);
          } else if (!interns || interns.length === 0) {
            console.log('   ❌ Intern record NOT found');
            issues.push('Intern record missing for intern user');
            fixes.push('Create intern record and link to user');

            // Auto-fix: Create intern record
            console.log('\n   🔧 Attempting to create intern record...');
            const nameParts = dbUser.full_name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const { data: internData, error: createInternError } = await supabase
              .from('interns')
              .insert([{
                first_name: firstName,
                last_name: lastName,
                email: dbUser.email,
                start_date: new Date().toISOString().split('T')[0]
              }])
              .select()
              .single();

            if (createInternError) {
              console.log('   ❌ Failed to create intern:', createInternError.message);
            } else {
              console.log('   ✅ Intern record created!');
              console.log('      - Intern ID:', internData.id);

              // Link to user
              const { error: linkError } = await supabase
                .from('users')
                .update({ intern_id: internData.id })
                .eq('id', dbUser.id);

              if (linkError) {
                console.log('   ❌ Failed to link intern:', linkError.message);
              } else {
                console.log('   ✅ Intern linked to user!');
              }
            }
          } else {
            const intern = interns[0];
            console.log('   ✅ Intern record found');
            console.log('      - Intern ID:', intern.id);
            console.log('      - Name:', intern.first_name, intern.last_name);

            // Check if linked
            if (dbUser.intern_id !== intern.id) {
              console.log('   ⚠️  WARNING: Intern not linked to user!');
              issues.push('Intern record exists but not linked to user profile');
              fixes.push('Link intern record to user profile');

              // Auto-fix: Link intern
              console.log('\n   🔧 Linking intern to user...');
              const { error: linkError } = await supabase
                .from('users')
                .update({ intern_id: intern.id })
                .eq('id', dbUser.id);

              if (linkError) {
                console.log('   ❌ Failed to link:', linkError.message);
              } else {
                console.log('   ✅ Intern linked successfully!');
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    issues.push('System error: ' + error.message);
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  if (issues.length === 0) {
    console.log('✅ No issues found - user should be able to login');
  } else {
    console.log('❌ Issues found:', issues.length);
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  if (fixes.length > 0) {
    console.log('\n🔧 Fixes applied:', fixes.length);
    fixes.forEach((fix, i) => {
      console.log(`   ${i + 1}. ${fix}`);
    });
  }

  console.log('\n=== END REPORT ===\n');
}

// Get email from command line or use default
const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run diagnose <email>');
  console.error('Example: npm run diagnose sadiq.fahiye@example.com');
  process.exit(1);
}

diagnoseUser(email).catch(console.error);
