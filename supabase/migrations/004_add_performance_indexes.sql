-- Performance Indexes for RLS Policies
-- These indexes improve query performance for RLS policy checks
-- Created: October 10, 2025

-- ==========================================
-- ROUTES TABLE INDEXES
-- ==========================================

-- Index for inspector-based route queries (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_routes_inspector_date 
  ON routes(inspector_id, date)
  WHERE inspector_id IS NOT NULL;

-- Index for route status filtering
CREATE INDEX IF NOT EXISTS idx_routes_status 
  ON routes(status);

-- Index for date-based queries (common in route management)
CREATE INDEX IF NOT EXISTS idx_routes_date 
  ON routes(date DESC);

-- ==========================================
-- ROUTE_STOPS TABLE INDEXES
-- ==========================================

-- Index for route stop lookups (CASCADE operations)
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id 
  ON route_stops(route_id, position);

-- Index for company-based queries
CREATE INDEX IF NOT EXISTS idx_route_stops_company_id 
  ON route_stops(company_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_route_stops_status 
  ON route_stops(status);

-- ==========================================
-- COMPANY_SERVICES TABLE INDEXES
-- ==========================================

-- Index for inspector assignment lookups (used in RLS)
CREATE INDEX IF NOT EXISTS idx_company_services_inspector 
  ON company_services(assigned_inspector_id)
  WHERE assigned_inspector_id IS NOT NULL;

-- Index for service type filtering
CREATE INDEX IF NOT EXISTS idx_company_services_type 
  ON company_services(service_type_id);

-- Index for company lookups
CREATE INDEX IF NOT EXISTS idx_company_services_company 
  ON company_services(company_id);

-- Index for next inspection date queries
CREATE INDEX IF NOT EXISTS idx_company_services_next_inspection 
  ON company_services(next_inspection_date)
  WHERE next_inspection_date IS NOT NULL;

-- ==========================================
-- INSPECTIONS TABLE INDEXES
-- ==========================================

-- Index for inspector-based queries (used in RLS)
CREATE INDEX IF NOT EXISTS idx_inspections_inspector 
  ON inspections(inspector_id)
  WHERE inspector_id IS NOT NULL;

-- Index for company inspections
CREATE INDEX IF NOT EXISTS idx_inspections_company 
  ON inspections(company_id);

-- Index for route-based inspections
CREATE INDEX IF NOT EXISTS idx_inspections_route 
  ON inspections(route_stop_id)
  WHERE route_stop_id IS NOT NULL;

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_inspections_date 
  ON inspections(inspection_date DESC);

-- ==========================================
-- INSPECTION_HISTORY TABLE INDEXES
-- ==========================================

-- Index for inspector history (used in RLS)
CREATE INDEX IF NOT EXISTS idx_inspection_history_inspector 
  ON inspection_history(inspector_id)
  WHERE inspector_id IS NOT NULL;

-- Index for company history
CREATE INDEX IF NOT EXISTS idx_inspection_history_company 
  ON inspection_history(company_id);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_inspection_history_date 
  ON inspection_history(inspection_date DESC);

-- ==========================================
-- INSPECTORS TABLE INDEXES
-- ==========================================

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_inspectors_status 
  ON inspectors(status);

-- Index for email lookups (unique constraint already exists)
-- CREATE INDEX IF NOT EXISTS idx_inspectors_email ON inspectors(email);

-- Index for zone-based queries
CREATE INDEX IF NOT EXISTS idx_inspectors_zone 
  ON inspectors(zone)
  WHERE zone IS NOT NULL;

-- ==========================================
-- COMPANIES TABLE INDEXES
-- ==========================================

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_companies_status 
  ON companies(status);

-- Index for priority filtering
CREATE INDEX IF NOT EXISTS idx_companies_priority 
  ON companies(priority);

-- Index for next inspection date
CREATE INDEX IF NOT EXISTS idx_companies_next_inspection 
  ON companies(next_inspection_date)
  WHERE next_inspection_date IS NOT NULL;

-- Spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_companies_location 
  ON companies USING GIST (location)
  WHERE location IS NOT NULL;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON INDEX idx_routes_inspector_date IS
'Improves performance for inspector-based route queries used in RLS policies';

COMMENT ON INDEX idx_route_stops_route_id IS
'Improves performance for CASCADE operations and route stop lookups';

COMMENT ON INDEX idx_company_services_inspector IS
'Improves performance for inspector assignment queries in RLS';

COMMENT ON INDEX idx_inspections_inspector IS
'Improves performance for inspector-based inspection queries in RLS';

COMMENT ON INDEX idx_companies_location IS
'Spatial index for location-based route optimization queries';
