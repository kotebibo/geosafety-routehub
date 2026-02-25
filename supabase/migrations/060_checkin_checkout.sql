-- Migration 060: Add checkout functionality to location_checkins
-- Enables check-out with GPS, duration tracking, and audit time analysis

-- Add checkout columns
ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;
ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS checkout_lat DOUBLE PRECISION;
ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS checkout_lng DOUBLE PRECISION;
ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS checkout_accuracy DOUBLE PRECISION;
ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Index for fast "active check-in" lookups (unclosed checkins per inspector)
CREATE INDEX IF NOT EXISTS idx_checkins_active
  ON location_checkins (inspector_id, created_at DESC)
  WHERE checked_out_at IS NULL;

-- RLS: Inspectors can update their own checkins (for checkout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'location_checkins'
    AND policyname = 'Inspectors can update own checkins'
  ) THEN
    CREATE POLICY "Inspectors can update own checkins"
      ON location_checkins FOR UPDATE
      USING (
        inspector_id IN (
          SELECT ur.inspector_id FROM user_roles ur WHERE ur.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Admin/dispatcher can update any checkin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'location_checkins'
    AND policyname = 'Admin can update all checkins'
  ) THEN
    CREATE POLICY "Admin can update all checkins"
      ON location_checkins FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'dispatcher')
        )
      );
  END IF;
END $$;
