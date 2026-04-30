-- ============================================================================
-- CERTRACK DATABASE SCHEMA FOR SUPABASE
-- ============================================================================
-- This SQL script creates all required tables for the CerTrack certification
-- tracking system. Run this in your Supabase SQL editor.
-- 
-- IMPORTANT: 
-- 1. No users will be created initially - only passkeys will be set up
-- 2. All tables use UUID for primary keys
-- 3. Timestamps are automatically managed
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: ADMIN_SETTINGS
-- System-wide configuration (single row table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  project_name VARCHAR(255) DEFAULT 'CerTrack Africa',
  admin_code VARCHAR(50) DEFAULT 'ADMIN2026',
  intern_code VARCHAR(50) DEFAULT 'INTERNS2026',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- Insert default configuration
INSERT INTO admin_settings (id, project_name, admin_code, intern_code)
VALUES (1, 'CerTrack Africa', 'ADMIN2026', 'INTERNS2026')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TABLE 2: INTERNS
-- Core intern profile data
-- ============================================================================
CREATE TABLE IF NOT EXISTS interns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_interns_email ON interns(email);
CREATE INDEX IF NOT EXISTS idx_interns_created_at ON interns(created_at DESC);

-- ============================================================================
-- TABLE 3: CERTIFICATIONS
-- Tracks all certifications earned by interns
-- ============================================================================
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  category VARCHAR(10) NOT NULL CHECK (category IN ('AI', 'FE', 'BE', 'API', 'CYBER', 'CLOUD', 'SOFT')),
  hours INTEGER NOT NULL CHECK (hours > 0),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_certifications_intern_id ON certifications(intern_id);
CREATE INDEX IF NOT EXISTS idx_certifications_category ON certifications(category);
CREATE INDEX IF NOT EXISTS idx_certifications_date ON certifications(date DESC);

-- ============================================================================
-- TABLE 4: USERS (Authentication & Profiles)
-- Stores user authentication and profile information
-- NO USERS WILL BE CREATED INITIALLY - ONLY PASSKEYS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'intern' CHECK (role IN ('admin', 'intern')),
  intern_id UUID REFERENCES interns(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_intern_id ON users(intern_id);

-- ============================================================================
-- TABLE 5: PASSKEYS
-- Stores WebAuthn passkey credentials for passwordless authentication
-- THIS TABLE WILL HAVE DATA INITIALLY (NO USERS REQUIRED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS passkeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id BYTEA UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  sign_count INTEGER DEFAULT 0,
  transports VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR[],
  backup_eligible BOOLEAN DEFAULT FALSE,
  backup_state BOOLEAN DEFAULT FALSE,
  attestation_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for passkey lookups
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys(credential_id);

-- ============================================================================
-- TABLE 6: PASSKEY_REGISTRATIONS (Temporary registration data)
-- Stores temporary data during passkey registration process
-- ============================================================================
CREATE TABLE IF NOT EXISTS passkey_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'intern')),
  challenge BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '15 minutes'
);

-- Create index for cleanup of expired registrations
CREATE INDEX IF NOT EXISTS idx_passkey_registrations_expires_at ON passkey_registrations(expires_at);

-- ============================================================================
-- TABLE 7: AUDIT_LOG (Optional but recommended)
-- Tracks all admin actions for security and compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Intern profiles with certification counts
CREATE OR REPLACE VIEW intern_stats AS
SELECT 
  i.id,
  i.first_name,
  i.last_name,
  i.email,
  i.start_date,
  COUNT(c.id) as total_certifications,
  COALESCE(SUM(c.hours), 0) as total_hours,
  MAX(c.date) as last_certification_date
FROM interns i
LEFT JOIN certifications c ON i.id = c.intern_id
GROUP BY i.id, i.first_name, i.last_name, i.email, i.start_date;

-- View: Certifications by category
CREATE OR REPLACE VIEW certifications_by_category AS
SELECT 
  category,
  COUNT(*) as count,
  COALESCE(SUM(hours), 0) as total_hours,
  COUNT(DISTINCT intern_id) as interns_count
FROM certifications
GROUP BY category;

-- ============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update interns.updated_at
CREATE TRIGGER update_interns_updated_at
BEFORE UPDATE ON interns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update certifications.updated_at
CREATE TRIGGER update_certifications_updated_at
BEFORE UPDATE ON certifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update users.updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update passkeys.updated_at
CREATE TRIGGER update_passkeys_updated_at
BEFORE UPDATE ON passkeys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE PASSKEY DATA (NO USERS CREATED)
-- This demonstrates the passkey structure without creating user accounts
-- ============================================================================

-- NOTE: In production, passkeys should be created through the registration flow
-- The following is a reference structure showing how passkeys are stored:
--
-- INSERT INTO passkeys (
--   user_id,
--   credential_id,
--   public_key,
--   sign_count,
--   transports,
--   backup_eligible,
--   backup_state,
--   attestation_type
-- ) VALUES (
--   NULL,  -- Will be linked to user_id after user creation
--   decode('...', 'hex'),  -- Base64 encoded credential ID
--   decode('...', 'hex'),  -- Base64 encoded public key
--   0,
--   ARRAY['internal', 'platform'],
--   true,
--   false,
--   'none'
-- );

-- ============================================================================
-- SECURITY: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interns ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Policy: Admins can see all users
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Interns can see all interns (for directory)
CREATE POLICY "Interns can view all interns"
ON interns FOR SELECT
USING (true);

-- Policy: Interns can only see their own certifications
CREATE POLICY "Interns can view own certifications"
ON certifications FOR SELECT
USING (
  intern_id IN (
    SELECT intern_id FROM users WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Admins can see all certifications
CREATE POLICY "Admins can view all certifications"
ON certifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Users can only see their own passkeys
CREATE POLICY "Users can view own passkeys"
ON passkeys FOR SELECT
USING (auth.uid() = user_id);

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Verify all tables were created
SELECT 
  tablename,
  'Table created successfully' as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('admin_settings', 'interns', 'certifications', 'users', 'passkeys', 'passkey_registrations', 'audit_log')
ORDER BY tablename;

-- ============================================================================
-- END OF SCHEMA CREATION
-- ============================================================================
