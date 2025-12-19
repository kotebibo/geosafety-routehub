-- ================================================
-- Add Updates Column Type
-- Migration 019: Add 'updates' to column_type constraint
-- ================================================

-- Drop the existing constraint
ALTER TABLE public.board_columns DROP CONSTRAINT IF EXISTS board_columns_column_type_check;

-- Add the new constraint with 'updates' column type
ALTER TABLE public.board_columns ADD CONSTRAINT board_columns_column_type_check
  CHECK (column_type IN (
    'text',
    'status',
    'person',
    'date',
    'number',
    'location',
    'actions',
    'route',
    'company',
    'service_type',
    'checkbox',
    'phone',
    'files',
    'updates'
  ));

-- ================================================
-- ITEM COMMENTS RLS - Permissive for Development
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.item_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.item_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.item_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.item_comments;
DROP POLICY IF EXISTS "Dev: Allow all item comment reads" ON public.item_comments;
DROP POLICY IF EXISTS "Dev: Allow all item comment inserts" ON public.item_comments;
DROP POLICY IF EXISTS "Dev: Allow all item comment updates" ON public.item_comments;
DROP POLICY IF EXISTS "Dev: Allow all item comment deletes" ON public.item_comments;

-- Add permissive dev policies
CREATE POLICY "Dev: Allow all item comment reads"
  ON public.item_comments FOR SELECT
  USING (true);

CREATE POLICY "Dev: Allow all item comment inserts"
  ON public.item_comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Dev: Allow all item comment updates"
  ON public.item_comments FOR UPDATE
  USING (true);

CREATE POLICY "Dev: Allow all item comment deletes"
  ON public.item_comments FOR DELETE
  USING (true);

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
