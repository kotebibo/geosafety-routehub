# Database Migration Instructions

## Critical: Fix RLS Policies (Migration 008)

**Status**: ⚠️ REQUIRED - The boards feature will not work until this migration is applied.

**Issue**: The user boards system has an infinite recursion error in the Row Level Security (RLS) policies that prevents boards from loading.

### Steps to Apply Migration 008:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run Migration 008**
   - Open the file: `supabase/migrations/008_fix_rls_policies.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **Run** or press `Ctrl+Enter`

3. **Verify Success**
   - You should see: "Success. No rows returned"
   - Navigate to [http://localhost:3002/boards](http://localhost:3002/boards)
   - The page should load without errors
   - You should be able to click "Create Board" and create new boards

### What This Migration Does:

- **Drops** all existing circular RLS policies on `boards`, `board_items`, and `board_members` tables
- **Creates** simplified policies that avoid infinite recursion:
  - `boards` policies only check `owner_id` (no reference to board_members)
  - `board_members` policies can reference `boards` (one-way dependency)
  - `board_items` policies check board ownership only

### Error Being Fixed:

```
Failed to create board: {
  code: '42P17',
  details: null,
  hint: null,
  message: 'infinite recursion detected in policy for relation "board_members"'
}
```

### After Migration:

Once the migration is applied, the boards system will be fully functional:

- ✅ View all boards at `/boards`
- ✅ Create boards from scratch or templates
- ✅ Add items to boards
- ✅ Edit items inline
- ✅ Select and manage multiple items
- ✅ Share boards (public/private)

## Previous Migrations

### Migration 007 (Already Applied)
- Created `boards`, `board_items`, `board_members`, and `board_templates` tables
- Added triggers for auto-adding board owners as members
- Added activity tracking for board items
- Pre-populated 3 board templates (Project Management, CRM Pipeline, Task Tracker)

### Migration 006 (Already Applied)
- Updated `item_updates` and `item_comments` tables to support 'board_item' type
- Enables activity tracking and comments on board items

## Troubleshooting

If you encounter issues after running the migration:

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
2. **Check Supabase logs** in the dashboard for any error messages
3. **Verify RLS is enabled** on all board tables:
   ```sql
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE tablename IN ('boards', 'board_items', 'board_members', 'board_templates');
   ```
   All should show `rowsecurity = true`

4. **Check policies exist**:
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE tablename IN ('boards', 'board_items', 'board_members');
   ```

## Future Enhancements

After the current implementation is stable, we can enhance the RLS policies to:
- Support member-based access (viewers, editors)
- Add folder-based organization
- Implement workspace-level permissions

These enhancements will require careful design to avoid recreating the circular dependency issue.
