-- ================================================
-- Proper Workspace RLS Policies
-- Migration 039: Fix RLS using auth.uid() pattern
-- Uses SECURITY DEFINER functions to avoid circular dependencies
-- ================================================

-- ================================================
-- STEP 1: Create helper functions (SECURITY DEFINER)
-- These bypass RLS to avoid circular dependency issues
-- ================================================

-- Get current user's inspector ID using auth.uid() (reliable pattern)
CREATE OR REPLACE FUNCTION get_my_inspector_id()
RETURNS UUID AS $$
    SELECT i.id
    FROM public.inspectors i
    WHERE i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user owns a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_owner(ws_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = ws_id
        AND w.owner_id = get_my_inspector_id()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is a member of a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ws_id
        AND wm.user_id = get_my_inspector_id()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin/owner of a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = ws_id
        AND wm.user_id = get_my_inspector_id()
        AND wm.role IN ('owner', 'admin')
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get all workspace IDs user has access to (bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_workspace_ids()
RETURNS SETOF UUID AS $$
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = get_my_inspector_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================
-- STEP 2: Drop ALL existing workspace policies
-- ================================================

-- Disable RLS temporarily for cleanup
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on workspaces (from all migrations)
DROP POLICY IF EXISTS "Users can view accessible workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners and admins can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_select_owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_select_member" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_insert" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_update_owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_update_admin" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_delete" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;

-- Drop ALL policies on workspace_members (from all migrations)
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON public.workspace_members;

-- ================================================
-- STEP 3: Create new WORKSPACES policies
-- Using helper functions to avoid circular dependencies
-- ================================================

-- Re-enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- SELECT: View workspaces user owns OR is a member of
CREATE POLICY "workspaces_select"
    ON public.workspaces FOR SELECT
    TO authenticated
    USING (
        owner_id = get_my_inspector_id()
        OR id IN (SELECT get_my_workspace_ids())
    );

-- INSERT: Create workspace (user becomes owner)
CREATE POLICY "workspaces_insert"
    ON public.workspaces FOR INSERT
    TO authenticated
    WITH CHECK (
        owner_id = get_my_inspector_id()
    );

-- UPDATE: Owner or admin can update
CREATE POLICY "workspaces_update"
    ON public.workspaces FOR UPDATE
    TO authenticated
    USING (
        owner_id = get_my_inspector_id()
        OR is_workspace_admin(id)
    );

-- DELETE: Only owner can delete, and not default workspace
CREATE POLICY "workspaces_delete"
    ON public.workspaces FOR DELETE
    TO authenticated
    USING (
        owner_id = get_my_inspector_id()
        AND is_default = false
    );

-- ================================================
-- STEP 4: Create new WORKSPACE_MEMBERS policies
-- Using helper functions to avoid circular dependencies
-- ================================================

-- SELECT: Can view members of workspaces you belong to
CREATE POLICY "workspace_members_select"
    ON public.workspace_members FOR SELECT
    TO authenticated
    USING (
        is_workspace_owner(workspace_id)
        OR is_workspace_member(workspace_id)
    );

-- INSERT: Owner or admin can add members
CREATE POLICY "workspace_members_insert"
    ON public.workspace_members FOR INSERT
    TO authenticated
    WITH CHECK (
        is_workspace_admin(workspace_id)
    );

-- UPDATE: Owner or admin can update member roles
CREATE POLICY "workspace_members_update"
    ON public.workspace_members FOR UPDATE
    TO authenticated
    USING (
        is_workspace_admin(workspace_id)
    );

-- DELETE: Owner or admin can remove members (but not owner role)
CREATE POLICY "workspace_members_delete"
    ON public.workspace_members FOR DELETE
    TO authenticated
    USING (
        role != 'owner'
        AND is_workspace_admin(workspace_id)
    );

-- ================================================
-- STEP 5: Fix BOARDS policy for workspace access
-- ================================================

DROP POLICY IF EXISTS "Users can view accessible boards" ON public.boards;
CREATE POLICY "Users can view accessible boards"
    ON public.boards FOR SELECT
    TO authenticated
    USING (
        -- Owner can view
        owner_id = get_my_inspector_id()
        -- Public boards
        OR is_public = true
        -- Direct board membership
        OR id IN (
            SELECT board_id FROM public.board_members
            WHERE user_id = get_my_inspector_id()
        )
        -- Workspace membership grants access
        OR (
            workspace_id IS NOT NULL
            AND workspace_id IN (SELECT get_my_workspace_ids())
        )
    );

-- ================================================
-- STEP 6: Grant access to service_role
-- Service role bypasses RLS entirely
-- ================================================
GRANT ALL ON public.workspaces TO service_role;
GRANT ALL ON public.workspace_members TO service_role;
GRANT EXECUTE ON FUNCTION get_my_inspector_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_workspace_ids() TO authenticated;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
