-- Add categories table for dynamic category management
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT '◎',
  fill_class VARCHAR(20) DEFAULT '',
  badge_class VARCHAR(30) DEFAULT 'badge-gray',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (id, name, icon, fill_class, badge_class, display_order) VALUES
  ('AI', 'Artificial Intelligence', '◈', '', 'badge-red', 1),
  ('FE', 'Front End Web Dev', '⧈', 'teal', 'badge-teal', 2),
  ('BE', 'Back End Web Dev', '⊞', 'blue', 'badge-blue', 3),
  ('API', 'API Functionalities', '⇌', 'amber', 'badge-amber', 4),
  ('CYBER', 'Cybersecurity', '⊘', 'purple', 'badge-purple', 5),
  ('CLOUD', 'Cloud Computing', '◯', 'green', 'badge-green', 6),
  ('SOFT', 'Soft Skills', '◎', 'orange', 'badge-orange', 7)
ON CONFLICT (id) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active categories
CREATE POLICY "Anyone can view active categories"
ON categories FOR SELECT
USING (is_active = true);

-- Policy: Only admins can manage categories
CREATE POLICY "Admins can manage categories"
ON categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);
