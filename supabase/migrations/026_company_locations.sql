-- Migration: Company Multi-Location Support
-- Description: Adds support for companies with multiple locations/branches

-- ============================================
-- 1. Create company_locations table
-- ============================================

CREATE TABLE IF NOT EXISTS company_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Main Office", "Branch #1", "Tbilisi Mall Store"
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_primary BOOLEAN DEFAULT false,      -- Mark one as the main/HQ location
  contact_name TEXT,                     -- Location-specific contact (optional)
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by company
CREATE INDEX IF NOT EXISTS idx_company_locations_company_id ON company_locations(company_id);

-- Index for finding primary locations quickly
CREATE INDEX IF NOT EXISTS idx_company_locations_primary ON company_locations(company_id, is_primary) WHERE is_primary = true;

-- ============================================
-- 2. Migrate existing company addresses
-- ============================================

-- For each company that has an address, create a primary location
INSERT INTO company_locations (company_id, name, address, lat, lng, is_primary, created_at, updated_at)
SELECT 
  id as company_id,
  'მთავარი ოფისი' as name,  -- "Main Office" in Georgian
  COALESCE(address, 'მისამართი არ არის მითითებული') as address,  -- "Address not specified"
  lat,
  lng,
  true as is_primary,
  COALESCE(created_at, NOW()) as created_at,
  NOW() as updated_at
FROM companies
WHERE address IS NOT NULL AND address != ''
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. Ensure exactly one primary per company
-- ============================================

-- Function to ensure only one primary location per company
CREATE OR REPLACE FUNCTION ensure_single_primary_location()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this location as primary, unset all others for this company
  IF NEW.is_primary = true THEN
    UPDATE company_locations 
    SET is_primary = false 
    WHERE company_id = NEW.company_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single primary constraint
DROP TRIGGER IF EXISTS trg_ensure_single_primary_location ON company_locations;
CREATE TRIGGER trg_ensure_single_primary_location
  BEFORE INSERT OR UPDATE OF is_primary ON company_locations
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_location();

-- ============================================
-- 4. Auto-update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_company_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_locations_updated_at ON company_locations;
CREATE TRIGGER trg_company_locations_updated_at
  BEFORE UPDATE ON company_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_company_locations_updated_at();

-- ============================================
-- 5. Row Level Security (RLS)
-- ============================================

ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read locations
CREATE POLICY "company_locations_select_policy" ON company_locations
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert locations
CREATE POLICY "company_locations_insert_policy" ON company_locations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update locations
CREATE POLICY "company_locations_update_policy" ON company_locations
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete locations
CREATE POLICY "company_locations_delete_policy" ON company_locations
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- 6. Helper function to get primary location
-- ============================================

CREATE OR REPLACE FUNCTION get_company_primary_location(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.name,
    cl.address,
    cl.lat,
    cl.lng
  FROM company_locations cl
  WHERE cl.company_id = p_company_id
    AND cl.is_primary = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. View for companies with location count
-- ============================================

CREATE OR REPLACE VIEW companies_with_location_count AS
SELECT 
  c.*,
  COALESCE(loc_count.count, 0) as location_count,
  pl.id as primary_location_id,
  pl.name as primary_location_name,
  pl.address as primary_location_address
FROM companies c
LEFT JOIN (
  SELECT company_id, COUNT(*) as count
  FROM company_locations
  GROUP BY company_id
) loc_count ON loc_count.company_id = c.id
LEFT JOIN company_locations pl ON pl.company_id = c.id AND pl.is_primary = true;

-- Grant access to the view
GRANT SELECT ON companies_with_location_count TO authenticated;
GRANT SELECT ON companies_with_location_count TO anon;
