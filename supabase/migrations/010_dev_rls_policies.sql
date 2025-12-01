-- ================================================
-- Development RLS Policies
-- Migration 010: Temporarily disable RLS for development
-- ================================================

-- WARNING: These policies are ONLY for development
-- In production, restore proper authentication-based policies

-- ================================================
-- BOARDS - Allow all operations for development
-- ================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own boards" ON public.boards;
DROP POLICY IF EXISTS "Users can create boards" ON public.boards;
DROP POLICY IF EXISTS "Users can update their own boards" ON public.boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON public.boards;

-- Create permissive policies for development
CREATE POLICY "Dev: Allow all board reads"
  ON public.boards FOR SELECT
  USING (true);

CREATE POLICY "Dev: Allow all board inserts"
  ON public.boards FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev: Allow all board updates"
  ON public.boards FOR UPDATE
  USING (true);

CREATE POLICY "Dev: Allow all board deletes"
  ON public.boards FOR DELETE
  USING (true);

-- ================================================
-- BOARD ITEMS - Allow all operations for development
-- ================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view items in their boards" ON public.board_items;
DROP POLICY IF EXISTS "Users can create items in their boards" ON public.board_items;
DROP POLICY IF EXISTS "Users can update items in their boards" ON public.board_items;
DROP POLICY IF EXISTS "Users can delete items in their boards" ON public.board_items;

-- Create permissive policies for development
CREATE POLICY "Dev: Allow all board item reads"
  ON public.board_items FOR SELECT
  USING (true);

CREATE POLICY "Dev: Allow all board item inserts"
  ON public.board_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev: Allow all board item updates"
  ON public.board_items FOR UPDATE
  USING (true);

CREATE POLICY "Dev: Allow all board item deletes"
  ON public.board_items FOR DELETE
  USING (true);

-- ================================================
-- BOARD MEMBERS - Allow all operations for development
-- ================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view board members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can add members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can update members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can remove members" ON public.board_members;

-- Create permissive policies for development
CREATE POLICY "Dev: Allow all board member reads"
  ON public.board_members FOR SELECT
  USING (true);

CREATE POLICY "Dev: Allow all board member inserts"
  ON public.board_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev: Allow all board member updates"
  ON public.board_members FOR UPDATE
  USING (true);

CREATE POLICY "Dev: Allow all board member deletes"
  ON public.board_members FOR DELETE
  USING (true);

-- ================================================
-- BOARD TEMPLATES - Keep read-only for all
-- ================================================

-- Templates are already publicly readable, no changes needed

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- TODO: Before deploying to production, run the restore script:
-- supabase/migrations/restore_production_rls.sql
