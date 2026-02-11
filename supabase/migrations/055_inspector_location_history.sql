-- ================================================
-- Migration 055: Inspector Location History
-- Stores GPS location pings from inspectors for
-- real-time tracking and trail visualization
-- ================================================

CREATE TABLE IF NOT EXISTS public.inspector_location_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspector_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  route_id UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-range queries per inspector
CREATE INDEX IF NOT EXISTS idx_location_history_inspector_time
  ON public.inspector_location_history(inspector_id, recorded_at DESC);

-- Index for route-based queries
CREATE INDEX IF NOT EXISTS idx_location_history_route
  ON public.inspector_location_history(route_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.inspector_location_history ENABLE ROW LEVEL SECURITY;

-- Admins and dispatchers can read all location history
CREATE POLICY "admin_dispatcher_read_location_history" ON public.inspector_location_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
    OR public.is_admin_user()
  );

-- Inspectors can insert their own location
CREATE POLICY "inspector_insert_own_location" ON public.inspector_location_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspectors
      WHERE id = inspector_id
      AND email = auth.email()
    )
    OR public.is_admin_user()
  );

-- Inspectors can read their own history
CREATE POLICY "inspector_read_own_location" ON public.inspector_location_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspectors
      WHERE id = inspector_id
      AND email = auth.email()
    )
  );

-- Add comment
COMMENT ON TABLE public.inspector_location_history IS 'GPS location pings from inspectors for real-time tracking and trail visualization';
