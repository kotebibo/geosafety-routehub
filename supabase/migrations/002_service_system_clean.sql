-- Migration: Add Service System (SAFE - Idempotent)
-- Description: Implements multi-service inspection system
-- Version: 002_v2
-- Date: 2025-10-06

-- Drop existing objects if re-running
DROP TABLE IF EXISTS reassignment_history CASCADE;
DROP TABLE IF EXISTS inspection_history CASCADE;
DROP TABLE IF EXISTS company_services CASCADE;
DROP TABLE IF EXISTS service_types CASCADE;

-- =====================================================
-- 1. SERVICE TYPES TABLE
-- =====================================================
CREATE TABLE service_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  name_ka VARCHAR(255) NOT NULL,
  description TEXT,
  required_inspector_type VARCHAR(100),
  default_frequency_days INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_service_types_active ON service_types(is_active);
CREATE INDEX idx_service_types_inspector_type ON service_types(required_inspector_type);

-- =====================================================
-- 2. COMPANY SERVICES TABLE
-- =====================================================
CREATE TABLE company_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
  inspection_frequency_days INTEGER DEFAULT 90,
  last_inspection_date DATE,
  next_inspection_date DATE,
  assigned_inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  UNIQUE(company_id, service_type_id)
);

CREATE INDEX idx_company_services_company ON company_services(company_id);
CREATE INDEX idx_company_services_service_type ON company_services(service_type_id);
CREATE INDEX idx_company_services_inspector ON company_services(assigned_inspector_id);
CREATE INDEX idx_company_services_next_date ON company_services(next_inspection_date);
CREATE INDEX idx_company_services_status ON company_services(status);
CREATE INDEX idx_company_services_overdue ON company_services(next_inspection_date, status);

-- =====================================================
-- 3. INSPECTION HISTORY TABLE
-- =====================================================
CREATE TABLE inspection_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
  inspector_id UUID NOT NULL REFERENCES inspectors(id) ON DELETE RESTRICT,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  
  inspection_date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'skipped', 'in_progress', 'partial')),
  failure_reason TEXT,
  
  notes TEXT,
  photos TEXT[],
  gps_coordinates GEOGRAPHY(Point, 4326),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_inspection_history_company ON inspection_history(company_id);
CREATE INDEX idx_inspection_history_service ON inspection_history(service_type_id);
CREATE INDEX idx_inspection_history_inspector ON inspection_history(inspector_id);
CREATE INDEX idx_inspection_history_route ON inspection_history(route_id);
CREATE INDEX idx_inspection_history_date ON inspection_history(inspection_date DESC);
CREATE INDEX idx_inspection_history_status ON inspection_history(status);
CREATE INDEX idx_inspection_history_lookup ON inspection_history(company_id, service_type_id, inspection_date DESC);

-- =====================================================
-- 4. REASSIGNMENT HISTORY TABLE
-- =====================================================
CREATE TABLE reassignment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
  
  from_inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  to_inspector_id UUID NOT NULL REFERENCES inspectors(id) ON DELETE RESTRICT,
  
  reassigned_by_user_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  reassignment_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  reason TEXT,
  
  is_temporary BOOLEAN DEFAULT false,
  revert_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_reassignment_history_company ON reassignment_history(company_id);
CREATE INDEX idx_reassignment_history_service ON reassignment_history(service_type_id);
CREATE INDEX idx_reassignment_history_date ON reassignment_history(reassignment_date DESC);

-- =====================================================
-- 5. UPDATE INSPECTORS TABLE
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inspectors' AND column_name='specialty') THEN
    ALTER TABLE inspectors ADD COLUMN specialty VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inspectors' AND column_name='certifications') THEN
    ALTER TABLE inspectors ADD COLUMN certifications TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inspectors' AND column_name='certification_expiry_dates') THEN
    ALTER TABLE inspectors ADD COLUMN certification_expiry_dates JSONB;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_inspectors_specialty;
CREATE INDEX idx_inspectors_specialty ON inspectors(specialty);

-- =====================================================
-- 6. UPDATE ROUTES TABLE
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='routes' AND column_name='service_type_id') THEN
    ALTER TABLE routes ADD COLUMN service_type_id UUID REFERENCES service_types(id) ON DELETE RESTRICT;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_routes_service_type;
CREATE INDEX idx_routes_service_type ON routes(service_type_id);

-- =====================================================
-- 7. UPDATE COMPANIES TABLE
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='companies' AND column_name='assigned_inspector_id') THEN
    ALTER TABLE companies ADD COLUMN assigned_inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='companies' AND column_name='assignment_date') THEN
    ALTER TABLE companies ADD COLUMN assignment_date TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_companies_inspector;
CREATE INDEX idx_companies_inspector ON companies(assigned_inspector_id);

-- =====================================================
-- 8. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_service_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_types_updated_at ON service_types;
CREATE TRIGGER service_types_updated_at
  BEFORE UPDATE ON service_types
  FOR EACH ROW
  EXECUTE FUNCTION update_service_types_updated_at();

CREATE OR REPLACE FUNCTION update_company_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_services_updated_at ON company_services;
CREATE TRIGGER company_services_updated_at
  BEFORE UPDATE ON company_services
  FOR EACH ROW
  EXECUTE FUNCTION update_company_services_updated_at();

CREATE OR REPLACE FUNCTION update_inspection_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspection_history_updated_at ON inspection_history;
CREATE TRIGGER inspection_history_updated_at
  BEFORE UPDATE ON inspection_history
  FOR EACH ROW
  EXECUTE FUNCTION update_inspection_history_updated_at();

-- =====================================================
-- 9. TRIGGER FOR AUTO-CALCULATING DURATION
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_inspection_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspection_duration_calculator ON inspection_history;
CREATE TRIGGER inspection_duration_calculator
  BEFORE INSERT OR UPDATE ON inspection_history
  FOR EACH ROW
  EXECUTE FUNCTION calculate_inspection_duration();

-- =====================================================
-- 10. FUNCTION TO AUTO-UPDATE NEXT INSPECTION DATE
-- =====================================================
CREATE OR REPLACE FUNCTION update_next_inspection_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE company_services
    SET 
      last_inspection_date = NEW.inspection_date,
      next_inspection_date = NEW.inspection_date + (inspection_frequency_days || ' days')::INTERVAL
    WHERE 
      company_id = NEW.company_id 
      AND service_type_id = NEW.service_type_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_next_inspection ON inspection_history;
CREATE TRIGGER auto_update_next_inspection
  AFTER INSERT OR UPDATE ON inspection_history
  FOR EACH ROW
  EXECUTE FUNCTION update_next_inspection_date();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
