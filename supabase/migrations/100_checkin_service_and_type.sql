-- ================================================
-- Migration 100: Checkin service + type foundation
--
-- - service: snapshot of the checkin column's configured service
--   (labor safety / personal data protection / ...) taken at
--   check-in time, so later config changes can't rewrite history.
-- - checkin_type: per-checkin visit type (dropdown in the sheet;
--   option list defined in the app).
-- - board_column_id: which checkin column the checkin was made
--   from — allows multiple checkin columns (one per service) on
--   the same board to keep separate histories.
-- ================================================

ALTER TABLE location_checkins
  ADD COLUMN IF NOT EXISTS service TEXT,
  ADD COLUMN IF NOT EXISTS checkin_type TEXT,
  ADD COLUMN IF NOT EXISTS board_column_id UUID REFERENCES board_columns(id) ON DELETE SET NULL;
