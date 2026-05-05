import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateDatabase() {
  try {
    console.log('Migrating database to add certificate_file_url column...');
    
    // Check if column already exists
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'certifications')
      .eq('column_name', 'certificate_file_url');
    
    if (columnsError) {
      console.log('Could not check existing columns, proceeding with migration...');
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ certificate_file_url column already exists');
      return;
    }
    
    // Add the certificate_file_url column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE certifications 
        ADD COLUMN IF NOT EXISTS certificate_file_url TEXT;
        
        COMMENT ON COLUMN certifications.certificate_file_url 
        IS 'URL to uploaded certificate file (PDF/image) stored in Supabase Storage';
      `
    });
    
    if (alterError) {
      console.error('❌ Failed to add column:', alterError);
      // Try alternative approach
      console.log('Trying alternative migration approach...');
      
      // Insert a test record to see current schema
      const { data: testData, error: testError } = await supabase
        .from('certifications')
        .select('*')
        .limit(1);
      
      if (testError) {
        throw new Error('Cannot access certifications table: ' + testError.message);
      }
      
      console.log('Current schema sample:', testData?.[0] ? Object.keys(testData[0]) : 'No data');
      
      throw alterError;
    }
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 Added certificate_file_url column to certifications table');
    
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    console.log('\n📝 Manual migration required:');
    console.log('Please run this SQL in your Supabase SQL editor:');
    console.log('');
    console.log('ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_file_url TEXT;');
    console.log('');
    console.log('COMMENT ON COLUMN certifications.certificate_file_url IS \'URL to uploaded certificate file (PDF/image) stored in Supabase Storage\';');
    console.log('');
  }
}

migrateDatabase();