-- ================================================
-- Board Sidebar Position / Ordering
-- Migration 077: Add position column for custom board ordering
-- ================================================

ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Index for fast ordering within a workspace
CREATE INDEX IF NOT EXISTS idx_boards_workspace_position ON public.boards(workspace_id, position);

-- Initialize positions based on current creation order (newest = highest position)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at ASC) - 1 AS pos
  FROM public.boards
)
UPDATE public.boards SET position = ranked.pos FROM ranked WHERE boards.id = ranked.id;
