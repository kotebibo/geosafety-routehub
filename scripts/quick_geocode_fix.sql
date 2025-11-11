-- Quick SQL-based geocoding fix for GeoSafety RouteHub
-- This updates coordinates for companies based on common Georgian city patterns

-- First, let's see how many companies need geocoding
SELECT 
    COUNT(*) as total_companies,
    COUNT(*) FILTER (WHERE lat IS NULL OR lat = 41.71510000) as needs_geocoding
FROM companies;

-- Update coordinates based on address patterns
-- Tbilisi addresses
UPDATE companies 
SET lat = 41.7151, lng = 44.8271
WHERE (lat IS NULL OR lat = 41.71510000)
  AND (address ILIKE '%თბილისი%' OR address ILIKE '%tbilisi%');

-- Rustavi
UPDATE companies 
SET lat = 41.5492, lng = 44.9939
WHERE (lat IS NULL OR lat = 41.71510000)
  AND address ILIKE '%რუსთავი%';

-- Gori
UPDATE companies 
SET lat = 41.9843, lng = 44.1091
WHERE (lat IS NULL OR lat = 41.71510000)
  AND address ILIKE '%გორი%';

-- Batumi
UPDATE companies 
SET lat = 41.6168, lng = 41.6367
WHERE (lat IS NULL OR lat = 41.71510000)
  AND address ILIKE '%ბათუმი%';

-- Kutaisi
UPDATE companies 
SET lat = 42.2488, lng = 42.7002
WHERE (lat IS NULL OR lat = 41.71510000)
  AND address ILIKE '%ქუთაისი%';

-- Zugdidi
UPDATE companies 
SET lat = 42.5088, lng = 41.8706
WHERE (lat IS NULL OR lat = 41.71510000)
  AND address ILIKE '%ზუგდიდი%';

-- Gardabani (you have companies there)
UPDATE companies 
SET lat = 41.4605, lng = 45.0962
WHERE (lat IS NULL OR lat = 41.71510000)
  AND address ILIKE '%გარდაბანი%';

-- Verify results
SELECT 
    COUNT(*) as total_companies,
    COUNT(*) FILTER (WHERE lat IS NULL) as null_coords,
    COUNT(*) FILTER (WHERE lat = 41.71510000) as default_coords,
    COUNT(*) FILTER (WHERE lat != 41.71510000 AND lat IS NOT NULL) as geocoded_coords
FROM companies;

-- Show sample of geocoded companies
SELECT name, address, lat, lng
FROM companies
WHERE lat IS NOT NULL AND lat != 41.71510000
LIMIT 10;
