import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // Use ANON key like frontend
)

async function testAuthSession() {
  try {
    console.log('Testing auth session (simulating frontend)...\n')

    // Test 1: Get current session
    console.log('1. Checking for existing session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError)
    } else if (session) {
      console.log('✅ Session found:', session.user.email)
      console.log('   User ID:', session.user.id)
      
      // Test 2: Fetch profile
      console.log('\n2. Fetching user profile...')
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (profileError) {
        console.error('❌ Profile error:', profileError)
      } else {
        console.log('✅ Profile found:', profile.full_name)
        console.log('   Role:', profile.role)
      }
    } else {
      console.log('ℹ️  No active session')
    }

    console.log('\n✅ Test complete!')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testAuthSession()
