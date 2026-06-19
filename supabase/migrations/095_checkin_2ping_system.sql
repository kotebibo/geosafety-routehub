-- ================================================
-- Migration 095: Simplify checkins to 2-ping system
-- Remove continuous GPS ping tracking. Instead compare
-- checkin location vs checkout location directly.
-- ================================================

-- Add new columns for checkout distance comparison
ALTER TABLE public.location_checkins
  ADD COLUMN IF NOT EXISTS checkout_distance INTEGER,
  ADD COLUMN IF NOT EXISTS location_match BOOLEAN;

-- Drop the old ping-analytics columns (data stays in checkin_gps_pings table for history)
ALTER TABLE public.location_checkins
  DROP COLUMN IF EXISTS effective_minutes,
  DROP COLUMN IF EXISTS total_pings,
  DROP COLUMN IF EXISTS radius_violations;

COMMENT ON COLUMN public.location_checkins.checkout_distance IS 'Distance in meters between checkin and checkout GPS coordinates';
COMMENT ON COLUMN public.location_checkins.location_match IS 'True if checkout was within 100m of checkin location';
