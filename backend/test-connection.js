import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Testing Supabase Connection...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
  try {
    console.log('📊 Testing database queries...\n');

    // Test 1: Fetch users
    console.log('1. Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('   ❌ Error:', usersError.message);
    } else {
      console.log(`   ✅ Success! Found ${users.length} users`);
    }

    // Test 2: Fetch interns
    console.log('2. Testing interns table...');
    const { data: interns, error: internsError } = await supabase
      .from('interns')
      .select('*')
      .limit(5);
    
    if (internsError) {
      console.log('   ❌ Error:', internsError.message);
    } else {
      console.log(`   ✅ Success! Found ${interns.length} interns`);
    }

    // Test 3: Fetch categories
    console.log('3. Testing categories table...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(5);
    
    if (categoriesError) {
      console.log('   ❌ Error:', categoriesError.message);
    } else {
      console.log(`   ✅ Success! Found ${categories.length} categories`);
    }

    // Test 4: Fetch certifications
    console.log('4. Testing certifications table...');
    const { data: certifications, error: certificationsError } = await supabase
      .from('certifications')
      .select('*')
      .limit(5);
    
    if (certificationsError) {
      console.log('   ❌ Error:', certificationsError.message);
    } else {
      console.log(`   ✅ Success! Found ${certifications.length} certifications`);
    }

    // Test 5: Fetch books
    console.log('5. Testing books table...');
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('*')
      .limit(5);
    
    if (booksError) {
      console.log('   ❌ Error:', booksError.message);
    } else {
      console.log(`   ✅ Success! Found ${books.length} books`);
    }

    console.log('\n✅ Database connection test completed!');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
