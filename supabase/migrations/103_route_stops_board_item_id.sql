-- Routing feature: link planned route stops to board items (companies).
-- route_stops.company_id references the legacy companies table, but our
-- companies now live as board_items. Add a nullable board_item_id so a stop
-- can point at a board item without breaking any existing company_id rows.
--
-- QUEUED for the "save planned route" step — safe to run early (purely additive,
-- nullable column, no data change). Must be applied to ALL THREE instances:
--   node scripts/run-migration.mjs 103_route_stops_board_item_id.sql
--
-- ROLLBACK (run manually if needed):
--   ALTER TABLE public.route_stops DROP COLUMN IF EXISTS board_item_id;
--   DROP INDEX IF EXISTS idx_route_stops_board_item_id;

ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS board_item_id UUID;

-- No FK constraint on purpose: board_items are soft-deleted (deleted_at) and
-- we don't want a stop insert to fail on a since-removed item; the app resolves
-- the item and tolerates nulls. Mirrors how location_checkins.board_item_id
-- was added in migration 098.
CREATE INDEX IF NOT EXISTS idx_route_stops_board_item_id
  ON public.route_stops(board_item_id)
  WHERE board_item_id IS NOT NULL;

COMMENT ON COLUMN public.route_stops.board_item_id IS
  'Optional link to a board_items row (company). Coexists with the legacy company_id.';
