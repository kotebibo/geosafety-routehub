-- ================================================
-- FINAL MIGRATIONS: Complete Board & Activity RLS Setup
-- ================================================
-- Run this in Supabase SQL Editor to enable all board functionality
-- This includes board views, presence, and activity tracking

-- WARNING: These policies are ONLY for development
-- In production, restore proper authentication-based policies

-- ================================================
-- MIGRATION 012: BOARD VIEWS
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
-- MIGRATION 012: BOARD PRESENCE
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
-- MIGRATION 013: ITEM UPDATES (Activity Tracking)
-- ================================================

ALTER TABLE public.item_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all item update reads" ON public.item_updates;
DROP POLICY IF EXISTS "Dev: Allow all item update inserts" ON public.item_updates;
DROP POLICY IF EXISTS "Dev: Allow all item update updates" ON public.item_updates;
DROP POLICY IF EXISTS "Dev: Allow all item update deletes" ON public.item_updates;

CREATE POLICY "Dev: Allow all item update reads"
  ON public.item_updates FOR SELECT
  USING (true);

CREATE POLICY "Dev: Allow all item update inserts"
  ON public.item_updates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev: Allow all item update updates"
  ON public.item_updates FOR UPDATE
  USING (true);

CREATE POLICY "Dev: Allow all item update deletes"
  ON public.item_updates FOR DELETE
  USING (true);

-- ================================================
-- MIGRATIONS COMPLETE
-- ================================================
-- After running these migrations:
-- 1. Navigate to http://localhost:3000/boards
-- 2. Click "Create Board"
-- 3. Board should be created successfully
-- 4. Click on board to view details
-- 5. Add items and edit them inline ✅

-- ================================================
-- TROUBLESHOOTING
-- ================================================
-- If you still see errors, check:
-- 1. Browser console for error messages
-- 2. Network tab for failed API calls (look for 401/403 errors)
-- 3. Verify all previous migrations (009, 010, 011) were applied

-- To check all applied policies:
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND (tablename LIKE 'board%' OR tablename = 'item_updates')
-- ORDER BY tablename, policyname;
