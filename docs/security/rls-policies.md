# 🔒 Row Level Security (RLS) Policies Documentation

## Overview

This document describes the Row Level Security implementation for GeoSafety RouteHub. RLS is a PostgreSQL feature that allows fine-grained access control at the database level.

---

## Security Model

### Roles

The system has three roles:

1. **Admin** - Full access to everything
2. **Dispatcher** - Manages operations (routes, assignments, companies)
3. **Inspector** - Field worker with limited write access

### Core Principles

1. **Read Transparency** - All authenticated users can read operational data for coordination
2. **Write Control** - Only authorized roles can create/update/delete data
3. **Ownership** - Inspectors can only modify their own routes and inspections
4. **Admin Override** - Admins have full access for system management

---

## Helper Functions

These functions simplify policy creation and are available to all authenticated users:

```sql
-- Get current user's role
auth.user_role() → TEXT ('admin', 'dispatcher', 'inspector')

-- Check user roles
auth.is_admin() → BOOLEAN
auth.is_admin_or_dispatcher() → BOOLEAN
auth.is_inspector() → BOOLEAN

-- Get inspector ID for current user
auth.current_inspector_id() → UUID
```

---

## Table Policies

### 1. Companies Table

**Read:** All authenticated users  
**Create:** Admin, Dispatcher  
**Update:** Admin, Dispatcher  
**Delete:** Admin only

```sql
-- ✅ Can read all companies (needed for route planning)
SELECT * FROM companies; -- All roles

-- ✅ Can create companies
INSERT INTO companies (...) VALUES (...); -- Admin, Dispatcher

-- ✅ Can update companies
UPDATE companies SET name = 'New Name' WHERE id = '...'; -- Admin, Dispatcher

-- ❌ Cannot delete companies
DELETE FROM companies WHERE id = '...'; -- Admin only
```

**Rationale:** Companies are core data. Inspectors need to see them for route execution, but shouldn't modify business records.

---

### 2. Inspectors Table

**Read:** All authenticated users  
**Create:** Admin only  
**Update:** Admin (all), Inspector (own profile)  
**Delete:** Admin only

```sql
-- ✅ Can read all inspectors
SELECT * FROM inspectors; -- All roles

-- ✅ Can create inspectors
INSERT INTO inspectors (...) VALUES (...); -- Admin only

-- ✅ Can update own profile
UPDATE inspectors 
SET phone = '...' 
WHERE id = auth.current_inspector_id(); -- Inspector (own)

-- ✅ Can update any inspector
UPDATE inspectors SET status = 'inactive' WHERE id = '...'; -- Admin

-- ❌ Cannot delete inspectors
DELETE FROM inspectors WHERE id = '...'; -- Admin only
```

**Rationale:** Only admins manage inspector records. Inspectors can update their own contact info and status.

---

### 3. Routes Table

**Read:** All authenticated users  
**Create:** Admin, Dispatcher  
**Update:** Admin, Dispatcher (all), Inspector (own routes)  
**Delete:** Admin, Dispatcher

```sql
-- ✅ Can read all routes
SELECT * FROM routes; -- All roles

-- ✅ Can create routes
INSERT INTO routes (...) VALUES (...); -- Admin, Dispatcher

-- ✅ Can update own route
UPDATE routes 
SET status = 'in_progress' 
WHERE inspector_id = auth.current_inspector_id(); -- Inspector (own)

-- ✅ Can update any route
UPDATE routes SET inspector_id = '...' WHERE id = '...'; -- Admin, Dispatcher

-- ❌ Cannot delete routes
DELETE FROM routes WHERE id = '...'; -- Admin, Dispatcher only
```

**Rationale:** Inspectors need to see all routes for coordination. They can update their own route status and times, but cannot reassign or delete routes.

---

### 4. Route Stops Table

**Read:** All authenticated users  
**Create:** Admin, Dispatcher  
**Update:** Admin, Dispatcher (all), Inspector (own route stops)  
**Delete:** Admin, Dispatcher

```sql
-- ✅ Can read all stops
SELECT * FROM route_stops; -- All roles

-- ✅ Can create stops
INSERT INTO route_stops (...) VALUES (...); -- Admin, Dispatcher

-- ✅ Can update stops on own route
UPDATE route_stops 
SET status = 'completed', actual_arrival_time = '...'
WHERE route_id IN (
  SELECT id FROM routes WHERE inspector_id = auth.current_inspector_id()
); -- Inspector (own)

-- ✅ Can update any stop
UPDATE route_stops SET notes = '...' WHERE id = '...'; -- Admin, Dispatcher

-- ❌ Cannot delete stops
DELETE FROM route_stops WHERE id = '...'; -- Admin, Dispatcher only
```

**Rationale:** Inspectors update stop details (arrival, completion, photos) during route execution. They cannot modify the route plan itself.

---

### 5. Inspections Table

**Read:** All authenticated users  
**Create:** Admin, Dispatcher, Inspector (own)  
**Update:** Admin, Dispatcher, Inspector (own)  
**Delete:** Admin only

```sql
-- ✅ Can read all inspections
SELECT * FROM inspections; -- All roles

-- ✅ Can create own inspections
INSERT INTO inspections 
(company_id, inspector_id, ...) 
VALUES ('...', auth.current_inspector_id(), ...); -- Inspector (own)

-- ✅ Can update own inspections
UPDATE inspections 
SET findings = '...' 
WHERE inspector_id = auth.current_inspector_id(); -- Inspector (own)

-- ✅ Can update any inspection
UPDATE inspections SET status = 'approved' WHERE id = '...'; -- Admin, Dispatcher

-- ❌ Cannot delete inspections
DELETE FROM inspections WHERE id = '...'; -- Admin only
```

**Rationale:** Inspections are created during route execution. Inspectors manage their own inspection records. Admins have full access for audit purposes.

---

### 6. User Roles Table

**Read:** User can read own role  
**Create/Update/Delete:** Admin only

```sql
-- ✅ Can read own role
SELECT role FROM user_roles WHERE user_id = auth.uid();

-- ❌ Cannot read others' roles
SELECT * FROM user_roles; -- Fails unless admin

-- ✅ Admin can manage all roles
INSERT INTO user_roles (...) VALUES (...); -- Admin only
UPDATE user_roles SET role = 'dispatcher' WHERE user_id = '...'; -- Admin only
DELETE FROM user_roles WHERE user_id = '...'; -- Admin only
```

**Rationale:** Users know their own role. Only admins manage the security model.

---

### 7. Service Tables (Company Services, Service Types, Inspection History)

**Read:** All authenticated users  
**Create/Update:** Admin, Dispatcher (Inspector for inspection_history)  
**Delete:** Admin only

Similar patterns to above tables with service-specific logic.

---

## Permission Matrix

| Table              | Admin | Dispatcher | Inspector |
|--------------------|-------|------------|-----------|
| **companies**      |       |            |           |
| - Read             | ✅    | ✅         | ✅        |
| - Create           | ✅    | ✅         | ❌        |
| - Update           | ✅    | ✅         | ❌        |
| - Delete           | ✅    | ❌         | ❌        |
| **inspectors**     |       |            |           |
| - Read             | ✅    | ✅         | ✅        |
| - Create           | ✅    | ❌         | ❌        |
| - Update (any)     | ✅    | ❌         | ❌        |
| - Update (own)     | ✅    | ✅         | ✅        |
| - Delete           | ✅    | ❌         | ❌        |
| **routes**         |       |            |           |
| - Read             | ✅    | ✅         | ✅        |
| - Create           | ✅    | ✅         | ❌        |
| - Update (any)     | ✅    | ✅         | ❌        |
| - Update (own)     | ✅    | ✅         | ✅        |
| - Delete           | ✅    | ✅         | ❌        |
| **route_stops**    |       |            |           |
| - Read             | ✅    | ✅         | ✅        |
| - Create           | ✅    | ✅         | ❌        |
| - Update (any)     | ✅    | ✅         | ❌        |
| - Update (own)     | ✅    | ✅         | ✅        |
| - Delete           | ✅    | ✅         | ❌        |
| **inspections**    |       |            |           |
| - Read             | ✅    | ✅         | ✅        |
| - Create           | ✅    | ✅         | ✅*       |
| - Update (any)     | ✅    | ✅         | ❌        |
| - Update (own)     | ✅    | ✅         | ✅        |
| - Delete           | ✅    | ❌         | ❌        |
| **user_roles**     |       |            |           |
| - Read (own)       | ✅    | ✅         | ✅        |
| - Read (all)       | ✅    | ❌         | ❌        |
| - Manage           | ✅    | ❌         | ❌        |

*Inspector can only create inspections assigned to themselves

---

## Testing RLS Policies

### 1. Test as Admin

```sql
-- Set session to admin user
SET LOCAL "request.jwt.claims" TO '{"sub": "ADMIN_USER_ID"}';

-- Should succeed
SELECT * FROM companies;
INSERT INTO companies (name, address, lat, lng) VALUES (...);
UPDATE companies SET name = '...' WHERE id = '...';
DELETE FROM companies WHERE id = '...';
```

### 2. Test as Dispatcher

```sql
-- Set session to dispatcher user
SET LOCAL "request.jwt.claims" TO '{"sub": "DISPATCHER_USER_ID"}';

-- Should succeed
SELECT * FROM routes;
INSERT INTO routes (...) VALUES (...);
UPDATE routes SET status = 'completed' WHERE id = '...';

-- Should fail
DELETE FROM companies WHERE id = '...'; -- Only admin
```

### 3. Test as Inspector

```sql
-- Set session to inspector user
SET LOCAL "request.jwt.claims" TO '{"sub": "INSPECTOR_USER_ID"}';

-- Should succeed
SELECT * FROM routes;
UPDATE routes 
SET status = 'in_progress' 
WHERE inspector_id = (
  SELECT inspector_id FROM user_roles WHERE user_id = auth.uid()
);

-- Should fail
INSERT INTO routes (...) VALUES (...); -- Only admin/dispatcher
UPDATE routes SET status = 'completed' WHERE inspector_id != (...); -- Not own route
DELETE FROM routes WHERE id = '...'; -- No delete access
```

---

## Security Best Practices

### ✅ DO:

1. **Always use RLS** - Never disable RLS in production
2. **Test policies** - Verify with each role before deploying
3. **Use helper functions** - Keep policies DRY and maintainable
4. **Log access** - Monitor failed access attempts
5. **Review regularly** - Audit policies quarterly

### ❌ DON'T:

1. **Don't use SECURITY DEFINER carelessly** - Can bypass RLS
2. **Don't hardcode user IDs** - Use auth.uid() function
3. **Don't create circular dependencies** - Policies should be simple
4. **Don't allow anonymous access** - Require authentication
5. **Don't over-complicate** - Simple policies are easier to audit

---

## Troubleshooting

### Common Issues:

**1. "Permission denied for table X"**
- User is not authenticated
- RLS is enabled but no policy grants access
- Check if user's role is set correctly in user_roles

**2. "Infinite recursion detected in policy"**
- Policy references itself in qual/with_check
- Use SECURITY DEFINER functions to break recursion
- Simplify policy logic

**3. "Cannot insert/update - policy violation"**
- WITH CHECK clause is failing
- User doesn't have required role
- Foreign key constraint (e.g., inspector_id) doesn't match

### Debugging Commands:

```sql
-- View all policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Test policy as specific user
SET LOCAL "request.jwt.claims" TO '{"sub": "USER_ID"}';
SELECT * FROM companies; -- Test query
RESET "request.jwt.claims";

-- Check current user's role
SELECT auth.user_role();
SELECT auth.is_admin();
```

---

## Migration Checklist

When applying RLS policies to production:

- [ ] Backup database
- [ ] Test all policies in development
- [ ] Verify admin access still works
- [ ] Test as dispatcher user
- [ ] Test as inspector user
- [ ] Check application still works
- [ ] Monitor error logs for access denials
- [ ] Have rollback plan ready

---

## Maintenance

### Quarterly Review:
1. Audit all RLS policies
2. Check for new tables needing RLS
3. Review access logs for anomalies
4. Update documentation
5. Test with new role scenarios

### When Adding New Tables:
1. Enable RLS immediately
2. Create policies before inserting data
3. Test with all roles
4. Document in this file
5. Add to permission matrix

---

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Best Practices](https://supabase.com/docs/guides/database/database-advisors)

---

**Last Updated:** October 10, 2025  
**Status:** ✅ Complete and ready for production  
**Next Review:** January 2026
