-- Officer routing profile: home + route-start locations.
-- Admin optionally sets these when creating/editing an officer. They feed the
-- weekly planner's start point and (via consumption) the fuel estimate. Both
-- locations are optional; all columns nullable and purely additive.
--
-- Apply staging-first:
--   node scripts/run-migration.mjs 107_officer_transport_locations.sql --stage
--   (then --prod after verification — all three instances)
--
-- ROLLBACK:
--   ALTER TABLE public.officer_transport
--     DROP COLUMN IF EXISTS home_lat, DROP COLUMN IF EXISTS home_lng,
--     DROP COLUMN IF EXISTS home_address, DROP COLUMN IF EXISTS start_lat,
--     DROP COLUMN IF EXISTS start_lng, DROP COLUMN IF EXISTS start_address;

ALTER TABLE public.officer_transport
  ADD COLUMN IF NOT EXISTS home_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS home_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS start_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS start_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS start_address TEXT;

COMMENT ON COLUMN public.officer_transport.home_lat IS 'Officer residential location latitude (optional).';
COMMENT ON COLUMN public.officer_transport.start_lat IS 'Officer default route-start latitude (optional); overrides home for planning.';
