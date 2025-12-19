-- ==========================================
-- CUSTOM ROLES & PERMISSIONS SYSTEM
-- Allows admins to create custom roles with granular permissions
-- ==========================================

-- 1. Create custom_roles table
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1', -- For UI display
  is_system BOOLEAN DEFAULT false, -- Built-in roles can't be deleted
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create permissions table (defines all available permissions)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'users:create', 'routes:delete'
  resource TEXT NOT NULL, -- e.g., 'users', 'routes', 'companies'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  description TEXT,
  category TEXT, -- For grouping in UI
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL, -- References custom_roles.name or built-in roles
  permission TEXT NOT NULL, -- References permissions.name
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_name, permission)
);

-- 4. Update user_roles to allow custom roles
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
-- Role can be 'admin', 'dispatcher', 'inspector', or any custom role name

-- 5. Create users table to store additional user info
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON custom_roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- 7. Insert built-in roles
INSERT INTO custom_roles (name, display_name, description, is_system, color) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', true, '#ef4444'),
  ('dispatcher', 'Dispatcher', 'Operations management - routes, assignments, companies', true, '#3b82f6'),
  ('inspector', 'Inspector', 'Field worker with limited access', true, '#22c55e')
ON CONFLICT (name) DO NOTHING;

-- 8. Insert available permissions
INSERT INTO permissions (name, resource, action, description, category) VALUES
  -- User Management
  ('users:read', 'users', 'read', 'View users list and details', 'User Management'),
  ('users:create', 'users', 'create', 'Create new users', 'User Management'),
  ('users:update', 'users', 'update', 'Update user information', 'User Management'),
  ('users:delete', 'users', 'delete', 'Delete users', 'User Management'),
  ('users:manage_roles', 'users', 'manage_roles', 'Assign and change user roles', 'User Management'),

  -- Role Management
  ('roles:read', 'roles', 'read', 'View roles and permissions', 'Role Management'),
  ('roles:create', 'roles', 'create', 'Create custom roles', 'Role Management'),
  ('roles:update', 'roles', 'update', 'Update role permissions', 'Role Management'),
  ('roles:delete', 'roles', 'delete', 'Delete custom roles', 'Role Management'),

  -- Routes
  ('routes:read', 'routes', 'read', 'View routes', 'Routes'),
  ('routes:create', 'routes', 'create', 'Create new routes', 'Routes'),
  ('routes:update', 'routes', 'update', 'Update route information', 'Routes'),
  ('routes:delete', 'routes', 'delete', 'Delete routes', 'Routes'),
  ('routes:assign', 'routes', 'assign', 'Assign routes to inspectors', 'Routes'),

  -- Companies
  ('companies:read', 'companies', 'read', 'View companies', 'Companies'),
  ('companies:create', 'companies', 'create', 'Create new companies', 'Companies'),
  ('companies:update', 'companies', 'update', 'Update company information', 'Companies'),
  ('companies:delete', 'companies', 'delete', 'Delete companies', 'Companies'),

  -- Inspectors
  ('inspectors:read', 'inspectors', 'read', 'View inspectors', 'Inspectors'),
  ('inspectors:create', 'inspectors', 'create', 'Create new inspectors', 'Inspectors'),
  ('inspectors:update', 'inspectors', 'update', 'Update inspector information', 'Inspectors'),
  ('inspectors:delete', 'inspectors', 'delete', 'Delete inspectors', 'Inspectors'),

  -- Inspections
  ('inspections:read', 'inspections', 'read', 'View inspections', 'Inspections'),
  ('inspections:create', 'inspections', 'create', 'Create inspections', 'Inspections'),
  ('inspections:update', 'inspections', 'update', 'Update inspections', 'Inspections'),
  ('inspections:delete', 'inspections', 'delete', 'Delete inspections', 'Inspections'),

  -- Boards
  ('boards:read', 'boards', 'read', 'View boards', 'Boards'),
  ('boards:create', 'boards', 'create', 'Create new boards', 'Boards'),
  ('boards:update', 'boards', 'update', 'Update boards', 'Boards'),
  ('boards:delete', 'boards', 'delete', 'Delete boards', 'Boards'),

  -- Admin
  ('admin:access', 'admin', 'access', 'Access admin panel', 'Admin'),
  ('admin:settings', 'admin', 'settings', 'Manage system settings', 'Admin'),
  ('admin:audit_logs', 'admin', 'audit_logs', 'View audit logs', 'Admin')
ON CONFLICT (name) DO NOTHING;

-- 9. Assign permissions to built-in roles
-- Admin gets all permissions (handled in code with '*')

-- Dispatcher permissions
INSERT INTO role_permissions (role_name, permission) VALUES
  ('dispatcher', 'users:read'),
  ('dispatcher', 'routes:read'),
  ('dispatcher', 'routes:create'),
  ('dispatcher', 'routes:update'),
  ('dispatcher', 'routes:assign'),
  ('dispatcher', 'companies:read'),
  ('dispatcher', 'companies:create'),
  ('dispatcher', 'companies:update'),
  ('dispatcher', 'inspectors:read'),
  ('dispatcher', 'inspections:read'),
  ('dispatcher', 'inspections:create'),
  ('dispatcher', 'inspections:update'),
  ('dispatcher', 'boards:read'),
  ('dispatcher', 'boards:create'),
  ('dispatcher', 'boards:update')
ON CONFLICT (role_name, permission) DO NOTHING;

-- Inspector permissions
INSERT INTO role_permissions (role_name, permission) VALUES
  ('inspector', 'routes:read'),
  ('inspector', 'companies:read'),
  ('inspector', 'inspectors:read'),
  ('inspector', 'inspections:read'),
  ('inspector', 'inspections:create'),
  ('inspector', 'inspections:update'),
  ('inspector', 'boards:read')
ON CONFLICT (role_name, permission) DO NOTHING;

-- 10. Enable RLS
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies for custom_roles
CREATE POLICY "Anyone can read roles"
  ON custom_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage custom roles"
  ON custom_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 12. RLS Policies for permissions
CREATE POLICY "Anyone can read permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 13. RLS Policies for role_permissions
CREATE POLICY "Anyone can read role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 14. RLS Policies for users
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 15. Function to sync/upsert user profile (called from application code)
-- This replaces the auth.users trigger since we can't create triggers on auth schema
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT DEFAULT NULL,
  user_avatar_url TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_full_name, user_email),
    user_avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Function to check user permission (in public schema, not auth)
CREATE OR REPLACE FUNCTION public.has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_name TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO user_role_name
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Admin has all permissions
  IF user_role_name = 'admin' THEN
    RETURN true;
  END IF;

  -- Check if role has the specific permission
  RETURN EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_name = user_role_name
    AND permission = permission_name
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 17. Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- DONE! Custom roles and permissions system is ready
-- ==========================================
