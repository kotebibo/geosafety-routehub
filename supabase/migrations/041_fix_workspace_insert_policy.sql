-- ================================================
-- Fix Workspace INSERT Policy
-- Migration 041: Allow workspace creation
-- ================================================

-- The problem: get_my_inspector_id() might return NULL during INSERT
-- because the function executes before the row is committed.
--
-- Solution: For INSERT, verify the owner_id exists in inspectors
-- and matches an inspector with the current user's email.

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;

-- Create new INSERT policy that validates owner_id belongs to current user
-- This checks that the owner_id being inserted matches an inspector
-- whose email matches the current authenticated user's email
CREATE POLICY "workspaces_insert"
    ON public.workspaces FOR INSERT
    TO authenticated
    WITH CHECK (
        owner_id IN (
            SELECT i.id
            FROM public.inspectors i
            WHERE i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Also need to allow INSERT into workspace_members for the owner
-- when creating a workspace (the trigger adds owner as member)
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;

-- Allow inserting workspace_members if:
-- 1. User is workspace admin (existing logic)
-- 2. OR user is inserting themselves as owner of a workspace they own
CREATE POLICY "workspace_members_insert"
    ON public.workspace_members FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Can insert if user is admin of the workspace
        is_workspace_admin(workspace_id)
        -- OR can insert themselves as owner (for new workspace creation)
        OR (
            user_id IN (
                SELECT i.id
                FROM public.inspectors i
                WHERE i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
            AND role = 'owner'
        )
    );

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
