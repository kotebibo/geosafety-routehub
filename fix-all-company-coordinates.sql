-- Update ALL companies named "Name" with unique coordinates
-- This will give each one a different location in Tbilisi

WITH numbered_companies AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM companies 
  WHERE name = 'Name'
)
UPDATE companies c
SET 
  lat = CASE 
    WHEN nc.rn = 1 THEN 41.6934  -- Rustaveli Avenue
    WHEN nc.rn = 2 THEN 41.7200  -- Saburtalo
    WHEN nc.rn = 3 THEN 41.7050  -- Vake Park
    WHEN nc.rn = 4 THEN 41.7700  -- Gldani
    WHEN nc.rn = 5 THEN 41.6900  -- Isani
    ELSE 41.7151 + (RANDOM() * 0.05 - 0.025)  -- Random nearby for any extras
  END,
  lng = CASE 
    WHEN nc.rn = 1 THEN 44.8015  -- Rustaveli Avenue
    WHEN nc.rn = 2 THEN 44.7550  -- Saburtalo
    WHEN nc.rn = 3 THEN 44.7700  -- Vake Park
    WHEN nc.rn = 4 THEN 44.8100  -- Gldani
    WHEN nc.rn = 5 THEN 44.8400  -- Isani
    ELSE 44.8271 + (RANDOM() * 0.05 - 0.025)  -- Random nearby for any extras
  END,
  address = CASE 
    WHEN nc.rn = 1 THEN 'Rustaveli Avenue, Tbilisi'
    WHEN nc.rn = 2 THEN 'Saburtalo District, Tbilisi'
    WHEN nc.rn = 3 THEN 'Vake Park, Tbilisi'
    WHEN nc.rn = 4 THEN 'Gldani District, Tbilisi'
    WHEN nc.rn = 5 THEN 'Isani Metro Station, Tbilisi'
    ELSE 'Tbilisi, Georgia'
  END
FROM numbered_companies nc
WHERE c.id = nc.id;

-- Verify the update
SELECT 
  name,
  address,
  ROUND(lat::numeric, 4) as lat,
  ROUND(lng::numeric, 4) as lng,
  CASE 
    WHEN lat = 41.7151 AND lng = 44.8271 THEN '⚠️ Still default'
    ELSE '✅ Updated!'
  END as status
FROM companies
WHERE name = 'Name'
ORDER BY created_at;
