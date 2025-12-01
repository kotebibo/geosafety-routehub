-- ================================================
-- Item Updates RLS Policies
-- Migration 013: Add permissive policies for item_updates table
-- ================================================

-- WARNING: These policies are ONLY for development
-- In production, restore proper authentication-based policies

-- ================================================
-- ITEM UPDATES (Activity Tracking)
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
-- MIGRATION COMPLETE
-- ================================================
