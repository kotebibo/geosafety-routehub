-- ============================================
-- 058: Location Check-ins
-- Inspectors check in at company locations to
-- capture/verify GPS coordinates
-- ============================================

-- 1. Check-ins table
CREATE TABLE IF NOT EXISTS location_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL REFERENCES inspectors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_location_id UUID REFERENCES company_locations(id) ON DELETE SET NULL,
  route_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  notes TEXT,
  photos JSONB,
  location_updated BOOLEAN DEFAULT false,
  distance_from_location DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX idx_checkins_inspector_time ON location_checkins(inspector_id, created_at DESC);
CREATE INDEX idx_checkins_company_time ON location_checkins(company_id, created_at DESC);
CREATE INDEX idx_checkins_created ON location_checkins(created_at DESC);
CREATE INDEX idx_checkins_route_stop ON location_checkins(route_stop_id) WHERE route_stop_id IS NOT NULL;

-- 3. RLS
ALTER TABLE location_checkins ENABLE ROW LEVEL SECURITY;

-- Inspectors can insert their own check-ins
CREATE POLICY "inspectors_insert_own_checkins" ON location_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    inspector_id IN (
      SELECT ur.inspector_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.inspector_id IS NOT NULL
    )
  );

-- Inspectors can view their own check-ins
CREATE POLICY "inspectors_select_own_checkins" ON location_checkins
  FOR SELECT TO authenticated
  USING (
    inspector_id IN (
      SELECT ur.inspector_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.inspector_id IS NOT NULL
    )
  );

-- Admin and dispatcher can view all check-ins
CREATE POLICY "admin_dispatcher_select_all_checkins" ON location_checkins
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'dispatcher')
    )
  );

-- Admin can delete check-ins
CREATE POLICY "admin_delete_checkins" ON location_checkins
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );
