-- Quick Fix: Spread Companies Around Tbilisi Map
-- This gives different coordinates to test companies so you can see markers

-- Company 1: Rustaveli Avenue area
UPDATE companies 
SET lat = 41.6934, lng = 44.8015, address = 'Rustaveli Avenue, Tbilisi'
WHERE id = (SELECT id FROM companies WHERE name = 'Name' ORDER BY created_at LIMIT 1 OFFSET 0);

-- Company 2: Saburtalo area  
UPDATE companies
SET lat = 41.7200, lng = 44.7550, address = 'Saburtalo, Tbilisi'
WHERE id = (SELECT id FROM companies WHERE name = 'Name' ORDER BY created_at LIMIT 1 OFFSET 1);

-- Company 3: Vake area
UPDATE companies
SET lat = 41.7050, lng = 44.7700, address = 'Vake Park, Tbilisi'
WHERE id = (SELECT id FROM companies WHERE name = 'Name' ORDER BY created_at LIMIT 1 OFFSET 2);

-- Company 4: Gldani area
UPDATE companies
SET lat = 41.7700, lng = 44.8100, address = 'Gldani, Tbilisi'
WHERE id = (SELECT id FROM companies WHERE name = 'Name' ORDER BY created_at LIMIT 1 OFFSET 3);

-- Company 5: Isani area
UPDATE companies
SET lat = 41.6900, lng = 44.8400, address = 'Isani Metro, Tbilisi'
WHERE id = (SELECT id FROM companies WHERE name = 'Name' ORDER BY created_at LIMIT 1 OFFSET 4);

-- Verify the changes
SELECT 
  name,
  address,
  lat,
  lng,
  CASE 
    WHEN lat = 41.7151 AND lng = 44.8271 THEN '⚠️ Default (all same)'
    ELSE '✅ Unique coordinates'
  END as status
FROM companies
WHERE name = 'Name'
ORDER BY created_at;
