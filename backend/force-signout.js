import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function forceSignOut() {
  try {
    console.log('Force signing out all users...\n')

    // Get all users
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('Error:', error)
      return
    }

    console.log(`Found ${users.length} user(s)`)

    // Sign out each user by deleting their sessions
    for (const user of users) {
      console.log(`Signing out: ${user.email}`)
      
      const { error: signOutError } = await supabase.auth.admin.signOut(user.id)
      
      if (signOutError) {
        console.error(`  ❌ Error:`, signOutError.message)
      } else {
        console.log(`  ✅ Signed out successfully`)
      }
    }

    console.log('\n✅ All users signed out!')
    console.log('Now clear your browser cache and refresh the page.')
  } catch (error) {
    console.error('Error:', error)
  }
}

forceSignOut()
