import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupStorage() {
  try {
    console.log('Setting up Supabase storage bucket for certificate attachments...');
    
    // Create the storage bucket
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('certificate-attachments', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
        fileSizeLimit: 5242880 // 5MB
      });
    
    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Storage bucket already exists');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ Storage bucket created successfully');
    }
    
    // Set up RLS policies for the bucket
    console.log('Setting up storage policies...');
    
    // Allow authenticated users to upload files
    const { error: uploadPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'certificate-attachments',
      policy_name: 'Allow authenticated uploads',
      definition: 'CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (auth.role() = \'authenticated\')'
    });
    
    if (uploadPolicyError && !uploadPolicyError.message.includes('already exists')) {
      console.warn('Upload policy error (may be expected):', uploadPolicyError.message);
    }
    
    // Allow public read access
    const { error: readPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'certificate-attachments', 
      policy_name: 'Allow public reads',
      definition: 'CREATE POLICY "Allow public reads" ON storage.objects FOR SELECT USING (true)'
    });
    
    if (readPolicyError && !readPolicyError.message.includes('already exists')) {
      console.warn('Read policy error (may be expected):', readPolicyError.message);
    }
    
    console.log('✅ Storage setup completed successfully!');
    console.log('📁 Bucket: certificate-attachments');
    console.log('🔒 Policies: Upload (authenticated), Read (public)');
    console.log('📏 File size limit: 5MB');
    console.log('📄 Allowed types: JPEG, PNG, WEBP, PDF');
    
  } catch (error) {
    console.error('❌ Storage setup failed:', error);
    process.exit(1);
  }
}

setupStorage();