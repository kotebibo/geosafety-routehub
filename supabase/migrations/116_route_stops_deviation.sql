-- Plan-deviation fields on route stops: a skip/defer reason + note, when it was
-- deferred, and a "prepaid" flag. prepaid = the stop was carried over from a
-- prior approved week whose fuel was already purchased, so it must NOT add km /
-- fuel cost to the new week (avoids double-charging fuel for a carried object).
--
-- Apply staging-first:
--   node scripts/run-migration.mjs 116_route_stops_deviation.sql --stage
--
-- ROLLBACK:
--   ALTER TABLE public.route_stops
--     DROP COLUMN IF EXISTS skip_reason, DROP COLUMN IF EXISTS skip_note,
--     DROP COLUMN IF EXISTS deferred_at, DROP COLUMN IF EXISTS prepaid;

ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS skip_reason text,
  ADD COLUMN IF NOT EXISTS skip_note text,
  ADD COLUMN IF NOT EXISTS deferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS prepaid boolean NOT NULL DEFAULT false;

ALTER TABLE public.route_stops DROP CONSTRAINT IF EXISTS route_stops_skip_reason_check;
ALTER TABLE public.route_stops ADD CONSTRAINT route_stops_skip_reason_check
  CHECK (skip_reason IS NULL OR skip_reason IN ('empty', 'closed', 'refused', 'other'));

COMMENT ON COLUMN public.route_stops.skip_reason IS
  'empty | closed | refused | other — why the planned visit was deferred/skipped.';
COMMENT ON COLUMN public.route_stops.prepaid IS
  'Carried over from a prior approved (fuel-paid) week — excluded from the new week''s fuel cost.';
