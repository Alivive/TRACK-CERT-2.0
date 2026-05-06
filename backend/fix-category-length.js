import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixCategoryLength() {
  console.log('🔧 Updating category column to allow longer values...');
  
  try {
    // Use raw SQL to alter the column type
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE certifications 
        ALTER COLUMN category TYPE VARCHAR(100);
      `
    });
    
    if (error) {
      console.error('❌ Error:', error);
      console.log('\n⚠️  Manual fix required:');
      console.log('Run this SQL in Supabase SQL Editor:');
      console.log('ALTER TABLE certifications ALTER COLUMN category TYPE VARCHAR(100);');
    } else {
      console.log('✅ Category column updated successfully!');
      console.log('Category can now store up to 100 characters.');
    }
  } catch (err) {
    console.error('❌ Exception:', err);
    console.log('\n⚠️  Manual fix required:');
    console.log('Go to Supabase Dashboard → SQL Editor');
    console.log('Run this SQL:');
    console.log('ALTER TABLE certifications ALTER COLUMN category TYPE VARCHAR(100);');
  }
}

fixCategoryLength();
