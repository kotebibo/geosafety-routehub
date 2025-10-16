# 🔒 RLS (Row Level Security) POLICY AUDIT

## 📅 Date: October 10, 2025

---

## 📊 CURRENT STATUS

### ✅ Tables with RLS Enabled:
- ✅ companies
- ✅ inspectors
- ✅ routes
- ✅ route_stops
- ✅ inspections
- ✅ company_services
- ✅ service_types
- ✅ inspection_history
- ✅ reassignment_history
- ✅ user_roles

**All critical tables have RLS enabled!** ✅

---

## 🛠️ HELPER FUNCTIONS

### Existing Functions:
```sql
✅ auth.user_role()              - Get current user's role
✅ auth.is_admin()               - Check if user is admin
✅ auth.is_admin_or_dispatcher() - Check if admin or dispatcher
✅ auth.is_inspector()           - Check if user is inspector
✅ auth.current_inspector_id()   - Get inspector ID for current user
```

**All helper functions exist and are properly defined!** ✅

---

## 🔍 POLICY REVIEW BY TABLE

### **1. companies**

**Current Policies:**
```sql
✅ SELECT: All authenticated users
✅ INSERT: Admins and dispatchers only
✅ UPDATE: Admins and dispatchers only
✅ DELETE: Admins only
```

**Assessment:** ✅ **GOOD**
- Appropriate access levels
- Read access for all authenticated (needed for route planning)
- Write access restricted appropriately

---

### **2. inspectors**

**Current Policies:**
```sql
✅ SELECT: All authenticated users
✅ INSERT: Admins only
✅ UPDATE: Admins + own inspector record
✅ DELETE: Admins only
```

**Assessment:** ✅ **GOOD**
- Inspectors can see each other (needed for coordination)
- Inspectors can update their own profiles
- Admin-only for creation/deletion

---

### **3. routes**

**Current Policies:**
```sql
✅ SELECT: All authenticated users
✅ INSERT: Admins and dispatchers
✅ UPDATE: Admins, dispatchers, + assigned inspector
✅ DELETE: Admins and dispatchers
```

**Assessment:** ✅ **GOOD**
- All can view (coordination)
- Assigned inspector can update their routes
- Admin/dispatcher control creation/deletion

---

### **4. route_stops**

**Current Policies:**
```sql
✅ SELECT: All authenticated users
✅ INSERT: Admins and dispatchers
✅ UPDATE: Admins, dispatchers, + assigned inspector (via route)
✅ DELETE: Admins and dispatchers
```

**Assessment:** ✅ **GOOD**
- Consistent with routes table
- Proper CASCADE with routes

---

### **5. inspections**

**Current Policies:**
```sql
✅ SELECT: All authenticated users
✅ INSERT: Admins, dispatchers, inspectors
✅ UPDATE: Admins, dispatchers, + own inspector
✅ DELETE: Admins only
```

**Assessment:** ✅ **GOOD**
- Inspectors can create inspections
- Inspectors can update their own
- Admin oversight

---

### **6. company_services**

**Current Policies:**
```sql
✅ SELECT: All authenticated users
✅ ALL: Admins and dispatchers
```

**Assessment:** ✅ **GOOD**
- Service tracking viewable by all
- Management by admins/dispatchers

---

### **7. service_types**

**Current Policies:**
```sql
✅ SELECT: All authenticated users
✅ ALL: Admins only
```

**Assessment:** ✅ **GOOD**
- Reference data readable by all
- Only admins can modify service types

---

### **8. inspection_history**

**Current Policies:**
```sql
✅ SELECT: All authenticated users
✅ INSERT: Admins, dispatchers, inspectors
✅ UPDATE: Admins, dispatchers, + own inspector
✅ DELETE: Admins only
```

**Assessment:** ✅ **GOOD**
- Historical data viewable
- Proper access control

---

### **9. reassignment_history**

**Current Policies:**
```sql
✅ SELECT: All authenticated users
✅ INSERT: Admins and dispatchers
```

**Assessment:** ✅ **GOOD**
- Audit trail readable
- Only admins/dispatchers create records

---

### **10. user_roles**

**Current Policies:**
```sql
✅ SELECT: Users can view own role
✅ ALL: Admins can manage roles
```

**Assessment:** ⚠️ **NEEDS IMPROVEMENT**

**Issues:**
1. Uses nested `auth.uid()` query - potential for recursive policy
2. Should use simpler check

**Recommendation:**
```sql
-- Better approach:
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
  );
```

---

## ⚠️ ISSUES FOUND

### **Issue 1: Inconsistent Policy Approach**
- Some policies use `auth.jwt() ->> 'role'`
- Others use `auth.is_admin()` functions
- **Recommendation:** Use helper functions consistently

### **Issue 2: Potential Recursive Policy (user_roles)**
- Policy on `user_roles` queries `user_roles` table
- Can cause infinite recursion
- **Status:** Needs fixing

### **Issue 3: Missing Policies**
- No explicit DENY policies
- Relies on implicit deny (which is fine)
- **Status:** Acceptable

---

## 🎯 RECOMMENDATIONS

### **Priority 1: Fix user_roles Recursive Policy** (CRITICAL)

Create new migration:
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Create non-recursive policies
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- For admin management, create a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  USING (is_user_admin())
  WITH CHECK (is_user_admin());
```

---

### **Priority 2: Standardize Policy Syntax**

Replace `auth.jwt() ->> 'role'` with helper functions:

**Before:**
```sql
USING (auth.jwt() ->> 'role' = 'admin')
```

**After:**
```sql
USING (auth.is_admin())
```

---

### **Priority 3: Add Performance Indexes**

Add indexes for RLS policy performance:
```sql
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON user_roles(user_id);
  
CREATE INDEX IF NOT EXISTS idx_user_roles_role 
  ON user_roles(role);
  
CREATE INDEX IF NOT EXISTS idx_routes_inspector 
  ON routes(inspector_id);
```

---

## ✅ TESTING CHECKLIST

### **Test as Admin:**
- [ ] Can view all companies
- [ ] Can create/update/delete companies
- [ ] Can view all inspectors
- [ ] Can create/update/delete inspectors
- [ ] Can view all routes
- [ ] Can create/update/delete routes
- [ ] Can manage user roles

### **Test as Dispatcher:**
- [ ] Can view all companies
- [ ] Can create/update companies
- [ ] Cannot delete companies
- [ ] Can view all inspectors
- [ ] Cannot create/update/delete inspectors
- [ ] Can create/update routes
- [ ] Cannot delete routes

### **Test as Inspector:**
- [ ] Can view companies
- [ ] Cannot create/update/delete companies
- [ ] Can view inspectors
- [ ] Cannot create/delete inspectors
- [ ] Can update own profile
- [ ] Can view all routes
- [ ] Cannot create/delete routes
- [ ] Can update assigned routes
- [ ] Can create inspections
- [ ] Can update own inspections

### **Test as Unauthenticated:**
- [ ] Cannot access any table
- [ ] All queries return empty or error

---

## 📊 SECURITY SCORE

```
Overall RLS Security: 🟡 GOOD with Minor Issues

✅ All tables have RLS enabled
✅ Helper functions properly defined
✅ Most policies are well-structured
⚠️ One recursive policy needs fixing
⚠️ Some inconsistent syntax usage
✅ Appropriate access levels
✅ Proper role-based access control

Score: 8.5/10
```

---

## 🎯 ACTION ITEMS

### **Immediate (This Session):**
1. ✅ Audit complete
2. ⏳ Fix user_roles recursive policy
3. ⏳ Create test scripts
4. ⏳ Test with different roles

### **Short Term:**
5. Standardize all policy syntax
6. Add performance indexes
7. Document policy decisions
8. Create policy migration template

### **Nice to Have:**
9. Add audit logging policies
10. Create policy validation tests
11. Performance benchmarks

---

## 📝 CONCLUSION

**Status:** ✅ **RLS policies are mostly good!**

The existing RLS setup is solid with appropriate access controls for each role. Only one critical fix needed (user_roles recursive policy), plus some minor improvements for consistency.

**Risk Level:** 🟡 Medium (fixable in <1 hour)

**Production Ready:** After fixing user_roles policy + testing

---

**Next Step:** Create migration to fix user_roles policy
