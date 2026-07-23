-- Optional photo captured at check-in (only). Stores the Storage object path;
-- the file lives in the 'checkin-photos' bucket and is auto-deleted after ~14
-- days by a scheduled job (created outside SQL — Storage bucket + cron).
--
-- Apply staging-first:
--   node scripts/run-migration.mjs 118_checkin_photo.sql --stage
--
-- ROLLBACK:
--   ALTER TABLE public.location_checkins DROP COLUMN IF EXISTS photo_path;

ALTER TABLE public.location_checkins
  ADD COLUMN IF NOT EXISTS photo_path text;

COMMENT ON COLUMN public.location_checkins.photo_path IS
  'Storage path in the checkin-photos bucket (check-in only). Auto-pruned after ~14 days.';
