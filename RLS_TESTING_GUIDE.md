# 🧪 RLS POLICY TESTING GUIDE

## 📋 Overview

This guide provides step-by-step instructions for testing Row Level Security (RLS) policies in GeoSafety RouteHub.

---

## 🎯 Test Objectives

1. Verify RLS policies work correctly for each role
2. Ensure data isolation between users
3. Confirm no unauthorized access possible
4. Validate policy performance

---

## 🔧 Test Setup

### **Prerequisites:**
- Supabase project running
- Test users created for each role
- Sample data in all tables

### **Test Users Needed:**
```sql
-- Create test users in Supabase Auth Dashboard or via SQL:
-- 1. admin@test.geosafety.ge    (Admin)
-- 2. dispatcher@test.geosafety.ge (Dispatcher)
-- 3. inspector1@test.geosafety.ge (Inspector)
-- 4. inspector2@test.geosafety.ge (Inspector)
```

### **Assign Roles:**
```sql
-- Insert user roles
INSERT INTO user_roles (user_id, role, inspector_id) VALUES
  ('admin-uuid-here', 'admin', NULL),
  ('dispatcher-uuid-here', 'dispatcher', NULL),
  ('inspector1-uuid-here', 'inspector', 'inspector1-id'),
  ('inspector2-uuid-here', 'inspector', 'inspector2-id');
```

---

## 📊 TEST MATRIX

### Legend:
- ✅ Should succeed
- ❌ Should fail
- 🔍 Should see own data only
- 👁️ Should see all data

---

## 🧪 TEST SCENARIOS

### **1. COMPANIES TABLE**

#### **Test 1.1: Read Companies**
```sql
-- Login as each role and run:
SELECT * FROM companies;
```

**Expected Results:**
- Admin: ✅ 👁️ See all companies
- Dispatcher: ✅ 👁️ See all companies
- Inspector: ✅ 👁️ See all companies
- Unauthenticated: ❌ No access

---

#### **Test 1.2: Create Company**
```sql
-- Login as each role and run:
INSERT INTO companies (name, address, lat, lng)
VALUES ('Test Company', '123 Test St', 41.7151, 44.8271)
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success
- Dispatcher: ✅ Success
- Inspector: ❌ Fail (403 Forbidden)
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

#### **Test 1.3: Update Company**
```sql
-- Login as each role and run:
UPDATE companies 
SET name = 'Updated Company' 
WHERE id = 'existing-company-id'
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success
- Dispatcher: ✅ Success
- Inspector: ❌ Fail (403 Forbidden)
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

#### **Test 1.4: Delete Company**
```sql
-- Login as each role and run:
DELETE FROM companies 
WHERE id = 'test-company-id'
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success
- Dispatcher: ❌ Fail (403 Forbidden)
- Inspector: ❌ Fail (403 Forbidden)
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

### **2. INSPECTORS TABLE**

#### **Test 2.1: Read Inspectors**
```sql
SELECT * FROM inspectors;
```

**Expected Results:**
- Admin: ✅ 👁️ See all inspectors
- Dispatcher: ✅ 👁️ See all inspectors
- Inspector: ✅ 👁️ See all inspectors (for coordination)
- Unauthenticated: ❌ No access

---

#### **Test 2.2: Create Inspector**
```sql
INSERT INTO inspectors (email, full_name, status)
VALUES ('newguy@geosafety.ge', 'New Inspector', 'active')
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success
- Dispatcher: ❌ Fail (403 Forbidden)
- Inspector: ❌ Fail (403 Forbidden)
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

#### **Test 2.3: Update Own Profile**
```sql
-- Inspector updates their own profile:
UPDATE inspectors 
SET phone = '+995555123456'
WHERE id = auth.current_inspector_id()
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success (can update any)
- Dispatcher: ❌ Fail (403 Forbidden)
- Inspector: ✅ Success (own profile only)
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

#### **Test 2.4: Update Other Inspector**
```sql
-- Try to update another inspector:
UPDATE inspectors 
SET phone = '+995555123456'
WHERE id = 'different-inspector-id'
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success
- Dispatcher: ❌ Fail (403 Forbidden)
- Inspector: ❌ Fail (403 Forbidden) - Cannot update others
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

### **3. ROUTES TABLE**

#### **Test 3.1: Read All Routes**
```sql
SELECT * FROM routes;
```

**Expected Results:**
- Admin: ✅ 👁️ See all routes
- Dispatcher: ✅ 👁️ See all routes
- Inspector: ✅ 👁️ See all routes (for coordination)
- Unauthenticated: ❌ No access

---

#### **Test 3.2: Create Route**
```sql
INSERT INTO routes (name, date, inspector_id, status)
VALUES ('Test Route', '2025-10-15', 'inspector-id', 'planned')
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success
- Dispatcher: ✅ Success
- Inspector: ❌ Fail (403 Forbidden)
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

#### **Test 3.3: Update Assigned Route**
```sql
-- Inspector updates their own route:
UPDATE routes 
SET status = 'in_progress'
WHERE id = 'route-id' AND inspector_id = auth.current_inspector_id()
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success (can update any)
- Dispatcher: ✅ Success (can update any)
- Inspector: ✅ Success (own routes only)
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

#### **Test 3.4: Update Other Inspector's Route**
```sql
-- Try to update another inspector's route:
UPDATE routes 
SET status = 'completed'
WHERE id = 'other-inspector-route-id'
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success
- Dispatcher: ✅ Success
- Inspector: ❌ Fail (403 Forbidden) - Cannot update others' routes
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

### **4. USER_ROLES TABLE**

#### **Test 4.1: Read Own Role**
```sql
SELECT * FROM user_roles WHERE user_id = auth.uid();
```

**Expected Results:**
- Admin: ✅ 🔍 See own role
- Dispatcher: ✅ 🔍 See own role
- Inspector: ✅ 🔍 See own role
- Unauthenticated: ❌ No access

---

#### **Test 4.2: Read Other Users' Roles**
```sql
SELECT * FROM user_roles WHERE user_id != auth.uid();
```

**Expected Results:**
- Admin: ✅ 👁️ See all roles
- Dispatcher: ❌ See nothing
- Inspector: ❌ See nothing
- Unauthenticated: ❌ No access

---

#### **Test 4.3: Change User Role**
```sql
UPDATE user_roles 
SET role = 'admin'
WHERE user_id = 'target-user-id'
RETURNING *;
```

**Expected Results:**
- Admin: ✅ Success
- Dispatcher: ❌ Fail (403 Forbidden)
- Inspector: ❌ Fail (403 Forbidden)
- Unauthenticated: ❌ Fail (401 Unauthorized)

---

## 🔍 ADVANCED TESTS

### **Test 5: Policy Bypass Attempts**

#### **Test 5.1: SQL Injection in RLS**
```sql
-- Try to bypass RLS with SQL injection:
SELECT * FROM companies WHERE id = '1' OR '1'='1';
```

**Expected:** ✅ RLS still applies, no bypass

---

#### **Test 5.2: Direct Table Access**
```sql
-- Try to access table without authentication:
-- (Use unauthenticated Supabase client)
SELECT * FROM companies;
```

**Expected:** ❌ 401 Unauthorized

---

#### **Test 5.3: Role Escalation**
```sql
-- Inspector tries to escalate privileges:
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = auth.uid();
```

**Expected:** ❌ 403 Forbidden

---

## 📊 TEST RESULTS TRACKING

### Test Execution Checklist:

**Companies:**
- [ ] Test 1.1: Read (All roles)
- [ ] Test 1.2: Create (Admin/Dispatcher only)
- [ ] Test 1.3: Update (Admin/Dispatcher only)
- [ ] Test 1.4: Delete (Admin only)

**Inspectors:**
- [ ] Test 2.1: Read (All roles)
- [ ] Test 2.2: Create (Admin only)
- [ ] Test 2.3: Update Own (Admin + Own Inspector)
- [ ] Test 2.4: Update Other (Admin only)

**Routes:**
- [ ] Test 3.1: Read (All roles)
- [ ] Test 3.2: Create (Admin/Dispatcher)
- [ ] Test 3.3: Update Assigned (Admin/Dispatcher + Own Inspector)
- [ ] Test 3.4: Update Other (Admin/Dispatcher only)

**User Roles:**
- [ ] Test 4.1: Read Own (All authenticated)
- [ ] Test 4.2: Read Others (Admin only)
- [ ] Test 4.3: Change Role (Admin only)

**Security:**
- [ ] Test 5.1: SQL Injection
- [ ] Test 5.2: Unauthenticated Access
- [ ] Test 5.3: Role Escalation

---

## 🚨 ISSUE REPORTING

### If a test fails:

1. **Document the failure:**
   ```
   Test: [Test Number and Name]
   Role: [User Role]
   Expected: [Expected Result]
   Actual: [What happened]
   Error: [Error message if any]
   ```

2. **Check policy:**
   - Review RLS policy SQL
   - Check helper functions
   - Verify user role assignment

3. **Fix and retest:**
   - Update policy if needed
   - Create migration
   - Re-run all tests

---

## ✅ SUCCESS CRITERIA

**All tests must pass with expected results before production deployment.**

- ✅ All roles have appropriate access
- ✅ No unauthorized access possible
- ✅ Data isolation works correctly
- ✅ Security bypass attempts fail
- ✅ Performance is acceptable (<100ms for policy checks)

---

## 📝 AUTOMATED TESTING SCRIPT

Save this as `test-rls-policies.sql`:

```sql
-- RLS Policy Automated Test Script
-- Run this script for each test user role

BEGIN;

-- Set up test data
DO $$
DECLARE
  test_company_id UUID;
  test_route_id UUID;
BEGIN
  -- Test company creation
  BEGIN
    INSERT INTO companies (name, address, lat, lng)
    VALUES ('RLS Test Company', 'Test Address', 41.7151, 44.8271)
    RETURNING id INTO test_company_id;
    RAISE NOTICE 'Company creation: PASS';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Company creation: FAIL - %', SQLERRM;
  END;

  -- Test route creation
  BEGIN
    INSERT INTO routes (name, date, status)
    VALUES ('RLS Test Route', CURRENT_DATE, 'planned')
    RETURNING id INTO test_route_id;
    RAISE NOTICE 'Route creation: PASS';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Route creation: FAIL - %', SQLERRM;
  END;

  -- More tests here...
END $$;

ROLLBACK; -- Don't actually save test data
```

---

**Ready to test? Follow each scenario step by step!** 🧪
