-- ==========================================
-- QUICK TEST DATA - CREATE INSPECTORS
-- Run this entire script in Supabase SQL Editor
-- ==========================================

-- 1. Create Test Inspectors
DO $$
DECLARE
    nino_id UUID;
    giorgi_id UUID;
    tamar_id UUID;
    health_service_id UUID;
    fire_service_id UUID;
    building_service_id UUID;
BEGIN
    -- Insert inspectors and get their IDs
    INSERT INTO inspectors (full_name, email, phone, specialty, status) VALUES
    ('ნინო გელაშვილი', 'nino@geosafety.ge', '+995 555 111 222', 'health', 'active')
    RETURNING id INTO nino_id;
    
    INSERT INTO inspectors (full_name, email, phone, specialty, status) VALUES
    ('გიორგი მელაძე', 'giorgi@geosafety.ge', '+995 555 333 444', 'fire_safety', 'active')
    RETURNING id INTO giorgi_id;
    
    INSERT INTO inspectors (full_name, email, phone, specialty, status) VALUES
    ('თამარ ბერიძე', 'tamar@geosafety.ge', '+995 555 555 666', 'building', 'active')
    RETURNING id INTO tamar_id;
    
    -- Get service type IDs dynamically
    SELECT id INTO health_service_id 
    FROM service_types 
    WHERE name ILIKE '%ჯანდაცვა%' OR name ILIKE '%health%' 
    LIMIT 1;
    
    SELECT id INTO fire_service_id 
    FROM service_types 
    WHERE name ILIKE '%ხანძარ%' OR name ILIKE '%fire%' 
    LIMIT 1;
    
    SELECT id INTO building_service_id 
    FROM service_types 
    WHERE name ILIKE '%შენობა%' OR name ILIKE '%building%' 
    LIMIT 1;
    
    -- Assign companies to Nino (health inspector)
    IF health_service_id IS NOT NULL THEN
        UPDATE company_services 
        SET assigned_inspector_id = nino_id
        WHERE service_type_id = health_service_id
        AND assigned_inspector_id IS NULL
        AND id IN (
            SELECT id FROM company_services 
            WHERE service_type_id = health_service_id 
            LIMIT 15
        );
        
        RAISE NOTICE 'Assigned health companies to Nino';
    ELSE
        RAISE NOTICE 'No health service type found';
    END IF;
    
    -- Assign companies to Giorgi (fire safety inspector)
    IF fire_service_id IS NOT NULL THEN
        UPDATE company_services 
        SET assigned_inspector_id = giorgi_id
        WHERE service_type_id = fire_service_id
        AND assigned_inspector_id IS NULL
        AND id IN (
            SELECT id FROM company_services 
            WHERE service_type_id = fire_service_id 
            LIMIT 15
        );
        
        RAISE NOTICE 'Assigned fire safety companies to Giorgi';
    ELSE
        RAISE NOTICE 'No fire safety service type found';
    END IF;
    
    -- Assign companies to Tamar (building inspector)
    IF building_service_id IS NOT NULL THEN
        UPDATE company_services 
        SET assigned_inspector_id = tamar_id
        WHERE service_type_id = building_service_id
        AND assigned_inspector_id IS NULL
        AND id IN (
            SELECT id FROM company_services 
            WHERE service_type_id = building_service_id 
            LIMIT 15
        );
        
        RAISE NOTICE 'Assigned building companies to Tamar';
    ELSE
        RAISE NOTICE 'No building service type found';
    END IF;
    
    RAISE NOTICE '✅ Created inspectors and assigned companies!';
END $$;

-- 2. Verify the results
SELECT 
    i.full_name as inspector,
    i.specialty,
    i.email,
    COUNT(cs.id) as assigned_companies
FROM inspectors i
LEFT JOIN company_services cs ON cs.assigned_inspector_id = i.id
WHERE i.email LIKE '%@geosafety.ge'
GROUP BY i.id, i.full_name, i.specialty, i.email
ORDER BY i.full_name;

-- 3. Show sample assignments (with calculated days until due)
SELECT 
    i.full_name as inspector,
    st.name as service_type,
    c.name as company_name,
    cs.next_inspection_date,
    CASE 
        WHEN cs.next_inspection_date IS NULL THEN NULL
        ELSE cs.next_inspection_date - CURRENT_DATE
    END as days_until_due,
    cs.status
FROM company_services cs
JOIN inspectors i ON i.id = cs.assigned_inspector_id
JOIN companies c ON c.id = cs.company_id
JOIN service_types st ON st.id = cs.service_type_id
WHERE i.email LIKE '%@geosafety.ge'
ORDER BY i.full_name, 
    CASE 
        WHEN cs.next_inspection_date IS NULL THEN 999999
        ELSE cs.next_inspection_date - CURRENT_DATE
    END
LIMIT 20;

-- ==========================================
-- ✅ DONE! Next steps:
-- 1. Check the output above to verify inspectors created
-- 2. Test at: http://localhost:3001/routes/builder-v2
-- 3. Select an inspector and see their assigned companies
-- ==========================================
