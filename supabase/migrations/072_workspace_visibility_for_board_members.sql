-- Migration: Allow board-only members to see workspace display info
--
-- Problem: Users added to specific boards (but not the workspace) couldn't see
-- the workspace row, so the sidebar grouped their boards under "Shared with me"
-- instead of under the actual workspace name.
--
-- Solution: Extend workspace SELECT policy so board members can read the
-- workspace row (name, icon, color). They still can't modify it or see
-- other boards/members — those are governed by their own RLS policies.

-- Drop existing select policy
DROP POLICY IF EXISTS "workspaces_select_policy" ON public.workspaces;

-- Recreate with board-member visibility
CREATE POLICY "workspaces_select_policy" ON public.workspaces
    FOR SELECT USING (
        -- Workspace owner
        owner_id = auth.uid()
        -- Workspace member
        OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = id AND wm.user_id = auth.uid()
        )
        -- Board-only member: can see workspace row for navigation context
        OR EXISTS (
            SELECT 1 FROM public.boards b
            INNER JOIN public.board_members bm ON bm.board_id = b.id
            WHERE b.workspace_id = id
            AND bm.user_id = auth.uid()
        )
        -- App admin
        OR public.is_admin_user()
    );

-- Ensure indexes exist for the new subquery path
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON public.board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_workspace_id ON public.boards(workspace_id);
