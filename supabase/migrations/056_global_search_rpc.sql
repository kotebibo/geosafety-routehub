-- ================================================
-- Migration 056: Global Board Search RPC Function
-- Searches across all accessible boards, matching
-- item names and JSONB data field values
-- ================================================

-- Enable trigram extension for faster text matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create the global search function
CREATE OR REPLACE FUNCTION public.search_board_items_global(
  search_query TEXT,
  max_per_board INTEGER DEFAULT 10,
  max_total INTEGER DEFAULT 100
)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  item_status TEXT,
  item_data JSONB,
  item_board_id UUID,
  item_group_id UUID,
  item_position INTEGER,
  item_assigned_to UUID,
  item_due_date DATE,
  item_created_at TIMESTAMPTZ,
  board_name TEXT,
  board_color TEXT,
  board_icon TEXT,
  board_type TEXT,
  matched_field TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  search_pattern TEXT;
BEGIN
  -- Build the ILIKE pattern once
  search_pattern := '%' || search_query || '%';

  RETURN QUERY
  WITH matched_items AS (
    SELECT
      bi.id,
      bi.name,
      bi.status,
      bi.data,
      bi.board_id,
      bi.group_id,
      bi.position,
      bi.assigned_to,
      bi.due_date,
      bi.created_at,
      b.name AS b_name,
      b.color AS b_color,
      b.icon AS b_icon,
      b.board_type AS b_type,
      -- Determine which field matched
      CASE
        WHEN bi.name ILIKE search_pattern THEN 'name'
        ELSE (
          SELECT key
          FROM jsonb_each_text(COALESCE(bi.data, '{}'::jsonb))
          WHERE value ILIKE search_pattern
          LIMIT 1
        )
      END AS match_field,
      ROW_NUMBER() OVER (PARTITION BY bi.board_id ORDER BY bi.position) AS rn
    FROM board_items bi
    JOIN boards b ON bi.board_id = b.id
    WHERE
      bi.name ILIKE search_pattern
      OR bi.data::text ILIKE search_pattern
  )
  SELECT
    mi.id,
    mi.name::TEXT,
    mi.status::TEXT,
    mi.data,
    mi.board_id,
    mi.group_id,
    mi.position,
    mi.assigned_to,
    mi.due_date,
    mi.created_at,
    mi.b_name::TEXT,
    mi.b_color::TEXT,
    mi.b_icon::TEXT,
    mi.b_type::TEXT,
    COALESCE(mi.match_field, 'data')::TEXT
  FROM matched_items mi
  WHERE mi.rn <= max_per_board
  ORDER BY mi.b_name, mi.position
  LIMIT max_total;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.search_board_items_global IS 'Global search across all accessible boards - searches item names and JSONB data values. Respects RLS via SECURITY INVOKER.';

-- Optional: trigram index on item names for faster ILIKE matching
CREATE INDEX IF NOT EXISTS idx_board_items_name_trgm
  ON public.board_items USING gin (name gin_trgm_ops);
