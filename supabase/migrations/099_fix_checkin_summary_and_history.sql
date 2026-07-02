-- ================================================
-- Migration 099: Fix checkin summary RPC + preserve
-- visit history across item transfers.
--
-- 1. get_board_checkin_summary was SECURITY INVOKER and read
--    auth.users — authenticated role has no grant there, so the
--    RPC failed with "permission denied for table users" for
--    every caller. Rewritten as SECURITY DEFINER reading
--    public.users, so the current board owner sees the full
--    visit history of an item even when previous checkins were
--    made by another inspector (item transferred between boards).
--
-- 2. Partial unique index: at most one active (not checked out)
--    checkin per inspector. Closes the check-then-insert race in
--    the API. Stale duplicate actives are auto-closed first.
-- ================================================

-- 1. Fixed summary RPC
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
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lc.board_item_id AS item_id,
    COUNT(*)::BIGINT AS checkin_count,
    BOOL_OR(lc.checked_out_at IS NULL) AS has_active,
    (ARRAY_AGG(lc.id ORDER BY lc.created_at DESC))[1] AS latest_checkin_id,
    (ARRAY_AGG(lc.inspector_id ORDER BY lc.created_at DESC))[1] AS latest_inspector_id,
    (ARRAY_AGG(COALESCE(u.full_name, u.email, '') ORDER BY lc.created_at DESC))[1] AS latest_inspector_name,
    MAX(lc.created_at) AS latest_created_at,
    (ARRAY_AGG(lc.checked_out_at ORDER BY lc.created_at DESC))[1] AS latest_checked_out_at,
    (ARRAY_AGG(lc.duration_minutes ORDER BY lc.created_at DESC))[1] AS latest_duration_minutes,
    (ARRAY_AGG(lc.checkout_distance ORDER BY lc.created_at DESC))[1] AS latest_checkout_distance,
    (ARRAY_AGG(lc.location_match ORDER BY lc.created_at DESC))[1] AS latest_location_match
  FROM location_checkins lc
  JOIN board_items bi ON bi.id = lc.board_item_id
  LEFT JOIN public.users u ON u.id = lc.inspector_id
  WHERE bi.board_id = p_board_id
    AND bi.deleted_at IS NULL
    AND lc.board_item_id IS NOT NULL
  GROUP BY lc.board_item_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_board_checkin_summary(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_board_checkin_summary(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_board_checkin_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_board_checkin_summary(UUID) TO service_role;

-- 2. Close any stale duplicate active checkins (keep the newest per inspector),
--    then enforce one active checkin per inspector at the DB level.
UPDATE location_checkins
SET checked_out_at = created_at
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY inspector_id ORDER BY created_at DESC) AS rn
    FROM location_checkins
    WHERE checked_out_at IS NULL
  ) t
  WHERE t.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_checkin_per_inspector
  ON location_checkins(inspector_id)
  WHERE checked_out_at IS NULL;
