-- CerTrack Database Schema
-- Last Updated: 2026-04-24

-- 1. Create Interns Table
CREATE TABLE IF NOT EXISTS interns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Certifications Table
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID REFERENCES interns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL, 
  hours INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Profiles Table (Syncs with Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'intern',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  project_name TEXT DEFAULT 'CerTrack',
  admin_code TEXT DEFAULT 'ADMIN2026',
  intern_code TEXT DEFAULT 'INTERNS2026',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
