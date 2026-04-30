import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing Supabase connection...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // Test 1: Check admin_settings
    console.log('\n1. Testing admin_settings table...')
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('❌ Error:', settingsError.message)
    } else {
      console.log('✅ admin_settings:', settings)
    }

    // Test 2: Check interns table
    console.log('\n2. Testing interns table...')
    const { data: interns, error: internsError } = await supabase
      .from('interns')
      .select('*')

    if (internsError) {
      console.error('❌ Error:', internsError.message)
    } else {
      console.log('✅ interns count:', interns.length)
    }

    // Test 3: Check certifications table
    console.log('\n3. Testing certifications table...')
    const { data: certs, error: certsError } = await supabase
      .from('certifications')
      .select('*')

    if (certsError) {
      console.error('❌ Error:', certsError.message)
    } else {
      console.log('✅ certifications count:', certs.length)
    }

    console.log('\n✅ Connection successful!')
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  }
}

testConnection()
