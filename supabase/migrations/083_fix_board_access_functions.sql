-- Migration 083: Fix can_access_board and can_edit_board
-- These were temporarily simplified to "auth.uid() IS NOT NULL" which
-- allowed any authenticated user to see/edit any board's data.
-- This restores proper access checks matching the boards SELECT policy.

-- can_access_board: user can VIEW board data if:
-- 1. They own the board
-- 2. Board is public
-- 3. They are a board member (any role)
-- 4. They are a workspace member (any role) of the board's workspace
-- 5. They are an admin
CREATE OR REPLACE FUNCTION can_access_board(board_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM boards b
        WHERE b.id = board_uuid
        AND (
            b.owner_id = auth.uid()
            OR b.is_public = true
            OR EXISTS (
                SELECT 1 FROM board_members bm
                WHERE bm.board_id = b.id AND bm.user_id = auth.uid()
            )
            OR (
                b.workspace_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = b.workspace_id AND wm.user_id = auth.uid()
                )
            )
            OR is_admin_user()
        )
    );
END;
$$;

-- can_edit_board: user can MODIFY board data if:
-- 1. They own the board
-- 2. They are a board member with owner/editor role
-- 3. They are a workspace member with owner/admin/editor role
-- 4. They are an admin
CREATE OR REPLACE FUNCTION can_edit_board(board_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM boards b
        WHERE b.id = board_uuid
        AND (
            b.owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM board_members bm
                WHERE bm.board_id = b.id AND bm.user_id = auth.uid()
                AND bm.role IN ('owner', 'editor')
            )
            OR (
                b.workspace_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = b.workspace_id AND wm.user_id = auth.uid()
                    AND wm.role IN ('owner', 'admin', 'editor')
                )
            )
            OR is_admin_user()
        )
    );
END;
$$;
