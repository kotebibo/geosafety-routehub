# 🎯 APPLY DATABASE MIGRATION - STEP BY STEP

## 📋 INSTRUCTIONS:

### **Step 1: Open Supabase SQL Editor**

Go to: **https://supabase.com/dashboard/project/rjnraabxbpvonhowdfuc/sql/new**

Or:
1. Go to https://supabase.com/dashboard
2. Select your project: "geosafety-routehub"
3. Click "SQL Editor" in left sidebar
4. Click "New query"

---

### **Step 2: Copy Migration File**

Open this file: `D:\geosafety-routehub\supabase\migrations\002_service_system.sql`

Copy the ENTIRE contents (all 310 lines)

---

### **Step 3: Paste and Run**

1. Paste into the SQL Editor
2. Click "RUN" button (bottom right)
3. Wait for completion (~2-5 seconds)

**Expected Result**: "Success. No rows returned"

---

### **Step 4: Verify Tables Created**

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'service_types', 
  'company_services', 
  'inspection_history', 
  'reassignment_history'
)
ORDER BY table_name;
```

**Expected Result**: 4 rows showing the new tables

---

### **Step 5: Seed Service Types**

Run this command in your terminal:

```bash
cd D:\geosafety-routehub
npm run seed:services
```

**Expected Output**:
```
✅ Created: Fire Safety Inspection
✅ Created: Health Inspection
✅ Created: Building Code Inspection
... (8 total)
✅ Success: 8/8
```

---

### **Step 6: Migrate Existing Companies**

Run this command:

```bash
npm run migrate:services
```

**Expected Output**:
```
✅ Found General Inspection service
📦 Found 216 companies to migrate
✅ Company 1
✅ Company 2
... (216 total)
✅ Migrated: 216/216
```

---

### **Step 7: Verify Migration**

Run this query in Supabase SQL Editor:

```sql
-- Check service types
SELECT COUNT(*) as service_types_count FROM service_types;
-- Should return: 8

-- Check company services
SELECT COUNT(*) as company_services_count FROM company_services;
-- Should return: 216

-- Check a sample
SELECT 
  c.name,
  st.name_ka as service,
  cs.next_inspection_date
FROM company_services cs
JOIN companies c ON c.id = cs.company_id
JOIN service_types st ON st.id = cs.service_type_id
LIMIT 5;
-- Should return 5 companies with their services
```

---

## ✅ SUCCESS CRITERIA:

When done, you should have:
- ✅ 4 new tables created
- ✅ 8 service types
- ✅ 216 company services (one per company)
- ✅ All existing data preserved

---

## 🚨 IF SOMETHING GOES WRONG:

**Error: "relation already exists"**
- Tables already exist, skip to Step 5

**Error: "permission denied"**
- Make sure you're logged into correct Supabase account

**Error during seed/migrate scripts**:
- Check that migration ran successfully first
- Check .env.local has correct Supabase credentials

---

## 📞 TELL ME WHEN DONE:

After completing all steps, tell me:
1. ✅ Migration applied
2. ✅ Service types seeded
3. ✅ Companies migrated

Then I'll continue to **Phase 2: Service Management UI**! 🚀
