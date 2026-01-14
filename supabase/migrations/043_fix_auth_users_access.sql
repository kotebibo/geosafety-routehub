-- ================================================
-- Fix Auth Users Access for RLS Policies
-- Migration 043: Grant SELECT on auth.users or use SECURITY DEFINER
-- ================================================

-- The problem: RLS policies reference auth.users table to get email,
-- but the authenticated role doesn't have SELECT permission on auth.users.
-- Error: "permission denied for table users"
--
-- Solution: Create a SECURITY DEFINER function to get the current user's email
-- and update all policies to use this function instead of direct access.

-- ================================================
-- STEP 1: Create helper function to get current user's email
-- ================================================

CREATE OR REPLACE FUNCTION get_my_email()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_my_email() TO authenticated;

-- ================================================
-- STEP 2: Update get_my_inspector_id to use the new function
-- ================================================

CREATE OR REPLACE FUNCTION get_my_inspector_id()
RETURNS UUID AS $$
DECLARE
    inspector_id UUID;
BEGIN
    SELECT i.id INTO inspector_id
    FROM public.inspectors i
    WHERE i.email = get_my_email()
    LIMIT 1;

    RETURN inspector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ================================================
-- STEP 3: Update workspaces INSERT policy
-- ================================================

DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;

CREATE POLICY "workspaces_insert"
    ON public.workspaces FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inspectors i
            WHERE i.id = owner_id
            AND i.email = get_my_email()
        )
    );

-- ================================================
-- STEP 4: Ensure trigger functions are SECURITY DEFINER
-- ================================================

CREATE OR REPLACE FUNCTION add_workspace_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_default_workspace_for_user()
RETURNS TRIGGER AS $$
BEGIN
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
-- MIGRATION COMPLETE
-- ================================================
