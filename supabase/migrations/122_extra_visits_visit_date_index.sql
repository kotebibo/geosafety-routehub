-- admin-week and the analytics export filter extra_visits by visit_date range
-- WITHOUT an inspector_id (fleet-wide, all officers), so the composite
-- (inspector_id, visit_date) index from migration 117 can't serve them — a
-- leading-column mismatch. Add a standalone visit_date index for those scans.
--
-- Apply staging-first:
--   node scripts/run-migration.mjs 122_extra_visits_visit_date_index.sql --stage
--
-- ROLLBACK: DROP INDEX IF EXISTS idx_extra_visits_visit_date;

CREATE INDEX IF NOT EXISTS idx_extra_visits_visit_date
  ON public.extra_visits (visit_date);
