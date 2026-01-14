-- ================================================
-- Fix Workspace RLS Policies
-- Migration 037: Remove circular dependency in RLS
-- ================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view accessible workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners and admins can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON public.workspaces;

DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can remove members" ON public.workspace_members;

-- ================================================
-- HELPER FUNCTION: Get current user's inspector ID
-- ================================================
CREATE OR REPLACE FUNCTION get_current_inspector_id()
RETURNS UUID AS $$
  SELECT id FROM public.inspectors WHERE email = auth.email() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================
-- WORKSPACES POLICIES (Simplified - no circular refs)
-- ================================================

-- Users can view workspaces they own
CREATE POLICY "workspace_select_owner"
    ON public.workspaces FOR SELECT
    USING (owner_id = get_current_inspector_id());

-- Users can view workspaces they're members of (direct check, no recursion)
CREATE POLICY "workspace_select_member"
    ON public.workspaces FOR SELECT
    USING (
        id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = get_current_inspector_id()
        )
    );

-- Users can create workspaces (they become the owner)
CREATE POLICY "workspace_insert"
    ON public.workspaces FOR INSERT
    WITH CHECK (owner_id = get_current_inspector_id());

-- Owners can update their workspaces
CREATE POLICY "workspace_update_owner"
    ON public.workspaces FOR UPDATE
    USING (owner_id = get_current_inspector_id());

-- Admins can update workspaces
CREATE POLICY "workspace_update_admin"
    ON public.workspaces FOR UPDATE
    USING (
        id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = get_current_inspector_id()
            AND role = 'admin'
        )
    );

-- Only owners can delete non-default workspaces
CREATE POLICY "workspace_delete"
    ON public.workspaces FOR DELETE
    USING (
        owner_id = get_current_inspector_id()
        AND is_default = false
    );

-- ================================================
-- WORKSPACE MEMBERS POLICIES (Simplified)
-- ================================================

-- Members can view other members in workspaces they belong to
CREATE POLICY "workspace_members_select"
    ON public.workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = get_current_inspector_id()
        )
        OR workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = get_current_inspector_id()
        )
    );

-- Owners and admins can add members
CREATE POLICY "workspace_members_insert"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = get_current_inspector_id()
        )
        OR workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = get_current_inspector_id()
            AND role IN ('owner', 'admin')
        )
    );

-- Owners and admins can update member roles
CREATE POLICY "workspace_members_update"
    ON public.workspace_members FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = get_current_inspector_id()
        )
        OR workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = get_current_inspector_id()
            AND role IN ('owner', 'admin')
        )
    );

-- Owners and admins can remove members (but not the owner)
CREATE POLICY "workspace_members_delete"
    ON public.workspace_members FOR DELETE
    USING (
        role != 'owner'  -- Cannot remove workspace owner
        AND (
            workspace_id IN (
                SELECT id FROM public.workspaces
                WHERE owner_id = get_current_inspector_id()
            )
            OR workspace_id IN (
                SELECT workspace_id FROM public.workspace_members
                WHERE user_id = get_current_inspector_id()
                AND role IN ('owner', 'admin')
            )
        )
    );

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
