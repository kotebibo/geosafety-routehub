-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Complete security implementation for production
-- ==========================================

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Get current user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is admin or dispatcher
CREATE OR REPLACE FUNCTION auth.is_admin_or_dispatcher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'dispatcher')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is inspector
CREATE OR REPLACE FUNCTION auth.is_inspector()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'inspector'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get inspector_id for current user
CREATE OR REPLACE FUNCTION auth.current_inspector_id()
RETURNS UUID AS $$
  SELECT inspector_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ==========================================
-- COMPANIES TABLE - RLS POLICIES
-- ==========================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read companies
CREATE POLICY "All authenticated users can read companies"
  ON companies FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Admins and dispatchers can insert companies
CREATE POLICY "Admins and dispatchers can insert companies"
  ON companies FOR INSERT
  WITH CHECK (auth.is_admin_or_dispatcher());

-- Policy: Admins and dispatchers can update companies
CREATE POLICY "Admins and dispatchers can update companies"
  ON companies FOR UPDATE
  USING (auth.is_admin_or_dispatcher())
  WITH CHECK (auth.is_admin_or_dispatcher());

-- Policy: Only admins can delete companies
CREATE POLICY "Only admins can delete companies"
  ON companies FOR DELETE
  USING (auth.is_admin());

-- ==========================================
-- INSPECTORS TABLE - RLS POLICIES
-- ==========================================

ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read inspectors
CREATE POLICY "All authenticated users can read inspectors"
  ON inspectors FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Admins can insert inspectors
CREATE POLICY "Admins can insert inspectors"
  ON inspectors FOR INSERT
  WITH CHECK (auth.is_admin());

-- Policy: Admins can update all, inspectors can update their own
CREATE POLICY "Admins and own inspector can update"
  ON inspectors FOR UPDATE
  USING (
    auth.is_admin() OR 
    id = auth.current_inspector_id()
  )
  WITH CHECK (
    auth.is_admin() OR 
    id = auth.current_inspector_id()
  );

-- Policy: Only admins can delete inspectors
CREATE POLICY "Only admins can delete inspectors"
  ON inspectors FOR DELETE
  USING (auth.is_admin());

-- ==========================================
-- ROUTES TABLE - RLS POLICIES
-- ==========================================

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read routes
-- (Inspectors see all routes for coordination)
CREATE POLICY "All authenticated users can read routes"
  ON routes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Admins and dispatchers can insert routes
CREATE POLICY "Admins and dispatchers can insert routes"
  ON routes FOR INSERT
  WITH CHECK (auth.is_admin_or_dispatcher());

-- Policy: Admins and dispatchers can update all routes
-- Inspectors can update their own routes (status, times, etc.)
CREATE POLICY "Admins, dispatchers, and assigned inspector can update routes"
  ON routes FOR UPDATE
  USING (
    auth.is_admin_or_dispatcher() OR
    (auth.is_inspector() AND inspector_id = auth.current_inspector_id())
  )
  WITH CHECK (
    auth.is_admin_or_dispatcher() OR
    (auth.is_inspector() AND inspector_id = auth.current_inspector_id())
  );

-- Policy: Only admins and dispatchers can delete routes
CREATE POLICY "Admins and dispatchers can delete routes"
  ON routes FOR DELETE
  USING (auth.is_admin_or_dispatcher());

-- ==========================================
-- ROUTE_STOPS TABLE - RLS POLICIES
-- ==========================================

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read route stops
CREATE POLICY "All authenticated users can read route stops"
  ON route_stops FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Admins and dispatchers can insert route stops
CREATE POLICY "Admins and dispatchers can insert route stops"
  ON route_stops FOR INSERT
  WITH CHECK (auth.is_admin_or_dispatcher());

-- Policy: Admins, dispatchers, and assigned inspector can update
CREATE POLICY "Admins, dispatchers, and assigned inspector can update stops"
  ON route_stops FOR UPDATE
  USING (
    auth.is_admin_or_dispatcher() OR
    (
      auth.is_inspector() AND
      EXISTS (
        SELECT 1 FROM routes 
        WHERE routes.id = route_stops.route_id 
        AND routes.inspector_id = auth.current_inspector_id()
      )
    )
  )
  WITH CHECK (
    auth.is_admin_or_dispatcher() OR
    (
      auth.is_inspector() AND
      EXISTS (
        SELECT 1 FROM routes 
        WHERE routes.id = route_stops.route_id 
        AND routes.inspector_id = auth.current_inspector_id()
      )
    )
  );

-- Policy: Only admins and dispatchers can delete route stops
CREATE POLICY "Admins and dispatchers can delete route stops"
  ON route_stops FOR DELETE
  USING (auth.is_admin_or_dispatcher());

-- ==========================================
-- INSPECTIONS TABLE - RLS POLICIES
-- ==========================================

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read inspections
CREATE POLICY "All authenticated users can read inspections"
  ON inspections FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Admins, dispatchers, and inspectors can insert
CREATE POLICY "Admins, dispatchers, and inspectors can insert inspections"
  ON inspections FOR INSERT
  WITH CHECK (
    auth.is_admin_or_dispatcher() OR
    (auth.is_inspector() AND inspector_id = auth.current_inspector_id())
  );

-- Policy: Admins, dispatchers, and own inspector can update
CREATE POLICY "Admins, dispatchers, and own inspector can update inspections"
  ON inspections FOR UPDATE
  USING (
    auth.is_admin_or_dispatcher() OR
    (auth.is_inspector() AND inspector_id = auth.current_inspector_id())
  )
  WITH CHECK (
    auth.is_admin_or_dispatcher() OR
    (auth.is_inspector() AND inspector_id = auth.current_inspector_id())
  );

-- Policy: Only admins can delete inspections
CREATE POLICY "Only admins can delete inspections"
  ON inspections FOR DELETE
  USING (auth.is_admin());

-- ==========================================
-- COMPANY_SERVICES TABLE - RLS POLICIES
-- (If exists from service system migration)
-- ==========================================

-- Enable RLS if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_services') THEN
    ALTER TABLE company_services ENABLE ROW LEVEL SECURITY;
    
    -- All authenticated users can read
    CREATE POLICY "All authenticated users can read company services"
      ON company_services FOR SELECT
      USING (auth.uid() IS NOT NULL);
    
    -- Admins and dispatchers can manage
    CREATE POLICY "Admins and dispatchers can manage company services"
      ON company_services FOR ALL
      USING (auth.is_admin_or_dispatcher())
      WITH CHECK (auth.is_admin_or_dispatcher());
  END IF;
END $$;

-- ==========================================
-- SERVICE_TYPES TABLE - RLS POLICIES
-- (If exists from service system migration)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_types') THEN
    ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
    
    -- All authenticated users can read
    CREATE POLICY "All authenticated users can read service types"
      ON service_types FOR SELECT
      USING (auth.uid() IS NOT NULL);
    
    -- Only admins can manage
    CREATE POLICY "Only admins can manage service types"
      ON service_types FOR ALL
      USING (auth.is_admin())
      WITH CHECK (auth.is_admin());
  END IF;
END $$;

-- ==========================================
-- INSPECTION_HISTORY TABLE - RLS POLICIES
-- (If exists from service system migration)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inspection_history') THEN
    ALTER TABLE inspection_history ENABLE ROW LEVEL SECURITY;
    
    -- All authenticated users can read
    CREATE POLICY "All authenticated users can read inspection history"
      ON inspection_history FOR SELECT
      USING (auth.uid() IS NOT NULL);
    
    -- Admins, dispatchers, and own inspector can insert
    CREATE POLICY "Admins, dispatchers, and inspectors can insert history"
      ON inspection_history FOR INSERT
      WITH CHECK (
        auth.is_admin_or_dispatcher() OR
        (auth.is_inspector() AND inspector_id = auth.current_inspector_id())
      );
    
    -- Admins, dispatchers, and own inspector can update
    CREATE POLICY "Admins, dispatchers, and own inspector can update history"
      ON inspection_history FOR UPDATE
      USING (
        auth.is_admin_or_dispatcher() OR
        (auth.is_inspector() AND inspector_id = auth.current_inspector_id())
      )
      WITH CHECK (
        auth.is_admin_or_dispatcher() OR
        (auth.is_inspector() AND inspector_id = auth.current_inspector_id())
      );
    
    -- Only admins can delete
    CREATE POLICY "Only admins can delete inspection history"
      ON inspection_history FOR DELETE
      USING (auth.is_admin());
  END IF;
END $$;

-- ==========================================
-- GRANT PERMISSIONS
-- ==========================================

-- Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION auth.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin_or_dispatcher() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_inspector() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.current_inspector_id() TO authenticated;

-- ==========================================
-- VERIFICATION QUERIES
-- Run these to verify policies are working
-- ==========================================

-- Check all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Test as different roles
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claims" TO '{"sub": "USER_ID_HERE"}';

-- ==========================================
-- SECURITY SUMMARY
-- ==========================================

/*
ROLE PERMISSIONS:

ADMIN:
  - Full access to all tables (CRUD)
  - Can manage users and roles
  - Can delete any record

DISPATCHER:
  - Read all data
  - Create/update companies, routes, route_stops
  - Cannot delete companies, inspectors
  - Cannot manage users/roles

INSPECTOR:
  - Read all data (for coordination)
  - Update own inspector profile
  - Update own routes and stops
  - Create/update own inspections
  - Cannot create routes or assign work
  - Cannot delete anything

ALL AUTHENTICATED:
  - Can read all operational data
  - Enables coordination and transparency
  - Write access controlled by role
*/

-- ==========================================
-- DONE! All tables now have RLS policies
-- ==========================================
