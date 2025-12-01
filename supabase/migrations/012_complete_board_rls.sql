-- ================================================
-- Complete Board RLS Policies
-- Migration 012: Add permissive policies for all board tables
-- ================================================

-- WARNING: These policies are ONLY for development
-- In production, restore proper authentication-based policies

-- ================================================
-- BOARD VIEWS
-- ================================================

ALTER TABLE public.board_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all board view reads" ON public.board_views;
DROP POLICY IF EXISTS "Dev: Allow all board view inserts" ON public.board_views;
DROP POLICY IF EXISTS "Dev: Allow all board view updates" ON public.board_views;
DROP POLICY IF EXISTS "Dev: Allow all board view deletes" ON public.board_views;

CREATE POLICY "Dev: Allow all board view reads"
  ON public.board_views FOR SELECT
  USING (true);

CREATE POLICY "Dev: Allow all board view inserts"
  ON public.board_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev: Allow all board view updates"
  ON public.board_views FOR UPDATE
  USING (true);

CREATE POLICY "Dev: Allow all board view deletes"
  ON public.board_views FOR DELETE
  USING (true);

-- ================================================
-- BOARD PRESENCE
-- ================================================

ALTER TABLE public.board_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all board presence reads" ON public.board_presence;
DROP POLICY IF EXISTS "Dev: Allow all board presence inserts" ON public.board_presence;
DROP POLICY IF EXISTS "Dev: Allow all board presence updates" ON public.board_presence;
DROP POLICY IF EXISTS "Dev: Allow all board presence deletes" ON public.board_presence;

CREATE POLICY "Dev: Allow all board presence reads"
  ON public.board_presence FOR SELECT
  USING (true);

CREATE POLICY "Dev: Allow all board presence inserts"
  ON public.board_presence FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev: Allow all board presence updates"
  ON public.board_presence FOR UPDATE
  USING (true);

CREATE POLICY "Dev: Allow all board presence deletes"
  ON public.board_presence FOR DELETE
  USING (true);

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
