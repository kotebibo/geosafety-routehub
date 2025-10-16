# 🎯 QUICK SETUP GUIDE - START HERE!

## 📍 CURRENT STATUS
- **Project Location**: `D:\geosafety-routehub`
- **Progress**: 90% Complete
- **Next Task**: Create test inspectors → Build authentication
- **Supabase URL**: https://rjnraabxbpvonhowdfuc.supabase.co

---

## 🚀 STEP-BY-STEP INSTRUCTIONS

### **STEP 1: Create Test Inspectors (5 minutes)**

#### A. Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/rjnraabxbpvonhowdfuc
2. Click **"SQL Editor"** (left sidebar)
3. Click **"New Query"**

#### B. Copy & Paste This SQL (FIXED - NO ERRORS!)
```sql
-- Create 3 test inspectors
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
GROUP BY i.id, i.full_name, i.specialty;
```

#### C. Run the Query
- Click **"RUN"** or press `Ctrl + Enter`
- You should see 3 inspectors with company counts

---

### **STEP 2: Start Development Server**

Open PowerShell in project directory:
```powershell
cd D:\geosafety-routehub
npm run dev
```

Wait for: ✓ Ready on http://localhost:3001

---

### **STEP 3: Test Route Builder**

#### A. Open Route Builder
http://localhost:3001/routes/builder-v2

#### B. Test Workflow
1. Select inspector: **"ნინო გელაშვილი"** (Nino)
2. See list of assigned companies (should be ~15)
3. Select 5-6 companies with checkboxes
4. Click **"🚀 მარშრუტის ოპტიმიზაცია"** (Optimize Route)
5. Review optimized route on map
6. Click **"💾 მარშრუტის შენახვა"** (Save Route)
7. Fill modal:
   - Route name: "Test Route 1"
   - Start time: 09:00
   - Notes: (optional)
8. Click Save

#### C. Expected Result
✅ Route saved successfully  
✅ Map shows optimized path  
✅ Companies in order of visit

---

### **STEP 4: Test Route Management**

http://localhost:3001/routes/manage

#### What You Can Do
- ✅ View all saved routes
- ✅ Reassign route to different inspector
- ✅ Delete routes (with confirmation)
- ✅ See route details (stops, distance, status)

---

## ❌ TROUBLESHOOTING

### No Inspectors in Dropdown?
**Check if SQL ran successfully:**
```sql
SELECT * FROM inspectors WHERE email LIKE '%@geosafety.ge';
```

### No Companies Showing?
**Check service types names:**
```sql
SELECT id, name FROM service_types ORDER BY name;
```

**Then assign manually:**
```sql
-- Find inspector ID
SELECT id, full_name FROM inspectors;

-- Assign companies
UPDATE company_services 
SET assigned_inspector_id = 'YOUR_INSPECTOR_ID_HERE'
WHERE id IN (
    SELECT id FROM company_services 
    WHERE assigned_inspector_id IS NULL 
    LIMIT 15
);
```

### Dev Server Not Starting?
```powershell
# Kill existing processes
taskkill /F /IM node.exe

# Reinstall dependencies
npm install

# Try again
npm run dev
```

---

## ✅ AFTER SUCCESSFUL TESTING

Come back and say:
- **"✅ Testing works! Build authentication"** 
- OR **"❌ Error: [describe the issue]"**

---

## 📋 WHAT HAPPENS NEXT

Once testing is confirmed, I'll build:

### **Phase 5: Authentication (3 hours)**
1. ✅ Login/Logout system
2. ✅ Role-based access (Admin/Dispatcher/Inspector)
3. ✅ Admin can create inspector accounts
4. ✅ Inspectors see only their routes
5. ✅ Polish & final testing

**Result**: 100% Complete MVP! 🎉

---

## 📞 QUICK COMMANDS

```powershell
# Start dev server
cd D:\geosafety-routehub
npm run dev

# Check what's running
netstat -ano | findstr :3001

# Kill if stuck
taskkill /F /PID <PID_NUMBER>
```

---

**📍 YOU ARE HERE**: Create test inspectors → Test system → Build auth

**Ready?** Run the SQL above and test! 🚀
