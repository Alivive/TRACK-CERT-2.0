import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateUserName() {
  try {
    console.log('Updating user name to "App Administrator"...\n')

    const { data, error } = await supabase
      .from('users')
      .update({ 
        full_name: 'App Administrator',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'vivealiviw@gmail.com')
      .select()
      .single()

    if (error) {
      console.error('❌ Error:', error)
    } else {
      console.log('✅ User updated successfully!')
      console.log('\nUpdated Profile:')
      console.log(`   Full Name: ${data.full_name}`)
      console.log(`   Email: ${data.email}`)
      console.log(`   Role: ${data.role}`)
      console.log(`   Updated: ${data.updated_at}`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

updateUserName()
