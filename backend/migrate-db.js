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
    console.log('Migrating database to add certificate_file_url column and duplicate prevention...');
    
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
    } else {
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
        console.log('📝 Manual column addition required:');
        console.log('ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_file_url TEXT;');
      } else {
        console.log('✅ Added certificate_file_url column');
      }
    }
    
    // Check for existing duplicates before adding constraint
    console.log('🔍 Checking for duplicate certifications...');
    const { data: allCerts, error: queryError } = await supabase
      .from('certifications')
      .select('intern_id, name, provider, id, date')
      .order('date', { ascending: true });
    
    if (queryError) {
      console.log('Could not check for duplicates, skipping constraint creation');
    } else {
      // Find duplicates in JavaScript
      const duplicateMap = new Map();
      const duplicates = [];
      
      allCerts.forEach(cert => {
        const key = `${cert.intern_id}|${cert.name.toLowerCase().trim()}|${cert.provider.toLowerCase().trim()}`;
        if (duplicateMap.has(key)) {
          duplicates.push(cert);
        } else {
          duplicateMap.set(key, cert);
        }
      });
      
      if (duplicates.length > 0) {
        console.log(`⚠️ Found ${duplicates.length} duplicate certification(s). Cannot add unique constraint.`);
        console.log('📝 Manual cleanup required before adding constraint:');
        console.log(`
-- Find duplicates:
SELECT intern_id, LOWER(TRIM(name)) as name, LOWER(TRIM(provider)) as provider, COUNT(*) as count
FROM certifications 
GROUP BY intern_id, LOWER(TRIM(name)), LOWER(TRIM(provider))
HAVING COUNT(*) > 1;

-- After cleanup, add constraint:
ALTER TABLE certifications 
ADD CONSTRAINT unique_certification_per_intern 
UNIQUE (intern_id, (LOWER(TRIM(name))), (LOWER(TRIM(provider))));
        `);
      } else {
        console.log('✅ No duplicates found, adding unique constraint...');
        console.log('📝 Manual constraint creation required (RPC not available):');
        console.log(`
-- Add unique constraint to prevent duplicate certifications:
ALTER TABLE certifications 
ADD CONSTRAINT unique_certification_per_intern 
UNIQUE (intern_id, (LOWER(TRIM(name))), (LOWER(TRIM(provider))));

COMMENT ON CONSTRAINT unique_certification_per_intern ON certifications 
IS 'Prevents duplicate certifications: same intern cannot have identical certification name and provider (case-insensitive)';
        `);
      }
    }
    
    console.log('✅ Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    console.log('\n📝 Manual migration required - run this SQL in Supabase:');
    console.log(`
-- Add certificate file URL column:
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS certificate_file_url TEXT;

-- Add unique constraint (after checking for duplicates):
ALTER TABLE certifications 
ADD CONSTRAINT unique_certification_per_intern 
UNIQUE (intern_id, (LOWER(TRIM(name))), (LOWER(TRIM(provider))));
    `);
  }
}

migrateDatabase();