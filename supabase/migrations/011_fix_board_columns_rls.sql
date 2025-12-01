-- ================================================
-- Fix Board Columns RLS
-- Migration 011: Add permissive policies for board_columns
-- ================================================

-- Enable RLS on board_columns if not already enabled
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow all board column reads" ON public.board_columns;
DROP POLICY IF EXISTS "Allow all board column inserts" ON public.board_columns;
DROP POLICY IF EXISTS "Allow all board column updates" ON public.board_columns;
DROP POLICY IF EXISTS "Allow all board column deletes" ON public.board_columns;

-- Create permissive policies for development
CREATE POLICY "Dev: Allow all board column reads"
  ON public.board_columns FOR SELECT
  USING (true);

CREATE POLICY "Dev: Allow all board column inserts"
  ON public.board_columns FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev: Allow all board column updates"
  ON public.board_columns FOR UPDATE
  USING (true);

CREATE POLICY "Dev: Allow all board column deletes"
  ON public.board_columns FOR DELETE
  USING (true);

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
