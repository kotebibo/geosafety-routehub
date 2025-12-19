-- ================================================
-- FIX USER_ROLES RLS INFINITE RECURSION
-- Migration 031: Fix the circular reference in user_roles RLS
-- ================================================

-- The problem: user_roles SELECT policy checks user_roles to see if user is admin
-- This causes infinite recursion when trying to read user_roles

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can read roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Create fixed policies that don't cause recursion

-- Policy 1: Users can ALWAYS read their own role (no recursion)
CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: For admin operations, we use a SECURITY DEFINER function
-- First, create a function that bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- This query runs with elevated privileges (SECURITY DEFINER)
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = check_user_id
  LIMIT 1;

  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Policy 3: Admins can read ALL roles (using the safe function)
CREATE POLICY "Admins can read all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- Policy 4: Admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

-- Policy 5: Admins can update roles
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- Policy 6: Admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- ================================================
-- ALSO FIX: Allow users to read their own users profile
-- ================================================
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Users can read all users (for user pickers, etc.)
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Admins can do everything with users
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user(auth.uid()) OR id = auth.uid());

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- ================================================
-- Grant execute on the helper function
-- ================================================
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO authenticated;

-- ================================================
-- DONE! user_roles RLS is now fixed
-- ================================================
