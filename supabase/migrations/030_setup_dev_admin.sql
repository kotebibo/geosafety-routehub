-- ================================================
-- SETUP DEV ADMIN USER
-- Migration 030: Creates a development admin that can actually log in
-- ================================================

-- NOTE: This migration sets up the necessary records AFTER you create
-- a user in Supabase Auth. Follow these steps:
--
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" → "Create new user"
-- 3. Enter: email: admin@geosafety.ge, password: your-secure-password
-- 4. Then run this migration OR run the SQL below manually

-- ================================================
-- OPTION A: If you already know the user's UUID from auth.users
-- Replace 'YOUR-AUTH-USER-UUID' with the actual UUID
-- ================================================

-- First, let's create a function that can be called to set up a user as admin
CREATE OR REPLACE FUNCTION setup_admin_user(user_email TEXT)
RETURNS void AS $$
DECLARE
  auth_user_id UUID;
  inspector_id UUID;
BEGIN
  -- Get the auth user ID
  SELECT id INTO auth_user_id FROM auth.users WHERE email = user_email;

  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users. Create the user first via Supabase Dashboard.', user_email;
  END IF;

  -- Create or get inspector record
  INSERT INTO inspectors (email, full_name, role, status, zone)
  VALUES (user_email, 'Admin User', 'admin', 'active', 'Tbilisi')
  ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'active'
  RETURNING id INTO inspector_id;

  -- Create user_roles entry
  INSERT INTO user_roles (user_id, role, inspector_id)
  VALUES (auth_user_id, 'admin', inspector_id)
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin', inspector_id = EXCLUDED.inspector_id;

  -- Create users profile entry
  INSERT INTO users (id, email, full_name, is_active)
  VALUES (auth_user_id, user_email, 'Admin User', true)
  ON CONFLICT (id) DO UPDATE SET is_active = true;

  RAISE NOTICE 'Admin user % setup complete!', user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- OPTION B: Quick setup if you want to use a specific email
-- Uncomment and modify the email below after creating the user in Supabase Auth
-- ================================================

-- SELECT setup_admin_user('admin@geosafety.ge');

-- ================================================
-- HELPER: View all auth users and their roles
-- ================================================
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created,
  ur.role,
  ur.inspector_id,
  i.full_name as inspector_name,
  u.is_active
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN inspectors i ON i.id = ur.inspector_id
LEFT JOIN users u ON u.id = au.id
ORDER BY au.created_at DESC;

-- ================================================
-- GRANT permissions
-- ================================================
GRANT EXECUTE ON FUNCTION setup_admin_user(TEXT) TO authenticated;
GRANT SELECT ON admin_user_overview TO authenticated;

-- ================================================
-- INSTRUCTIONS:
-- ================================================
-- After running this migration:
--
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" → Create user with email/password
-- 3. Run in SQL Editor: SELECT setup_admin_user('your-email@example.com');
-- 4. Now you can log in at /auth/login
-- ================================================
