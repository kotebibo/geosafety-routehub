-- ================================================
-- SECURE RLS POLICIES WITHOUT RECURSION
-- Migration 033: Proper security policies using SECURITY DEFINER functions
-- ================================================

-- ================================================
-- STEP 1: Create helper functions (SECURITY DEFINER to avoid recursion)
-- ================================================

-- Check if user is admin (already exists, but ensure it's correct)
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = check_user_id LIMIT 1;
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is admin or dispatcher
CREATE OR REPLACE FUNCTION is_admin_or_dispatcher(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = check_user_id LIMIT 1;
  RETURN COALESCE(user_role IN ('admin', 'dispatcher'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's inspector_id from their email
CREATE OR REPLACE FUNCTION get_user_inspector_id(check_user_id UUID)
RETURNS UUID AS $$
DECLARE
  user_email TEXT;
  inspector_uuid UUID;
BEGIN
  -- Get email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = check_user_id;
  IF user_email IS NULL THEN RETURN NULL; END IF;

  -- Get inspector_id from inspectors table
  SELECT id INTO inspector_uuid FROM inspectors WHERE email = user_email LIMIT 1;
  RETURN inspector_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can access a board (owner, member, or admin)
CREATE OR REPLACE FUNCTION can_access_board(check_user_id UUID, check_board_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_inspector_id UUID;
  board_owner_id UUID;
  board_is_public BOOLEAN;
BEGIN
  -- Admins can access all boards
  IF is_admin_user(check_user_id) THEN RETURN true; END IF;

  -- Get user's inspector ID
  user_inspector_id := get_user_inspector_id(check_user_id);
  IF user_inspector_id IS NULL THEN RETURN false; END IF;

  -- Check if board is public or user is owner
  SELECT owner_id, is_public INTO board_owner_id, board_is_public
  FROM boards WHERE id = check_board_id;

  IF board_is_public THEN RETURN true; END IF;
  IF board_owner_id = user_inspector_id THEN RETURN true; END IF;

  -- Check if user is a member
  RETURN EXISTS (
    SELECT 1 FROM board_members
    WHERE board_id = check_board_id AND user_id = user_inspector_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can edit a board (owner, editor member, or admin)
CREATE OR REPLACE FUNCTION can_edit_board(check_user_id UUID, check_board_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_inspector_id UUID;
  board_owner_id UUID;
BEGIN
  -- Admins can edit all boards
  IF is_admin_user(check_user_id) THEN RETURN true; END IF;

  -- Get user's inspector ID
  user_inspector_id := get_user_inspector_id(check_user_id);
  IF user_inspector_id IS NULL THEN RETURN false; END IF;

  -- Check if user is owner
  SELECT owner_id INTO board_owner_id FROM boards WHERE id = check_board_id;
  IF board_owner_id = user_inspector_id THEN RETURN true; END IF;

  -- Check if user is an editor member
  RETURN EXISTS (
    SELECT 1 FROM board_members
    WHERE board_id = check_board_id
    AND user_id = user_inspector_id
    AND role IN ('owner', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_dispatcher(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_inspector_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_board(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_board(UUID, UUID) TO authenticated;

-- ================================================
-- STEP 2: Clean up existing policies
-- ================================================

-- Boards
DROP POLICY IF EXISTS "boards_select" ON boards;
DROP POLICY IF EXISTS "boards_insert" ON boards;
DROP POLICY IF EXISTS "boards_update" ON boards;
DROP POLICY IF EXISTS "boards_delete" ON boards;

-- Board items
DROP POLICY IF EXISTS "items_select" ON board_items;
DROP POLICY IF EXISTS "items_insert" ON board_items;
DROP POLICY IF EXISTS "items_update" ON board_items;
DROP POLICY IF EXISTS "items_delete" ON board_items;

-- Board groups
DROP POLICY IF EXISTS "groups_select" ON board_groups;
DROP POLICY IF EXISTS "groups_insert" ON board_groups;
DROP POLICY IF EXISTS "groups_update" ON board_groups;
DROP POLICY IF EXISTS "groups_delete" ON board_groups;

-- Board columns
DROP POLICY IF EXISTS "columns_select" ON board_columns;
DROP POLICY IF EXISTS "columns_insert" ON board_columns;
DROP POLICY IF EXISTS "columns_update" ON board_columns;
DROP POLICY IF EXISTS "columns_delete" ON board_columns;

-- Board members
DROP POLICY IF EXISTS "members_select" ON board_members;
DROP POLICY IF EXISTS "members_insert" ON board_members;
DROP POLICY IF EXISTS "members_update" ON board_members;
DROP POLICY IF EXISTS "members_delete" ON board_members;

-- ================================================
-- STEP 3: Create secure policies for BOARDS
-- ================================================

-- SELECT: Users can see boards they have access to
CREATE POLICY "boards_select_secure" ON boards FOR SELECT TO authenticated
USING (can_access_board(auth.uid(), id));

-- INSERT: Admins and dispatchers can create boards
CREATE POLICY "boards_insert_secure" ON boards FOR INSERT TO authenticated
WITH CHECK (is_admin_or_dispatcher(auth.uid()));

-- UPDATE: Users can update boards they can edit
CREATE POLICY "boards_update_secure" ON boards FOR UPDATE TO authenticated
USING (can_edit_board(auth.uid(), id));

-- DELETE: Only admins and board owners can delete
CREATE POLICY "boards_delete_secure" ON boards FOR DELETE TO authenticated
USING (
  is_admin_user(auth.uid()) OR
  owner_id = get_user_inspector_id(auth.uid())
);

-- ================================================
-- STEP 4: Create secure policies for BOARD_ITEMS
-- ================================================

-- SELECT: Users can see items in boards they can access
CREATE POLICY "items_select_secure" ON board_items FOR SELECT TO authenticated
USING (can_access_board(auth.uid(), board_id));

-- INSERT: Users can add items to boards they can edit
CREATE POLICY "items_insert_secure" ON board_items FOR INSERT TO authenticated
WITH CHECK (can_edit_board(auth.uid(), board_id));

-- UPDATE: Users can update items in boards they can edit
CREATE POLICY "items_update_secure" ON board_items FOR UPDATE TO authenticated
USING (can_edit_board(auth.uid(), board_id));

-- DELETE: Users can delete items in boards they can edit
CREATE POLICY "items_delete_secure" ON board_items FOR DELETE TO authenticated
USING (can_edit_board(auth.uid(), board_id));

-- ================================================
-- STEP 5: Create secure policies for BOARD_GROUPS
-- ================================================

-- SELECT: Users can see groups in boards they can access
CREATE POLICY "groups_select_secure" ON board_groups FOR SELECT TO authenticated
USING (can_access_board(auth.uid(), board_id));

-- INSERT: Users can add groups to boards they can edit
CREATE POLICY "groups_insert_secure" ON board_groups FOR INSERT TO authenticated
WITH CHECK (can_edit_board(auth.uid(), board_id));

-- UPDATE: Users can update groups in boards they can edit
CREATE POLICY "groups_update_secure" ON board_groups FOR UPDATE TO authenticated
USING (can_edit_board(auth.uid(), board_id));

-- DELETE: Users can delete groups in boards they can edit
CREATE POLICY "groups_delete_secure" ON board_groups FOR DELETE TO authenticated
USING (can_edit_board(auth.uid(), board_id));

-- ================================================
-- STEP 6: Create secure policies for BOARD_COLUMNS
-- ================================================

-- SELECT: All authenticated users can view columns (they're like schema)
CREATE POLICY "columns_select_secure" ON board_columns FOR SELECT TO authenticated
USING (true);

-- INSERT: Users can add columns to boards they can edit
CREATE POLICY "columns_insert_secure" ON board_columns FOR INSERT TO authenticated
WITH CHECK (can_edit_board(auth.uid(), board_id));

-- UPDATE: Users can update columns in boards they can edit
CREATE POLICY "columns_update_secure" ON board_columns FOR UPDATE TO authenticated
USING (can_edit_board(auth.uid(), board_id));

-- DELETE: Users can delete columns in boards they can edit
CREATE POLICY "columns_delete_secure" ON board_columns FOR DELETE TO authenticated
USING (can_edit_board(auth.uid(), board_id));

-- ================================================
-- STEP 7: Create secure policies for BOARD_MEMBERS
-- ================================================

-- SELECT: Users can see members of boards they can access
CREATE POLICY "members_select_secure" ON board_members FOR SELECT TO authenticated
USING (can_access_board(auth.uid(), board_id));

-- INSERT: Only board owners and admins can add members
CREATE POLICY "members_insert_secure" ON board_members FOR INSERT TO authenticated
WITH CHECK (
  is_admin_user(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM boards
    WHERE id = board_id AND owner_id = get_user_inspector_id(auth.uid())
  )
);

-- UPDATE: Only board owners and admins can update member roles
CREATE POLICY "members_update_secure" ON board_members FOR UPDATE TO authenticated
USING (
  is_admin_user(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM boards
    WHERE id = board_id AND owner_id = get_user_inspector_id(auth.uid())
  )
);

-- DELETE: Only board owners and admins can remove members
CREATE POLICY "members_delete_secure" ON board_members FOR DELETE TO authenticated
USING (
  is_admin_user(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM boards
    WHERE id = board_id AND owner_id = get_user_inspector_id(auth.uid())
  )
);

-- ================================================
-- STEP 8: Secure policies for other tables
-- ================================================

-- INSPECTORS: Everyone can read, only admins can modify
DROP POLICY IF EXISTS "inspectors_select" ON inspectors;
DROP POLICY IF EXISTS "inspectors_insert" ON inspectors;
DROP POLICY IF EXISTS "inspectors_update" ON inspectors;
DROP POLICY IF EXISTS "inspectors_delete" ON inspectors;
DROP POLICY IF EXISTS "Everyone can view inspectors" ON inspectors;
DROP POLICY IF EXISTS "Admins can manage inspectors" ON inspectors;

CREATE POLICY "inspectors_select_secure" ON inspectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "inspectors_insert_secure" ON inspectors FOR INSERT TO authenticated WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "inspectors_update_secure" ON inspectors FOR UPDATE TO authenticated USING (is_admin_user(auth.uid()));
CREATE POLICY "inspectors_delete_secure" ON inspectors FOR DELETE TO authenticated USING (is_admin_user(auth.uid()));

-- COMPANIES: Everyone can read, admins and dispatchers can modify
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;
DROP POLICY IF EXISTS "Everyone can view companies" ON companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON companies;

CREATE POLICY "companies_select_secure" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_insert_secure" ON companies FOR INSERT TO authenticated WITH CHECK (is_admin_or_dispatcher(auth.uid()));
CREATE POLICY "companies_update_secure" ON companies FOR UPDATE TO authenticated USING (is_admin_or_dispatcher(auth.uid()));
CREATE POLICY "companies_delete_secure" ON companies FOR DELETE TO authenticated USING (is_admin_user(auth.uid()));

-- ================================================
-- DONE! Secure RLS policies are now in place
-- ================================================
--
-- Security summary:
-- - Boards: Access based on ownership, membership, or admin status
-- - Board items/groups: Edit access based on board permissions
-- - Board columns: Readable by all, editable by board editors
-- - Board members: Only owners and admins can manage
-- - Inspectors: Read-only for non-admins
-- - Companies: Read-only for inspectors, full access for admins/dispatchers
--
-- All policies use SECURITY DEFINER functions to avoid recursion
-- ================================================
