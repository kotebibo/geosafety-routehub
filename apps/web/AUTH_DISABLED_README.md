# Authentication Disabled - Development Mode

## ⚠️ IMPORTANT: Authentication has been temporarily disabled

### Changes Made:
The file `src/contexts/AuthContext.tsx` has been modified to bypass authentication for development purposes.

### What This Means:
- ✅ **Full admin access** - No login required
- ✅ **All features unlocked** - Complete access to all routes and functionality
- ✅ **Mock user created** - System thinks you're logged in as "Development Admin"
- ✅ **No more 400 errors** - Supabase auth endpoints are not being called

### Current Mock User:
- **Email:** dev@geosafety.ge
- **Role:** Admin
- **Name:** Development Admin
- **User ID:** dev-admin-user

### How to Use:
1. Navigate to http://localhost:3000
2. You'll have immediate access to all admin features
3. No login screen or authentication required

### To Re-enable Authentication Later:
Open `src/contexts/AuthContext.tsx` and uncomment the original code blocks (marked with comments).

### ⚠️ WARNING:
**DO NOT DEPLOY THIS TO PRODUCTION!** This configuration bypasses all security.
Only use this for local development and testing.

---

**Status:** ✅ Authentication disabled
**Access Level:** Full Admin Access
**Created:** ${new Date().toISOString()}
