-- Extra officer profile fields for the vehicle/fuel + org model.
--   car_plate  — vehicle plate number (free text)
--   fuel_type  — petrol | diesel | gas (drives which global fuel price applies)
--   org        — geosafety | safetycorp (the LLC the officer belongs to)
-- All additive and nullable — existing rows keep working.
--
-- Apply staging-first:
--   node scripts/run-migration.mjs 112_officer_profile_fields.sql --stage
--   (then --prod on prod day)
--
-- ROLLBACK:
--   ALTER TABLE public.officer_transport
--     DROP COLUMN IF EXISTS car_plate,
--     DROP COLUMN IF EXISTS fuel_type,
--     DROP COLUMN IF EXISTS org;

ALTER TABLE public.officer_transport
  ADD COLUMN IF NOT EXISTS car_plate TEXT,
  ADD COLUMN IF NOT EXISTS fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS org TEXT;

-- Constrain to the known enums (idempotent: drop then re-add).
ALTER TABLE public.officer_transport
  DROP CONSTRAINT IF EXISTS officer_transport_fuel_type_check;
ALTER TABLE public.officer_transport
  ADD CONSTRAINT officer_transport_fuel_type_check
  CHECK (fuel_type IS NULL OR fuel_type IN ('petrol', 'diesel', 'gas'));

ALTER TABLE public.officer_transport
  DROP CONSTRAINT IF EXISTS officer_transport_org_check;
ALTER TABLE public.officer_transport
  ADD CONSTRAINT officer_transport_org_check
  CHECK (org IS NULL OR org IN ('geosafety', 'safetycorp'));

COMMENT ON COLUMN public.officer_transport.car_plate IS 'Vehicle plate number (free text).';
COMMENT ON COLUMN public.officer_transport.fuel_type IS
  'petrol | diesel | gas — selects the global fuel price applied to this officer.';
COMMENT ON COLUMN public.officer_transport.org IS
  'geosafety | safetycorp — the LLC the officer belongs to.';
