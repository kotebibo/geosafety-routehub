-- Migration 082: GPS pings during active check-ins
-- Enables continuous location verification (100m radius enforcement)
-- and accurate on-site time calculation for analytics/payroll

CREATE TABLE IF NOT EXISTS checkin_gps_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES location_checkins(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  distance_from_location DOUBLE PRECISION,
  within_radius BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookups by checkin
CREATE INDEX idx_gps_pings_checkin ON checkin_gps_pings(checkin_id, created_at DESC);

-- Analytics: find out-of-radius pings
CREATE INDEX idx_gps_pings_violations ON checkin_gps_pings(checkin_id)
  WHERE within_radius = false;

-- RLS
ALTER TABLE checkin_gps_pings ENABLE ROW LEVEL SECURITY;

-- Inspectors can insert pings for their own active checkins
CREATE POLICY "inspectors_insert_own_pings" ON checkin_gps_pings
  FOR INSERT TO authenticated
  WITH CHECK (
    checkin_id IN (
      SELECT lc.id FROM location_checkins lc
      JOIN user_roles ur ON ur.inspector_id = lc.inspector_id
      WHERE ur.user_id = auth.uid()
    )
  );

-- Inspectors can view their own pings
CREATE POLICY "inspectors_select_own_pings" ON checkin_gps_pings
  FOR SELECT TO authenticated
  USING (
    checkin_id IN (
      SELECT lc.id FROM location_checkins lc
      JOIN user_roles ur ON ur.inspector_id = lc.inspector_id
      WHERE ur.user_id = auth.uid()
    )
  );

-- Admin/dispatcher can view all pings
CREATE POLICY "admin_dispatcher_select_all_pings" ON checkin_gps_pings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'dispatcher')
    )
  );

-- Add radius_violations count to location_checkins for quick analytics
ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS radius_violations INTEGER DEFAULT 0;
ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS total_pings INTEGER DEFAULT 0;
ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS effective_minutes INTEGER;
