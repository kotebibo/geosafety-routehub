-- Add 'editor' role to workspace_members
-- Editor can create and archive boards but cannot manage members or settings

-- Update the CHECK constraint to include 'editor'
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'member', 'guest'));

-- Update the is_workspace_admin function to remain admin/owner only (no change needed)
-- Editors should NOT have admin-level access to member management or settings

-- Update board-related RLS policies to allow editors to archive boards
-- The existing RLS uses is_workspace_admin() for archive/delete operations
-- We need editors included in board management but NOT member management

-- Add a helper function for "can manage boards" (owner, admin, editor)
CREATE OR REPLACE FUNCTION public.is_workspace_board_manager(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = workspace_uuid
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'editor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;
