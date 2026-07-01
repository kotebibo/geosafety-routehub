-- ================================================
-- Migration 098: Item-Centric Checkins
-- Link checkins to board items instead of creating
-- separate rows in dedicated checkins boards.
-- ================================================

-- 1. Add board_item_id link to location_checkins
ALTER TABLE location_checkins
  ADD COLUMN IF NOT EXISTS board_item_id UUID REFERENCES board_items(id) ON DELETE SET NULL;

-- 2. Make company_id optional (items may not represent companies)
ALTER TABLE location_checkins ALTER COLUMN company_id DROP NOT NULL;

-- 3. Index for fast lookups by board item
CREATE INDEX IF NOT EXISTS idx_checkins_board_item
  ON location_checkins(board_item_id, created_at DESC)
  WHERE board_item_id IS NOT NULL;

-- 4. Summary RPC: one query per board for cell rendering (avoids N+1)
CREATE OR REPLACE FUNCTION public.get_board_checkin_summary(p_board_id UUID)
RETURNS TABLE (
  item_id UUID,
  checkin_count BIGINT,
  has_active BOOLEAN,
  latest_checkin_id UUID,
  latest_inspector_id UUID,
  latest_inspector_name TEXT,
  latest_created_at TIMESTAMPTZ,
  latest_checked_out_at TIMESTAMPTZ,
  latest_duration_minutes INTEGER,
  latest_checkout_distance INTEGER,
  latest_location_match BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    lc.board_item_id AS item_id,
    COUNT(*)::BIGINT AS checkin_count,
    BOOL_OR(lc.checked_out_at IS NULL) AS has_active,
    (ARRAY_AGG(lc.id ORDER BY lc.created_at DESC))[1] AS latest_checkin_id,
    (ARRAY_AGG(lc.inspector_id ORDER BY lc.created_at DESC))[1] AS latest_inspector_id,
    (ARRAY_AGG(
      COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = lc.inspector_id),
        ''
      ) ORDER BY lc.created_at DESC
    ))[1] AS latest_inspector_name,
    MAX(lc.created_at) AS latest_created_at,
    (ARRAY_AGG(lc.checked_out_at ORDER BY lc.created_at DESC))[1] AS latest_checked_out_at,
    (ARRAY_AGG(lc.duration_minutes ORDER BY lc.created_at DESC))[1] AS latest_duration_minutes,
    (ARRAY_AGG(lc.checkout_distance ORDER BY lc.created_at DESC))[1] AS latest_checkout_distance,
    (ARRAY_AGG(lc.location_match ORDER BY lc.created_at DESC))[1] AS latest_location_match
  FROM location_checkins lc
  JOIN board_items bi ON bi.id = lc.board_item_id
  WHERE bi.board_id = p_board_id
    AND bi.deleted_at IS NULL
    AND lc.board_item_id IS NOT NULL
  GROUP BY lc.board_item_id;
$$;
