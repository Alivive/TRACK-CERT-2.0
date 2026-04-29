-- ============================================================================
-- CERTRACK DATABASE MASTER SETUP SCRIPT
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO BUILD EVERYTHING FROM SCRATCH
-- ============================================================================

-- 1. DROP EXISTING TABLES AND TRIGGERS (Since we are starting from scratch)
-- This ensures a clean slate.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_system_stats();
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.interns CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.admin_settings CASCADE;

-- ============================================================================
-- 2. CREATE TABLES
-- ============================================================================

-- A. Create Profiles Table (Syncs with Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'intern',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. Create Interns Table (Now properly linked to Auth)
CREATE TABLE public.interns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. Create Certifications Table
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID REFERENCES public.interns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL, 
  hours INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. Create Admin Settings Table
CREATE TABLE public.admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  project_name TEXT DEFAULT 'CerTrack',
  admin_code TEXT DEFAULT 'ADMIN2026',
  intern_code TEXT DEFAULT 'INTERNS2026',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin settings row
INSERT INTO public.admin_settings (id, project_name, admin_code, intern_code) 
VALUES (1, 'CerTrack', 'ADMIN2026', 'INTERNS2026')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- A. PROFILES
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- B. INTERNS
CREATE POLICY "Interns viewable by auth" ON public.interns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users insert own intern record" ON public.interns FOR INSERT WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "Admins manage interns" ON public.interns FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- C. CERTIFICATIONS
CREATE POLICY "Certs viewable by auth" ON public.certifications FOR SELECT USING (auth.role() = 'authenticated');

-- This policy fixes the Foreign Key issue: Interns can insert certs IF they own the intern_id
CREATE POLICY "Auth users insert certs" ON public.certifications FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    intern_id IN (SELECT id FROM public.interns WHERE auth_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Users/Admins delete certs" ON public.certifications FOR DELETE USING (
  intern_id IN (SELECT id FROM public.interns WHERE auth_id = auth.uid()) OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- D. ADMIN SETTINGS
CREATE POLICY "Settings viewable by all" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated manage settings" ON public.admin_settings FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- 5. CREATE DATABASE TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to handle new user signup and properly link intern profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_intern_id UUID;
BEGIN
  -- 1. Insert into profiles
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'intern')
  );

  -- 2. Link or create intern record
  SELECT id INTO existing_intern_id FROM public.interns WHERE email = new.email;
  
  IF existing_intern_id IS NOT NULL THEN
    -- If admin pre-created the intern, link their new Auth ID to it
    UPDATE public.interns SET auth_id = new.id WHERE id = existing_intern_id;
  ELSE
    -- If they signed up themselves, create a brand new intern record for them
    INSERT INTO public.interns (id, auth_id, first_name, last_name, email)
    VALUES (
      uuid_generate_v4(), 
      new.id, 
      SPLIT_PART(new.raw_user_meta_data->>'full_name', ' ', 1),
      SUBSTRING(new.raw_user_meta_data->>'full_name' FROM POSITION(' ' IN new.raw_user_meta_data->>'full_name') + 1),
      new.email
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. SYSTEM STATS RPC FUNCTION (FOR LOGIN SCREEN)
-- ============================================================================

-- Function to get dynamic system stats for the login screen safely
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  intern_count INT;
  cert_count INT;
  track_count INT;
  total_hours INT;
BEGIN
  SELECT COUNT(*) INTO intern_count FROM public.interns;
  SELECT COUNT(*) INTO cert_count FROM public.certifications;
  SELECT COUNT(DISTINCT category) INTO track_count FROM public.certifications;
  SELECT COALESCE(SUM(hours), 0) INTO total_hours FROM public.certifications;
  
  RETURN json_build_object(
    'interns', intern_count,
    'certs', cert_count,
    'tracks', track_count,
    'hours', total_hours
  );
END;
$$;
