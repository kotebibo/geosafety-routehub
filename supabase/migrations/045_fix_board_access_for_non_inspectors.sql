-- Migration: Fix board access for users without inspector records
-- The can_access_board function was only checking inspector_id,
-- which broke access for users who aren't in the inspectors table.
-- Now it also checks auth.uid() directly against owner_id.

-- Drop and recreate can_access_board to check both inspector_id AND auth.uid()
CREATE OR REPLACE FUNCTION public.can_access_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    my_inspector_id UUID;
    my_user_id UUID;
BEGIN
    -- Get the current auth user ID
    my_user_id := (SELECT auth.uid());

    -- Get inspector ID if user has an inspector record (may be NULL)
    my_inspector_id := (SELECT public.get_my_inspector_id());

    RETURN EXISTS (
        SELECT 1 FROM public.boards b
        WHERE b.id = board_uuid
        AND (
            -- Check owner_id against both auth.uid() and inspector_id
            b.owner_id = my_user_id
            OR b.owner_id = my_inspector_id
            OR b.is_public = true
            -- Check board members
            OR EXISTS (
                SELECT 1 FROM public.board_members bm
                WHERE bm.board_id = b.id
                AND (bm.user_id = my_user_id OR bm.user_id = my_inspector_id)
            )
            -- Check workspace members
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = b.workspace_id
                AND (wm.user_id = my_user_id OR wm.user_id = my_inspector_id)
            )
            -- Admins can access all boards
            OR public.is_admin_user()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Also fix can_edit_board
CREATE OR REPLACE FUNCTION public.can_edit_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    my_inspector_id UUID;
    my_user_id UUID;
BEGIN
    my_user_id := (SELECT auth.uid());
    my_inspector_id := (SELECT public.get_my_inspector_id());

    RETURN EXISTS (
        SELECT 1 FROM public.boards b
        WHERE b.id = board_uuid
        AND (
            -- Owner can edit
            b.owner_id = my_user_id
            OR b.owner_id = my_inspector_id
            -- Board members with editor/owner role can edit
            OR EXISTS (
                SELECT 1 FROM public.board_members bm
                WHERE bm.board_id = b.id
                AND (bm.user_id = my_user_id OR bm.user_id = my_inspector_id)
                AND bm.role IN ('owner', 'editor')
            )
            -- Workspace admins/owners can edit
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = b.workspace_id
                AND (wm.user_id = my_user_id OR wm.user_id = my_inspector_id)
                AND wm.role IN ('owner', 'admin')
            )
            -- Admins can edit all boards
            OR public.is_admin_user()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;
