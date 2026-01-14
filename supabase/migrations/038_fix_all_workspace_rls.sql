-- ================================================
-- Fix ALL Workspace RLS Policies
-- Migration 038: Complete RLS fix for workspaces
-- ================================================

-- Temporarily disable RLS to fix the policies
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on workspaces
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

-- Drop ALL existing policies on workspace_members
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;

-- Restore original boards policy (remove workspace check for now)
DROP POLICY IF EXISTS "Users can view accessible boards" ON public.boards;
CREATE POLICY "Users can view accessible boards"
    ON public.boards FOR SELECT
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        OR is_public = true
        OR id IN (
            SELECT board_id FROM public.board_members
            WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

-- ================================================
-- SIMPLE WORKSPACES POLICIES (Development-friendly)
-- ================================================

-- Re-enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can view all their workspaces
CREATE POLICY "workspaces_select_policy"
    ON public.workspaces FOR SELECT
    TO authenticated
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
    );

-- Authenticated users can insert workspaces they own
CREATE POLICY "workspaces_insert_policy"
    ON public.workspaces FOR INSERT
    TO authenticated
    WITH CHECK (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
    );

-- Owners can update their workspaces
CREATE POLICY "workspaces_update_policy"
    ON public.workspaces FOR UPDATE
    TO authenticated
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
    );

-- Owners can delete non-default workspaces
CREATE POLICY "workspaces_delete_policy"
    ON public.workspaces FOR DELETE
    TO authenticated
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        AND is_default = false
    );

-- ================================================
-- SIMPLE WORKSPACE_MEMBERS POLICIES
-- ================================================

-- Members can view members in workspaces they own
CREATE POLICY "workspace_members_select_policy"
    ON public.workspace_members FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

-- Owners can add members
CREATE POLICY "workspace_members_insert_policy"
    ON public.workspace_members FOR INSERT
    TO authenticated
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

-- Owners can update members
CREATE POLICY "workspace_members_update_policy"
    ON public.workspace_members FOR UPDATE
    TO authenticated
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

-- Owners can delete non-owner members
CREATE POLICY "workspace_members_delete_policy"
    ON public.workspace_members FOR DELETE
    TO authenticated
    USING (
        role != 'owner'
        AND workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

-- ================================================
-- GRANT ACCESS TO SERVICE ROLE
-- ================================================
GRANT ALL ON public.workspaces TO service_role;
GRANT ALL ON public.workspace_members TO service_role;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
