-- Fix user_roles Recursive Policy Issue
-- This migration fixes the potential recursive policy problem in user_roles table
-- Created: October 10, 2025

-- ==========================================
-- DROP EXISTING POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- ==========================================
-- CREATE NON-RECURSIVE POLICIES
-- ==========================================

-- Policy: Users can view their own role (simple, non-recursive)
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- ==========================================
-- HELPER FUNCTION FOR ADMIN CHECK
-- ==========================================

-- Create a separate function to check if user is admin
-- This avoids recursive policy issues
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add comment
COMMENT ON FUNCTION public.is_user_admin() IS 
'Check if the current user has admin role. Used by RLS policies.';

-- ==========================================
-- CREATE ADMIN MANAGEMENT POLICY
-- ==========================================

-- Policy: Only admins can insert/update/delete roles
CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  USING (is_user_admin())
  WITH CHECK (is_user_admin());

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Index for faster user_id lookups (improves RLS performance)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON user_roles(user_id);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_roles_role 
  ON user_roles(role);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
  ON user_roles(user_id, role);

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON POLICY "Users can view own role" ON user_roles IS
'Allows users to view their own role. Non-recursive policy.';

COMMENT ON POLICY "Admins can manage all roles" ON user_roles IS
'Allows admins to create, update, and delete any user roles.';
