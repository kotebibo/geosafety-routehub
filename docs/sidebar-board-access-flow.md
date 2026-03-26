# Sidebar Board Access — Full Data Flow

This traces exactly how a user's boards appear (or don't) in the sidebar.

---

## STEP 1: Authentication (AuthContext.tsx)

When user logs in, `fetchUserRole` runs:

```
1. supabase.auth.getSession() fires → calls fetchUserRole(user.id)
2. supabase.auth.onAuthStateChange() ALSO fires → calls fetchUserRole(user.id) AGAIN
   ⚠️ BUG: Two concurrent calls. First one may get AbortError.
   If AbortError hits the catch block, userRole stays null → no permissions → empty sidebar.
   (We added a fix to ignore AbortError, but it may not be deployed yet)

3. fetchUserRole does:
   a. RPC call: upsert_user_profile (creates user in public.users table)
      → If RPC doesn't exist on this Supabase instance, it warns but continues

   b. Query: user_roles WHERE user_id = auth.uid() → gets role ('officer', 'dispatcher', etc.)
      → RLS: user_roles allows SELECT WHERE user_id = auth.uid() ✅

   c. Query: role_permissions WHERE role_name = role → gets permission strings
      → RLS: role_permissions allows SELECT USING (true) for authenticated ✅
      → Returns: ['pages:dashboard', 'pages:news', 'pages:settings', 'pages:companies', ...]

   d. Sets userRole = { role: 'officer', permissions: [...] }
```

**What can go wrong:**

- AbortError → userRole = null → hasPermission always returns false → empty sidebar nav
- user_roles has no row for this user → userRole = null → same result
- role_permissions RLS blocks read → permissions = [] → nav items hidden

---

## STEP 2: Sidebar Initialization (Sidebar.tsx)

```
const { user, userRole, loading: authLoading, hasPermission } = useAuth()
const userId = user?.id || ''
const isAuthReady = !authLoading && !!user
```

**Two parallel data fetches:**

### Fetch A: Workspaces

```
useWorkspaces(isAuthReady)
  → workspaceService.getWorkspaces()
  → supabase.from('workspaces').select('*, workspace_members(role, user_id)')
```

**RLS on workspaces (migration 072):**

```sql
SELECT allowed IF:
  owner_id = auth.uid()                              -- workspace owner
  OR workspace_members.user_id = auth.uid()           -- workspace member
  OR boards.board_members.user_id = auth.uid()        -- board-only member (NEW in 072)
  OR is_admin_user()                                  -- app admin
```

**Result for workspace member:** `[{ id, name, ..., workspace_members: [{ role: 'editor', user_id: '...' }] }]`
**Result for board-only member:** `[{ id, name, ..., workspace_members: [] }]` ← empty join, but row IS returned
**Result for neither:** `[]` ← no rows returned

The service extracts: `current_user_role = workspace_members[0]?.role || null`

### Fetch B: User's Boards

```
useUserBoards(userId)
  → boardCrudService.getBoards(userId)
  → supabase.from('boards').select('*, workspace:workspaces(id, name, icon, color)')
```

**RLS on boards (migration 046):**

```sql
SELECT allowed IF:
  owner_id = auth.uid()                               -- board owner
  OR is_public = true                                  -- public board
  OR board_members.user_id = auth.uid()                -- direct board member
  OR (workspace_id IS NOT NULL
      AND workspace_members.user_id = auth.uid())      -- workspace member → ALL boards
  OR is_admin_user()                                   -- app admin
```

**The workspace join:** `workspace:workspaces(id, name, icon, color)`

- This is a LEFT JOIN through PostgREST
- It returns workspace data ONLY if the user can SELECT from workspaces table (RLS applies)
- If workspace RLS blocks → board.workspace = null
- If workspace RLS allows → board.workspace = { id, name, icon, color }

---

## STEP 3: Sidebar Grouping Logic

```javascript
// Build workspace context from boards AND workspaces
const wsContextMap = new Map()

// Source 1: Extract workspace info embedded in board data
allBoards.forEach(board => {
  if (board.workspace_id && board.workspace) {
    // ← board.workspace could be null!
    wsContextMap.set(board.workspace_id, board.workspace)
  }
})

// Source 2: Merge full workspace data from workspace query
workspaces.forEach(ws => {
  wsContextMap.set(ws.id, ws) // Full data overrides board-embedded data
})

// Group boards into their workspaces
const grouped = new Map()
wsContextMap.forEach((_, wsId) => grouped.set(wsId, []))

allBoards.forEach(board => {
  if (board.workspace_id && grouped.has(board.workspace_id)) {
    grouped.get(board.workspace_id).push(board) // ← Board goes under workspace
  } else {
    shared.push(board) // ← Board goes to "Shared with me"
  }
})
```

**What can go wrong:**

- If `board.workspace` is null (RLS blocks workspace join) AND workspace isn't in `workspaces` list
  → `wsContextMap` won't have this workspace_id → board goes to `shared`
- If `workspaces` returns the workspace but board RLS blocks the board
  → workspace appears in dropdown but with 0 boards

---

## STEP 4: Sidebar Rendering

```javascript
// Show workspace dropdown only if there are workspaces to show
{allWorkspaceContexts.size > 0 || (workspaces && workspaces.length > 0) ? (
  // Render workspace dropdown + board list
) : null}
```

**Workspace dropdown iterates:** `allWorkspaceContexts.entries()`
**Board list shows:** `boardsByWorkspace.get(selectedWorkspaceId)`

**Management UI (settings gear, rename) gated on:**

```javascript
const isWorkspaceMember = wsId => workspaces?.some(ws => ws.id === wsId && ws.current_user_role)
```

Board-only members see workspace name but no settings gear.

---

## SCENARIO ANALYSIS

### Scenario A: User is WORKSPACE MEMBER

1. `workspaces` query returns workspace with `current_user_role: 'editor'` ✅
2. `boards` query returns ALL boards in workspace (RLS workspace_members check) ✅
3. `board.workspace` join populated (workspace RLS allows) ✅
4. `wsContextMap` has workspace from both sources ✅
5. All boards grouped under workspace ✅
6. **Expected: Works**

### Scenario B: User is BOARD-ONLY MEMBER (not workspace member)

1. `workspaces` query returns workspace with `current_user_role: null` (left join, no membership row)
   → BUT does it even return the workspace? Only if migration 072 RLS is active.
2. `boards` query returns ONLY the board they're a member of (RLS board_members check) ✅
3. `board.workspace` join — depends on workspace RLS allowing this user to read workspace row
   → If 072 is active: populated ✅
   → If 072 NOT active or not working: NULL ❌ → board goes to "shared"
4. `wsContextMap` gets workspace from board data (if workspace join worked) or from workspace query
5. Board grouped under workspace ✅
6. **Expected: Works if 072 is properly applied**

### Scenario C: User is WORKSPACE MEMBER but NOT board member of a specific board

1. `workspaces` returns workspace ✅
2. `boards` query: workspace_members check should return ALL boards ✅
3. But...
   **QUESTION: Is the boards RLS checking workspace_members.user_id = auth.uid() correctly?**
   → If user was just added to workspace, is the RLS cache stale?
   → Is there a PostgREST schema cache issue?

### Scenario D: User WAS board member, then REMOVED from board, then ADDED to workspace

1. Board member row deleted → board_members check fails
2. Workspace member row added → workspace_members check should now return ALL boards
3. **But user reports seeing workspace with 0 boards!**
   → This means the boards RLS workspace_members check is NOT working
   → OR the workspace_members row doesn't have user_id = auth.uid()

---

## KEY QUESTION TO DEBUG

Run this SQL in Supabase SQL Editor for team2 to check the actual board access:

```sql
-- Replace USER_ID with the test officer's auth.uid()
-- Test officer: 45e3a83e-eb82-4665-b51b-f634da45881a

-- 1. Check workspace membership
SELECT wm.workspace_id, wm.user_id, wm.role, w.name as workspace_name
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE wm.user_id = '45e3a83e-eb82-4665-b51b-f634da45881a';

-- 2. Check board membership
SELECT bm.board_id, bm.user_id, bm.role, b.name as board_name
FROM board_members bm
JOIN boards b ON b.id = bm.board_id
WHERE bm.user_id = '45e3a83e-eb82-4665-b51b-f634da45881a';

-- 3. Check what boards the workspace_members RLS check would return
SELECT b.id, b.name, b.workspace_id
FROM boards b
WHERE b.workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm
    WHERE wm.user_id = '45e3a83e-eb82-4665-b51b-f634da45881a'
);

-- 4. Check ALL active RLS policies on boards table
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'boards' AND cmd = 'SELECT';

-- 5. Check ALL active RLS policies on workspaces table
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'workspaces' AND cmd = 'SELECT';
```

**Query 3 is the critical one.** If it returns boards, then the RLS policy should work.
If it returns 0 rows, the workspace_members entry has a different user_id than expected.

**Query 4 is also critical.** If there are MULTIPLE SELECT policies on boards, PostgreSQL
uses OR logic between them. But if an old restrictive policy exists alongside the new one,
it might cause unexpected behavior.

---

## LIKELY ROOT CAUSES (ranked by probability)

1. **AbortError killing permissions** → userRole = null → hasPermission false → empty nav
   (Fixed in latest commit but may not be deployed)

2. **Multiple conflicting RLS policies on boards** → Some old migration left a restrictive
   policy that doesn't check workspace_members

3. **board.workspace join returning null** → workspace RLS not working → boards fall to "shared"
   but "shared" section might not render either

4. **PostgREST schema cache** → After running migration 072, Supabase may need a schema
   reload. Go to Supabase Dashboard → Settings → API → Click "Reload" or wait ~2 minutes.
