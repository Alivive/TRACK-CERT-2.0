import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixUserProfile() {
  try {
    console.log('Checking for users without profiles...\n')

    // Get all auth users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }

    console.log(`Found ${users.length} auth user(s)\n`)

    // Check each user for profile
    for (const user of users) {
      console.log(`Checking user: ${user.email} (${user.id})`)

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log(`  ❌ No profile found. Creating...`)

        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: user.user_metadata?.role || 'admin', // Default to admin for first user
          })
          .select()
          .single()

        if (insertError) {
          console.error(`  ❌ Error creating profile:`, insertError)
        } else {
          console.log(`  ✅ Profile created:`, newProfile)
        }
      } else if (profile) {
        console.log(`  ✅ Profile exists:`, profile.full_name, `(${profile.role})`)
      } else {
        console.error(`  ❌ Error checking profile:`, profileError)
      }

      console.log('')
    }

    console.log('✅ Done!')
  } catch (error) {
    console.error('Error:', error)
  }
}

fixUserProfile()
