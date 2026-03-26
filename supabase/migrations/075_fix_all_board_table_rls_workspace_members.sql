-- Migration: Fix ALL board-related table RLS policies to use
-- can_access_board() / can_edit_board() helper functions.
--
-- These functions (updated in migration 045) already check:
--   - Board owner (auth.uid() or inspector_id)
--   - Direct board member
--   - Workspace member
--   - Public boards (can_access_board only)
--   - Admin user
--
-- Previously, the inline policies only checked board_members,
-- so workspace members couldn't see any board content.

-- ============================================
-- BOARD_COLUMNS
-- ============================================
DROP POLICY IF EXISTS "board_columns_select_policy" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_insert_policy" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_update_policy" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_delete_policy" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_manage_policy" ON public.board_columns;

CREATE POLICY "board_columns_select_policy" ON public.board_columns
    FOR SELECT TO authenticated USING (public.can_access_board(board_id));
CREATE POLICY "board_columns_manage_policy" ON public.board_columns
    FOR ALL TO authenticated
    USING (public.can_edit_board(board_id))
    WITH CHECK (public.can_edit_board(board_id));

-- ============================================
-- BOARD_ITEMS
-- ============================================
DROP POLICY IF EXISTS "board_items_select_policy" ON public.board_items;
DROP POLICY IF EXISTS "board_items_insert_policy" ON public.board_items;
DROP POLICY IF EXISTS "board_items_update_policy" ON public.board_items;
DROP POLICY IF EXISTS "board_items_delete_policy" ON public.board_items;

CREATE POLICY "board_items_select_policy" ON public.board_items
    FOR SELECT TO authenticated USING (public.can_access_board(board_id));
CREATE POLICY "board_items_insert_policy" ON public.board_items
    FOR INSERT TO authenticated WITH CHECK (public.can_edit_board(board_id));
CREATE POLICY "board_items_update_policy" ON public.board_items
    FOR UPDATE TO authenticated USING (public.can_edit_board(board_id));
CREATE POLICY "board_items_delete_policy" ON public.board_items
    FOR DELETE TO authenticated USING (public.can_edit_board(board_id));

-- ============================================
-- BOARD_SUBITEMS
-- ============================================
DROP POLICY IF EXISTS "board_subitems_select" ON public.board_subitems;
DROP POLICY IF EXISTS "board_subitems_insert" ON public.board_subitems;
DROP POLICY IF EXISTS "board_subitems_update" ON public.board_subitems;
DROP POLICY IF EXISTS "board_subitems_delete" ON public.board_subitems;

CREATE POLICY "board_subitems_select" ON public.board_subitems
    FOR SELECT TO authenticated USING (public.can_access_board(board_id));
CREATE POLICY "board_subitems_insert" ON public.board_subitems
    FOR INSERT TO authenticated WITH CHECK (public.can_edit_board(board_id));
CREATE POLICY "board_subitems_update" ON public.board_subitems
    FOR UPDATE TO authenticated USING (public.can_edit_board(board_id));
CREATE POLICY "board_subitems_delete" ON public.board_subitems
    FOR DELETE TO authenticated USING (public.can_edit_board(board_id));

-- ============================================
-- BOARD_VIEWS — skipped, uses board_type (varchar) not board_id (UUID)
-- ============================================

-- ============================================
-- BOARD_GROUPS
-- ============================================
DROP POLICY IF EXISTS "board_groups_select_policy" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_insert_policy" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_update_policy" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_delete_policy" ON public.board_groups;

CREATE POLICY "board_groups_select_policy" ON public.board_groups
    FOR SELECT TO authenticated USING (public.can_access_board(board_id));
CREATE POLICY "board_groups_insert_policy" ON public.board_groups
    FOR INSERT TO authenticated WITH CHECK (public.can_edit_board(board_id));
CREATE POLICY "board_groups_update_policy" ON public.board_groups
    FOR UPDATE TO authenticated USING (public.can_edit_board(board_id));
CREATE POLICY "board_groups_delete_policy" ON public.board_groups
    FOR DELETE TO authenticated USING (public.can_edit_board(board_id));
