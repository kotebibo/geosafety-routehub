-- ==========================================
-- AUTHENTICATION SYSTEM SETUP
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'dispatcher', 'inspector')),
  inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One role per user
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_inspector ON user_roles(inspector_id);

-- 2. Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = uid LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- 3. Enable Row Level Security on key tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own role
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can manage all roles
CREATE POLICY "Admins can manage roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 4. Link inspectors table to auth users
ALTER TABLE inspectors 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inspectors_user ON inspectors(user_id);

-- ==========================================
-- READY! Next step: Create first admin user
-- ==========================================

-- After running this, you need to:
-- 1. Create a user in Supabase Dashboard (Authentication > Users > Add User)
-- 2. Get their user_id
-- 3. Run: INSERT INTO user_roles (user_id, role) VALUES ('USER_ID_HERE', 'admin');
