-- Migration 052: Restore proper RLS policies for board tables
-- Uses can_access_board function which allows access if:
--   1. User owns the board
--   2. Board is public (is_public = true)
--   3. User is a board member
--   4. User is a workspace member

-- =====================
-- board_columns policies
-- =====================
DROP POLICY IF EXISTS "board_columns_select_policy" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_manage_policy" ON public.board_columns;

CREATE POLICY "board_columns_select_policy" ON public.board_columns
    FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_columns_manage_policy" ON public.board_columns
    FOR ALL TO authenticated
    USING (public.can_edit_board(board_id))
    WITH CHECK (public.can_edit_board(board_id));

-- =====================
-- board_items policies
-- =====================
DROP POLICY IF EXISTS "board_items_select_policy" ON public.board_items;
DROP POLICY IF EXISTS "board_items_insert_policy" ON public.board_items;
DROP POLICY IF EXISTS "board_items_update_policy" ON public.board_items;
DROP POLICY IF EXISTS "board_items_delete_policy" ON public.board_items;

CREATE POLICY "board_items_select_policy" ON public.board_items
    FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_items_insert_policy" ON public.board_items
    FOR INSERT TO authenticated
    WITH CHECK (public.can_edit_board(board_id));

CREATE POLICY "board_items_update_policy" ON public.board_items
    FOR UPDATE TO authenticated
    USING (public.can_edit_board(board_id));

CREATE POLICY "board_items_delete_policy" ON public.board_items
    FOR DELETE TO authenticated
    USING (public.can_edit_board(board_id));

-- =====================
-- board_groups policies
-- =====================
DROP POLICY IF EXISTS "board_groups_select_policy" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_insert_policy" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_update_policy" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_delete_policy" ON public.board_groups;

CREATE POLICY "board_groups_select_policy" ON public.board_groups
    FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_groups_insert_policy" ON public.board_groups
    FOR INSERT TO authenticated
    WITH CHECK (public.can_edit_board(board_id));

CREATE POLICY "board_groups_update_policy" ON public.board_groups
    FOR UPDATE TO authenticated
    USING (public.can_edit_board(board_id));

CREATE POLICY "board_groups_delete_policy" ON public.board_groups
    FOR DELETE TO authenticated
    USING (public.can_edit_board(board_id));
