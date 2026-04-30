import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyUser() {
  try {
    console.log('Checking Supabase for user data...\n')

    // Check auth users
    console.log('1. AUTH USERS:')
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error:', authError)
    } else {
      console.log(`✅ Found ${users.length} auth user(s)`)
      users.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`)
        console.log(`     Created: ${user.created_at}`)
        console.log(`     Confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`)
      })
    }

    // Check user profiles
    console.log('\n2. USER PROFILES:')
    const { data: profiles, error: profileError } = await supabase
      .from('users')
      .select('*')

    if (profileError) {
      console.error('❌ Error:', profileError)
    } else {
      console.log(`✅ Found ${profiles.length} profile(s)`)
      profiles.forEach(profile => {
        console.log(`   - ${profile.full_name} (${profile.email})`)
        console.log(`     Role: ${profile.role}`)
        console.log(`     ID: ${profile.id}`)
        console.log(`     Created: ${profile.created_at}`)
      })
    }

    console.log('\n✅ Verification complete!')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

verifyUser()
