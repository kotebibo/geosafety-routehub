-- Migration 015: Board Column Management
-- Allow boards to have custom column configurations

-- Add board_id column to board_columns to support per-board customization
ALTER TABLE public.board_columns
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- Create index for board-specific column queries
CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON public.board_columns(board_id);

-- Drop the old unique constraint (board_type + column_id)
ALTER TABLE public.board_columns
DROP CONSTRAINT IF EXISTS board_columns_board_type_column_id_key;

-- Create new unique constraint that allows either board_type OR board_id
-- For default columns (board_id IS NULL), use board_type + column_id
-- For board-specific columns (board_id IS NOT NULL), use board_id + column_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_board_columns_unique
ON public.board_columns(COALESCE(board_id::text, board_type), column_id);

-- Add column for column ordering/position
ALTER TABLE public.board_columns
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Update existing columns with sequential positions grouped by board_type
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY board_type ORDER BY id) - 1 as new_position
  FROM public.board_columns
  WHERE position = 0
)
UPDATE public.board_columns bc
SET position = ranked.new_position
FROM ranked
WHERE bc.id = ranked.id;

-- Add RLS policies for board_columns
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;

-- Dev policy: Allow all operations
CREATE POLICY "Dev: Allow all board column operations"
ON public.board_columns
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON COLUMN public.board_columns.board_id IS 'If set, this column is specific to a board. If NULL, it is a default column for the board_type';
COMMENT ON COLUMN public.board_columns.position IS 'Display order of the column (0-based)';
