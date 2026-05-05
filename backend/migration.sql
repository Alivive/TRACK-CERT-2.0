-- Add certificate_file_url column to certifications table
-- Run this in your Supabase SQL editor

ALTER TABLE certifications 
ADD COLUMN IF NOT EXISTS certificate_file_url TEXT;

-- Add certificate_url column if it doesn't exist
ALTER TABLE certifications 
ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN certifications.certificate_file_url 
IS 'URL to uploaded certificate file (PDF/image) stored in Supabase Storage';

COMMENT ON COLUMN certifications.certificate_url 
IS 'Direct URL to online certificate (e.g., Coursera, LinkedIn Learning)';