-- ================================================
-- Migration 094: Tokenized Global Board Search
-- Split search query on spaces so each word matches
-- independently (AND logic across all tokens).
-- "გიორგი თბილისი" now finds items where both words
-- appear anywhere across name + data fields.
-- ================================================

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
  tokens TEXT[];
  combined_text TEXT;
BEGIN
  -- Split query into non-empty tokens
  tokens := array_remove(regexp_split_to_array(trim(search_query), '\s+'), '');

  IF array_length(tokens, 1) IS NULL THEN
    RETURN;
  END IF;

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
      -- Determine which field matched (use first token for display)
      CASE
        WHEN bi.name ILIKE '%' || tokens[1] || '%' THEN 'name'
        ELSE (
          SELECT key
          FROM jsonb_each_text(COALESCE(bi.data, '{}'::jsonb))
          WHERE value ILIKE '%' || tokens[1] || '%'
          LIMIT 1
        )
      END AS match_field,
      ROW_NUMBER() OVER (PARTITION BY bi.board_id ORDER BY bi.position) AS rn
    FROM board_items bi
    JOIN boards b ON bi.board_id = b.id
    WHERE (
      -- Every token must appear somewhere in name or data
      SELECT bool_and(
        lower(bi.name || ' ' || COALESCE(bi.data::text, '')) LIKE '%' || lower(t) || '%'
      )
      FROM unnest(tokens) AS t
    )
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
