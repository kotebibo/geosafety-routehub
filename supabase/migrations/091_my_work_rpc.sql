-- My Work: RPC function + page permission
-- Fetches all board items assigned to a user across all boards via person-type columns.

-- Page permission
INSERT INTO permissions (name, resource, action, description, category) VALUES
  ('pages:my_work', 'pages', 'my_work', 'Access My Work page', 'Pages')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_name, permission) VALUES
  ('dispatcher', 'pages:my_work'),
  ('officer', 'pages:my_work')
ON CONFLICT (role_name, permission) DO NOTHING;

CREATE OR REPLACE FUNCTION get_my_work_items(p_user_id UUID)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  board_id UUID,
  board_name TEXT,
  board_icon TEXT,
  board_color TEXT,
  group_id UUID,
  group_name TEXT,
  group_color TEXT,
  item_data JSONB,
  item_status TEXT,
  item_due_date DATE,
  item_position INT,
  item_created_at TIMESTAMPTZ,
  item_updated_at TIMESTAMPTZ,
  person_column_ids TEXT[],
  date_column_id TEXT
)
AS $$
BEGIN
  RETURN QUERY
  WITH user_boards AS (
    SELECT bm.board_id
    FROM board_members bm
    WHERE bm.user_id = p_user_id
  ),
  person_columns AS (
    SELECT bc.board_id, bc.column_id
    FROM board_columns bc
    JOIN user_boards ub ON bc.board_id = ub.board_id
    WHERE bc.column_type = 'person'
  ),
  boards_with_person_cols AS (
    SELECT DISTINCT pc.board_id
    FROM person_columns pc
  ),
  due_date_columns AS (
    SELECT DISTINCT ON (bc.board_id) bc.board_id, bc.column_id
    FROM board_columns bc
    JOIN user_boards ub ON bc.board_id = ub.board_id
    WHERE bc.column_type = 'date'
      AND bc.config IS NOT NULL
      AND (bc.config->>'is_due_date')::boolean = true
    ORDER BY bc.board_id, bc.position
  ),
  -- Items where user is assigned via person column
  person_matched_items AS (
    SELECT DISTINCT ON (bi.id)
      bi.id,
      array_agg(DISTINCT pc.column_id) AS matched_columns
    FROM board_items bi
    JOIN person_columns pc ON bi.board_id = pc.board_id
    WHERE bi.deleted_at IS NULL
    AND (
      bi.data ->> pc.column_id = p_user_id::text
      OR
      bi.data -> pc.column_id @> to_jsonb(p_user_id::text)
    )
    GROUP BY bi.id
  ),
  -- All items from boards WITHOUT person columns (user is member = show all)
  board_member_items AS (
    SELECT
      bi.id,
      ARRAY[]::varchar[] AS matched_columns
    FROM board_items bi
    JOIN user_boards ub ON bi.board_id = ub.board_id
    WHERE bi.deleted_at IS NULL
    AND bi.board_id NOT IN (SELECT bwpc.board_id FROM boards_with_person_cols bwpc)
  ),
  all_matched AS (
    SELECT * FROM person_matched_items
    UNION ALL
    SELECT * FROM board_member_items
  )
  SELECT
    bi.id AS item_id,
    bi.name::text AS item_name,
    b.id AS board_id,
    b.name::text AS board_name,
    b.icon::text AS board_icon,
    b.color::text AS board_color,
    bg.id AS group_id,
    bg.name::text AS group_name,
    bg.color::text AS group_color,
    bi.data AS item_data,
    bi.status::text AS item_status,
    COALESCE(
      bi.due_date::date,
      (bi.data ->> ddc.column_id)::date
    ) AS item_due_date,
    bi.position AS item_position,
    bi.created_at AS item_created_at,
    bi.updated_at AS item_updated_at,
    am.matched_columns::text[] AS person_column_ids,
    ddc.column_id::text AS date_column_id
  FROM all_matched am
  JOIN board_items bi ON bi.id = am.id
  JOIN boards b ON b.id = bi.board_id
  LEFT JOIN board_groups bg ON bg.id = bi.group_id
  LEFT JOIN due_date_columns ddc ON ddc.board_id = bi.board_id
  ORDER BY
    COALESCE(bi.due_date::date, (bi.data ->> ddc.column_id)::date) ASC NULLS LAST,
    bi.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
