-- CerTrack Security Policies (RLS)
-- Use these to secure your data in Supabase

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interns ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES
CREATE POLICY "Profiles viewable by all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. INTERNS
CREATE POLICY "Interns viewable by auth" ON interns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users insert own intern record" ON interns FOR INSERT WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "Admins manage interns" ON interns ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. CERTIFICATIONS
CREATE POLICY "Certs viewable by auth" ON certifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users insert certs" ON certifications FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    intern_id IN (SELECT id FROM interns WHERE auth_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
);
CREATE POLICY "Users/Admins delete certs" ON certifications FOR DELETE USING (
  intern_id IN (SELECT id FROM interns WHERE auth_id = auth.uid()) OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. ADMIN SETTINGS
CREATE POLICY "Settings viewable by all" ON admin_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated manage settings" ON admin_settings FOR ALL USING (auth.role() = 'authenticated');
