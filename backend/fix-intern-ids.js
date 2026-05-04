import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixInternIds() {
  console.log('🔧 Fixing intern_id for existing users...\n');

  // Get all intern users without intern_id
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'intern')
    .is('intern_id', null);

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }

  console.log(`Found ${users.length} intern users without intern_id\n`);

  for (const user of users) {
    console.log(`Processing: ${user.full_name} (${user.email})`);

    // Split name
    const [firstName, ...lastNameParts] = user.full_name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    // Check if intern already exists by email
    const { data: existingIntern } = await supabase
      .from('interns')
      .select('id')
      .eq('email', user.email)
      .single();

    let internId;

    if (existingIntern) {
      console.log(`  ✓ Found existing intern record: ${existingIntern.id}`);
      internId = existingIntern.id;
    } else {
      // Create new intern record
      const { data: newIntern, error: internError } = await supabase
        .from('interns')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: user.email
        })
        .select()
        .single();

      if (internError) {
        console.error(`  ❌ Error creating intern:`, internError);
        continue;
      }

      console.log(`  ✓ Created new intern record: ${newIntern.id}`);
      internId = newIntern.id;
    }

    // Update user with intern_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ intern_id: internId })
      .eq('id', user.id);

    if (updateError) {
      console.error(`  ❌ Error updating user:`, updateError);
    } else {
      console.log(`  ✓ Linked user to intern_id: ${internId}\n`);
    }
  }

  console.log('✅ Done!');
}

fixInternIds();
