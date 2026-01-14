-- ================================================
-- Fix Workspace Trigger Security
-- Migration 042: Make workspace owner trigger SECURITY DEFINER
-- and fix INSERT policy
-- ================================================

-- The problem has TWO parts:
-- 1. The workspaces INSERT policy uses get_my_inspector_id() which
--    looks up the inspector by email from auth.users. This can fail.
-- 2. The add_workspace_owner_as_member() trigger runs with caller
--    permissions and tries to INSERT into workspace_members.
--
-- Solution:
-- 1. Change workspaces INSERT policy to validate owner_id exists
--    in inspectors table with matching email (direct check)
-- 2. Make the trigger function SECURITY DEFINER

-- ================================================
-- STEP 1: Fix the INSERT policy on workspaces
-- ================================================

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;

-- Create a simpler INSERT policy that:
-- 1. Verifies the owner_id is a valid inspector
-- 2. Verifies that inspector's email matches the authenticated user's email
CREATE POLICY "workspaces_insert"
    ON public.workspaces FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inspectors i
            WHERE i.id = owner_id
            AND i.email = (
                SELECT email FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- ================================================
-- STEP 2: Fix the trigger functions with SECURITY DEFINER
-- ================================================

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION add_workspace_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the default workspace creation function for new users
CREATE OR REPLACE FUNCTION create_default_workspace_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create default workspace if user doesn't have one
    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE owner_id = NEW.id AND is_default = true
    ) THEN
        INSERT INTO public.workspaces (
            name,
            name_ka,
            description,
            owner_id,
            is_default,
            icon,
            color
        ) VALUES (
            'My Workspace',
            'ჩემი სამუშაო სივრცე',
            'Default workspace for your boards',
            NEW.id,
            true,
            'home',
            'blue'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 3: Also update get_my_inspector_id to be more robust
-- ================================================

CREATE OR REPLACE FUNCTION get_my_inspector_id()
RETURNS UUID AS $$
DECLARE
    inspector_id UUID;
BEGIN
    SELECT i.id INTO inspector_id
    FROM public.inspectors i
    WHERE i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    LIMIT 1;

    RETURN inspector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
