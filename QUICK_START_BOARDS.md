# Quick Start: Fix Boards System

## Problem
The boards feature is showing 401/406 errors because:
1. ❌ No inspector with email 'dev@geosafety.ge' exists
2. ❌ RLS policies block access without authentication
3. ❌ Mock user has no real auth session

## Solution: Run 2 Migrations

### Step 1: Run Migration 009
**Purpose**: Create dev inspector + allow inspector lookups

```sql
-- Copy and paste this into Supabase SQL Editor:

-- Insert development inspector if not exists
INSERT INTO public.inspectors (
    email,
    full_name,
    phone,
    role,
    status,
    zone,
    certifications
)
VALUES (
    'dev@geosafety.ge',
    'Development Admin',
    '+995-555-0000',
    'admin',
    'active',
    'Tbilisi',
    '{"certifications": ["Safety Inspector", "Quality Assurance"]}'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- Update RLS policy for development
DROP POLICY IF EXISTS "All authenticated users can read inspectors" ON public.inspectors;

CREATE POLICY "Allow reading inspectors for lookup"
  ON public.inspectors FOR SELECT
  USING (true);
```

### Step 2: Run Migration 010
**Purpose**: Enable board operations without auth (dev only)

```sql
-- Copy and paste this into Supabase SQL Editor:

-- BOARDS
DROP POLICY IF EXISTS "Users can view their own boards" ON public.boards;
DROP POLICY IF EXISTS "Users can create boards" ON public.boards;
DROP POLICY IF EXISTS "Users can update their own boards" ON public.boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON public.boards;

CREATE POLICY "Dev: Allow all board reads" ON public.boards FOR SELECT USING (true);
CREATE POLICY "Dev: Allow all board inserts" ON public.boards FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev: Allow all board updates" ON public.boards FOR UPDATE USING (true);
CREATE POLICY "Dev: Allow all board deletes" ON public.boards FOR DELETE USING (true);

-- BOARD ITEMS
DROP POLICY IF EXISTS "Users can view items in their boards" ON public.board_items;
DROP POLICY IF EXISTS "Users can create items in their boards" ON public.board_items;
DROP POLICY IF EXISTS "Users can update items in their boards" ON public.board_items;
DROP POLICY IF EXISTS "Users can delete items in their boards" ON public.board_items;

CREATE POLICY "Dev: Allow all board item reads" ON public.board_items FOR SELECT USING (true);
CREATE POLICY "Dev: Allow all board item inserts" ON public.board_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev: Allow all board item updates" ON public.board_items FOR UPDATE USING (true);
CREATE POLICY "Dev: Allow all board item deletes" ON public.board_items FOR DELETE USING (true);

-- BOARD MEMBERS
DROP POLICY IF EXISTS "Users can view board members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can add members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can update members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can remove members" ON public.board_members;

CREATE POLICY "Dev: Allow all board member reads" ON public.board_members FOR SELECT USING (true);
CREATE POLICY "Dev: Allow all board member inserts" ON public.board_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev: Allow all board member updates" ON public.board_members FOR UPDATE USING (true);
CREATE POLICY "Dev: Allow all board member deletes" ON public.board_members FOR DELETE USING (true);
```

### Step 3: Test
1. Refresh [http://localhost:3002/boards](http://localhost:3002/boards)
2. Should load without errors
3. Click "Create Board" - should work!

## What These Migrations Do

### Migration 009:
✅ Creates inspector with email 'dev@geosafety.ge'
✅ Allows reading inspectors without auth
✅ Enables `useInspectorId` hook to work

### Migration 010:
✅ Removes auth requirements from board operations
✅ Allows all CRUD on boards/items/members
✅ Enables development without real authentication

## ⚠️ Important Notes

**These policies are for DEVELOPMENT ONLY!**

Before production:
1. Remove or revert migration 010
2. Restore authentication-based RLS policies
3. Enable proper Supabase Auth
4. Link auth users to inspector records

## Troubleshooting

**Still getting 401 errors?**
- Make sure you ran migration 010
- Clear browser cache (Ctrl+Shift+R)
- Check Supabase logs for policy errors

**Inspector ID is null?**
- Make sure you ran migration 009
- Verify inspector exists: `SELECT * FROM inspectors WHERE email = 'dev@geosafety.ge'`
- Check browser console for lookup errors

**Boards not appearing?**
- No boards exist yet - click "Create Board"
- Check RLS policies are permissive
- Verify no errors in browser console
