# 🚀 HOW TO CREATE TEST INSPECTORS

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your GeoSafety project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

## Step 2: Copy & Paste This SQL

Copy everything below the line and paste into Supabase SQL Editor:

---

```sql
-- Create 3 test inspectors and assign companies to them
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
    
    -- Assign companies
    IF health_service_id IS NOT NULL THEN
        UPDATE company_services 
        SET assigned_inspector_id = nino_id
        WHERE service_type_id = health_service_id
        AND assigned_inspector_id IS NULL
        AND id IN (SELECT id FROM company_services WHERE service_type_id = health_service_id LIMIT 15);
    END IF;
    
    IF fire_service_id IS NOT NULL THEN
        UPDATE company_services 
        SET assigned_inspector_id = giorgi_id
        WHERE service_type_id = fire_service_id
        AND assigned_inspector_id IS NULL
        AND id IN (SELECT id FROM company_services WHERE service_type_id = fire_service_id LIMIT 15);
    END IF;
    
    IF building_service_id IS NOT NULL THEN
        UPDATE company_services 
        SET assigned_inspector_id = tamar_id
        WHERE service_type_id = building_service_id
        AND assigned_inspector_id IS NULL
        AND id IN (SELECT id FROM company_services WHERE service_type_id = building_service_id LIMIT 15);
    END IF;
    
    RAISE NOTICE '✅ Created 3 inspectors and assigned companies!';
END $$;

-- Verify results
SELECT 
    i.full_name as inspector,
    i.specialty,
    COUNT(cs.id) as assigned_companies
FROM inspectors i
LEFT JOIN company_services cs ON cs.assigned_inspector_id = i.id
WHERE i.email LIKE '%@geosafety.ge'
GROUP BY i.id, i.full_name, i.specialty
ORDER BY i.full_name;
```

## Step 3: Run the Query

Click the **"RUN"** button (or press Ctrl+Enter)

You should see:
- ✅ "Created 3 inspectors and assigned companies!"
- ✅ A table showing 3 inspectors with their assigned companies count

## Step 4: Test the System

Open your browser:
- http://localhost:3001/routes/builder-v2

You should now see 3 inspectors in the dropdown!

## 📊 Expected Results

```
Inspector Name          | Specialty    | Companies
------------------------|--------------|----------
ნინო გელაშვილი         | health       | ~15
გიორგი მელაძე          | fire_safety  | ~15  
თამარ ბერიძე           | building     | ~15
```

## ❌ Troubleshooting

**If you see 0 companies assigned:**
- Your service_types table might use different names
- Run this query to see your service types:
```sql
SELECT id, name FROM service_types;
```
- Then manually update the WHERE clauses in the main script

**If inspectors already exist:**
- Delete them first:
```sql
DELETE FROM inspectors WHERE email LIKE '%@geosafety.ge';
```
- Then run the main script again

## ✅ Next Steps

After successful testing:
1. Tell me: "✅ Inspectors created, ready for auth"
2. I'll build the authentication system next!
