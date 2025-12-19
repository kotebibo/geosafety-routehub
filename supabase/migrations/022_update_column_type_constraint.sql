-- Migration 022: Add board_id column and update column_type CHECK constraint
-- This enables per-board custom columns and adds new column types

-- 1. Add board_id column to board_columns if it doesn't exist
ALTER TABLE public.board_columns
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- 2. Create index for board-specific column queries
CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON public.board_columns(board_id);

-- 3. Drop the old unique constraint if it exists
ALTER TABLE public.board_columns
DROP CONSTRAINT IF EXISTS board_columns_board_type_column_id_key;

-- 4. Create new unique constraint that allows board-specific columns
-- Uses COALESCE to handle both default columns (board_id IS NULL) and board-specific columns
DROP INDEX IF EXISTS idx_board_columns_unique;
CREATE UNIQUE INDEX idx_board_columns_unique
ON public.board_columns(COALESCE(board_id::text, board_type), column_id);

-- 5. Drop the old check constraint
ALTER TABLE public.board_columns
DROP CONSTRAINT IF EXISTS board_columns_column_type_check;

-- 6. Add updated check constraint with all column types
ALTER TABLE public.board_columns
ADD CONSTRAINT board_columns_column_type_check
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
