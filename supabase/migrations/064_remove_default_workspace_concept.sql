-- Remove the "default workspace" concept entirely.
-- Users no longer get an auto-created workspace on registration,
-- and all existing workspaces become deletable.

-- 1. Drop trigger that auto-creates default workspace on user registration
DROP TRIGGER IF EXISTS create_default_workspace ON public.users;
DROP FUNCTION IF EXISTS create_default_workspace_for_auth_user();

-- Also drop old versions (from migration 035, may still linger)
DROP TRIGGER IF EXISTS create_default_workspace ON public.inspectors;
DROP FUNCTION IF EXISTS create_default_workspace_for_user();

-- 2. Make all existing default workspaces deletable
UPDATE public.workspaces SET is_default = false WHERE is_default = true;

-- 3. Update delete policy: remove is_default guard, allow owners + admins
DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;
CREATE POLICY "workspaces_delete_policy" ON public.workspaces
    FOR DELETE TO authenticated
    USING (
        public.is_workspace_owner(id) OR public.is_admin_user()
    );
