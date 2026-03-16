-- Change boards.workspace_id FK from ON DELETE SET NULL to ON DELETE CASCADE
-- so boards are permanently deleted when their workspace is deleted
ALTER TABLE public.boards
  DROP CONSTRAINT IF EXISTS boards_workspace_id_fkey,
  ADD CONSTRAINT boards_workspace_id_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id)
    ON DELETE CASCADE;

-- Fix workspace RLS helper functions
-- After migration 046, owner_id and workspace_members.user_id reference auth.users.id,
-- not inspectors.id. These functions were never updated, causing silent RLS failures
-- (workspace delete, update, and member operations all silently fail).

CREATE OR REPLACE FUNCTION public.is_workspace_owner(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = workspace_uuid
        AND w.owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;   

CREATE OR REPLACE FUNCTION public.is_workspace_admin(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = workspace_uuid
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = workspace_uuid
        AND wm.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Allow app admins (not just workspace owners) to delete non-default workspaces
DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;
CREATE POLICY "workspaces_delete_policy" ON public.workspaces
    FOR DELETE TO authenticated
    USING (
        (public.is_workspace_owner(id) OR public.is_admin_user())
        AND is_default = false
    );
