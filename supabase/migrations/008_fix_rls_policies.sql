-- ================================================
-- Fix RLS Policies - Remove Circular Dependencies
-- Migration 008: Fix infinite recursion in board policies
-- ================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view accessible boards" ON public.boards;
DROP POLICY IF EXISTS "Users can create boards" ON public.boards;
DROP POLICY IF EXISTS "Users can update their own boards or boards they have edit access to" ON public.boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON public.boards;

DROP POLICY IF EXISTS "Users can view items in accessible boards" ON public.board_items;
DROP POLICY IF EXISTS "Users can create items in boards they have edit access to" ON public.board_items;
DROP POLICY IF EXISTS "Users can update items in boards they have edit access to" ON public.board_items;
DROP POLICY IF EXISTS "Users can delete items in boards they have edit access to" ON public.board_items;

DROP POLICY IF EXISTS "Users can view members of their boards" ON public.board_members;
DROP POLICY IF EXISTS "Board owners and editors can add members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners and editors can update members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can remove members" ON public.board_members;

-- ================================================
-- BOARDS POLICIES (Simplified - No circular reference)
-- ================================================

CREATE POLICY "Users can view their own boards"
    ON public.boards FOR SELECT
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        OR is_public = true
    );

CREATE POLICY "Users can create boards"
    ON public.boards FOR INSERT
    WITH CHECK (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
    );

CREATE POLICY "Users can update their own boards"
    ON public.boards FOR UPDATE
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
    );

CREATE POLICY "Users can delete their own boards"
    ON public.boards FOR DELETE
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
    );

-- ================================================
-- BOARD MEMBERS POLICIES (Simplified - No circular reference)
-- ================================================

CREATE POLICY "Users can view board members"
    ON public.board_members FOR SELECT
    USING (
        -- Can view if they are a member or owner of the board
        user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        OR board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

CREATE POLICY "Board owners can add members"
    ON public.board_members FOR INSERT
    WITH CHECK (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

CREATE POLICY "Board owners can update members"
    ON public.board_members FOR UPDATE
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

CREATE POLICY "Board owners can remove members"
    ON public.board_members FOR DELETE
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

-- ================================================
-- BOARD ITEMS POLICIES (Based on board ownership only)
-- ================================================

CREATE POLICY "Users can view items in their boards"
    ON public.board_items FOR SELECT
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR is_public = true
        )
    );

CREATE POLICY "Users can create items in their boards"
    ON public.board_items FOR INSERT
    WITH CHECK (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

CREATE POLICY "Users can update items in their boards"
    ON public.board_items FOR UPDATE
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

CREATE POLICY "Users can delete items in their boards"
    ON public.board_items FOR DELETE
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
