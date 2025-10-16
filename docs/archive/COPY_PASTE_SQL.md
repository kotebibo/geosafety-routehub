# 🚀 COPY THIS SQL - NO ERRORS!

## Open Supabase SQL Editor and paste this:

```sql
-- Create 3 test inspectors and assign companies
DO $$
DECLARE
    nino_id UUID;
    giorgi_id UUID;
    tamar_id UUID;
    health_service_id UUID;
    fire_service_id UUID;
    building_service_id UUID;
BEGIN
    -- Create inspectors
    INSERT INTO inspectors (full_name, email, phone, specialty, status) VALUES
    ('ნინო გელაშვილი', 'nino@geosafety.ge', '+995 555 111 222', 'health', 'active')
    RETURNING id INTO nino_id;
    
    INSERT INTO inspectors (full_name, email, phone, specialty, status) VALUES
    ('გიორგი მელაძე', 'giorgi@geosafety.ge', '+995 555 333 444', 'fire_safety', 'active')
    RETURNING id INTO giorgi_id;
    
    INSERT INTO inspectors (full_name, email, phone, specialty, status) VALUES
    ('თამარ ბერიძე', 'tamar@geosafety.ge', '+995 555 555 666', 'building', 'active')
    RETURNING id INTO tamar_id;
    
    -- Find service types
    SELECT id INTO health_service_id FROM service_types 
    WHERE name ILIKE '%ჯანდაცვა%' OR name ILIKE '%health%' LIMIT 1;
    
    SELECT id INTO fire_service_id FROM service_types 
    WHERE name ILIKE '%ხანძარ%' OR name ILIKE '%fire%' LIMIT 1;
    
    SELECT id INTO building_service_id FROM service_types 
    WHERE name ILIKE '%შენობა%' OR name ILIKE '%building%' LIMIT 1;
    
    -- Assign companies
    IF health_service_id IS NOT NULL THEN
        UPDATE company_services SET assigned_inspector_id = nino_id
        WHERE service_type_id = health_service_id
        AND assigned_inspector_id IS NULL
        AND id IN (SELECT id FROM company_services WHERE service_type_id = health_service_id LIMIT 15);
    END IF;
    
    IF fire_service_id IS NOT NULL THEN
        UPDATE company_services SET assigned_inspector_id = giorgi_id
        WHERE service_type_id = fire_service_id
        AND assigned_inspector_id IS NULL
        AND id IN (SELECT id FROM company_services WHERE service_type_id = fire_service_id LIMIT 15);
    END IF;
    
    IF building_service_id IS NOT NULL THEN
        UPDATE company_services SET assigned_inspector_id = tamar_id
        WHERE service_type_id = building_service_id
        AND assigned_inspector_id IS NULL
        AND id IN (SELECT id FROM company_services WHERE service_type_id = building_service_id LIMIT 15);
    END IF;
    
    RAISE NOTICE '✅ Created inspectors and assigned companies!';
END $$;

-- Verify
SELECT i.full_name, i.specialty, COUNT(cs.id) as companies
FROM inspectors i
LEFT JOIN company_services cs ON cs.assigned_inspector_id = i.id
WHERE i.email LIKE '%@geosafety.ge'
GROUP BY i.id, i.full_name, i.specialty
ORDER BY i.full_name;
```

## Expected Result:
```
full_name           | specialty    | companies
--------------------|--------------|----------
გიორგი მელაძე       | fire_safety  | 15
თამარ ბერიძე        | building     | 15
ნინო გელაშვილი      | health       | 15
```

## Next: Test at http://localhost:3001/routes/builder-v2

## If 0 companies assigned:
Run this to see your service type names:
```sql
SELECT id, name, name_ka FROM service_types;
```

Then adjust the ILIKE patterns in the main SQL above.
