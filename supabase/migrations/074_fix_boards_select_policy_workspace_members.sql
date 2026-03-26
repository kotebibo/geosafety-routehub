-- Migration: Fix boards SELECT policy to include workspace_members check
--
-- ROOT CAUSE: The active boards_select_policy is missing the workspace_members
-- condition. This means workspace members can NOT see boards in their workspace
-- unless they are also direct board members or board owners.
--
-- The policy currently only checks:
--   1. owner_id = auth.uid()
--   2. board_members.user_id = auth.uid()
--   3. is_admin_user()
--
-- It SHOULD also check:
--   4. is_public = true (public boards)
--   5. workspace_members.user_id = auth.uid() (workspace members see ALL boards)
--
-- This was originally in migration 046 but was likely overwritten by a later migration.

-- Drop the broken policy
DROP POLICY IF EXISTS "boards_select_policy" ON public.boards;

-- Recreate with ALL access paths
CREATE POLICY "boards_select_policy" ON public.boards
    FOR SELECT USING (
        -- Board owner
        owner_id = auth.uid()
        -- Public board
        OR is_public = true
        -- Direct board member
        OR EXISTS (
            SELECT 1 FROM public.board_members bm
            WHERE bm.board_id = id AND bm.user_id = auth.uid()
        )
        -- Workspace member → can see ALL boards in workspace
        OR (
            workspace_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = boards.workspace_id
                AND wm.user_id = auth.uid()
            )
        )
        -- App admin
        OR public.is_admin_user()
    );
