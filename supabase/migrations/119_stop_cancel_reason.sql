-- Deferral: add the "object canceled the visit" reason + an admin-confirmation
-- flag. A canceled+confirmed stop is treated as a legitimate visit (counts,
-- reimbursed); a canceled-but-unconfirmed one sits "in processing" (blue) until
-- the admin confirms. All other deferrals with an unvisited paid week become
-- "failed" (ჩავარდნილი) — excluded from cost.
--
-- Apply staging-first:
--   node scripts/run-migration.mjs 119_stop_cancel_reason.sql --stage
--
-- ROLLBACK:
--   ALTER TABLE public.route_stops DROP COLUMN IF EXISTS skip_confirmed;
--   (skip_reason constraint reverts to the 116 set)

ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS skip_confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE public.route_stops DROP CONSTRAINT IF EXISTS route_stops_skip_reason_check;
ALTER TABLE public.route_stops ADD CONSTRAINT route_stops_skip_reason_check
  CHECK (skip_reason IS NULL OR skip_reason IN ('empty', 'closed', 'refused', 'canceled', 'other'));

COMMENT ON COLUMN public.route_stops.skip_confirmed IS
  'Admin confirmed a "canceled" (object canceled the visit) deferral → counts as legit, not failed.';
