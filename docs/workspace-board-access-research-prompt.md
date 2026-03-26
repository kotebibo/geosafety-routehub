# Research Prompt: Workspace & Board Member Access Model

## Context

You are reviewing a Next.js 14 / Supabase project called **RouteHub** — a workspace-based project management tool (think monday.com clone) with boards, items, and member access. The app uses **Supabase Auth + RLS (Row-Level Security)** for all data access.

## The Problem We Need Solved

We have two levels of membership:

1. **Workspace members** — added via `workspace_members` table
2. **Board members** — added via `board_members` table

### Desired behavior:

- **Workspace member** = can see ALL boards in that workspace
- **Board member** (not a workspace member) = can see ONLY the specific boards they were added to, BUT those boards should appear **under the workspace name** in the sidebar, not in a generic "Shared with me" bucket

### Current problem:

When a user is added as a **board member only** (not a workspace member), the sidebar shows their boards under "Shared with me" instead of under the actual workspace name. This happens because:

1. The workspace list query uses an `!inner` join on `workspace_members`, so it only returns workspaces where the user is an explicit workspace member
2. The workspace RLS policy only allows SELECT if you're the `owner_id` or in `workspace_members`
3. The sidebar groups boards by workspace — boards whose `workspace_id` doesn't match any workspace in the user's workspace list fall into "Shared with me"

So the user CAN access the board data (RLS on boards allows board_members), but they CAN'T see/query the workspace row itself, so the sidebar can't group the board under its workspace name.

### What we want:

A board-only member should see the workspace name in the sidebar with only their assigned boards listed under it. They should NOT get full workspace access (can't see workspace settings, can't see other boards, etc.) — just enough to navigate to their boards with proper context.

---

## Current Architecture

### Database Tables

```sql
-- Workspaces
CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT 'blue',
    owner_id UUID REFERENCES auth.users(id),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workspace Members
CREATE TABLE public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL DEFAULT 'member', -- owner, admin, editor, member, guest
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- Boards (belong to a workspace)
CREATE TABLE public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id),
    workspace_id UUID REFERENCES public.workspaces(id),
    board_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'board',
    color TEXT DEFAULT 'blue',
    is_template BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Board Members
CREATE TABLE public.board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL DEFAULT 'viewer', -- owner, editor, viewer
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(board_id, user_id)
);
```

### Current RLS Policies

**Workspace SELECT policy (latest, from migration 046):**

```sql
CREATE POLICY "workspaces_select_policy" ON public.workspaces
    FOR SELECT USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = id AND wm.user_id = auth.uid()
        )
        OR public.is_admin_user()
    );
```

→ Board-only members CANNOT see the workspace row.

**Board access function (used in board RLS):**

```sql
CREATE OR REPLACE FUNCTION public.can_access_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    my_inspector_id UUID;
    my_user_id UUID;
BEGIN
    my_user_id := (SELECT auth.uid());
    my_inspector_id := (SELECT public.get_my_inspector_id());

    RETURN EXISTS (
        SELECT 1 FROM public.boards b
        WHERE b.id = board_uuid
        AND (
            -- Owner
            b.owner_id = my_user_id
            OR b.owner_id = my_inspector_id
            OR b.is_public = true
            -- Direct board member
            OR EXISTS (
                SELECT 1 FROM public.board_members bm
                WHERE bm.board_id = b.id
                AND (bm.user_id = my_user_id OR bm.user_id = my_inspector_id)
            )
            -- Workspace member (gets access to ALL boards in workspace)
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = b.workspace_id
                AND (wm.user_id = my_user_id OR wm.user_id = my_inspector_id)
            )
            -- Admin
            OR public.is_admin_user()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

→ Board-only members CAN access the board data. The disconnect is between data access (works) and navigation/UI (broken).

### Frontend: Sidebar Workspace/Board Grouping

**How workspaces are fetched (`workspace.service.ts`):**

```typescript
async getWorkspaces() {
    const { data, error } = await getSupabase().from('workspaces')
      .select('*, workspace_members!inner(role, user_id)')  // !inner = only workspaces where user is a member
      .order('created_at', { ascending: false })
    // ...
}
```

→ Uses `!inner` join, so only returns workspaces with matching workspace_members rows.

**How boards are fetched (`board-crud.service.ts`):**

```typescript
async getBoards(userId?: string) {
    const { data, error } = await getSupabase().from('boards')
      .select('*')
      .order('created_at', { ascending: false })
    // RLS filters automatically
    return data || []
}
```

→ Returns ALL boards the user can access (via RLS), including board-member-only boards.

**How sidebar groups boards (`Sidebar.tsx`, lines 172-195):**

```typescript
const { boardsByWorkspace, sharedBoards } = React.useMemo(() => {
  const grouped = new Map<string, typeof allBoards>()
  const shared: typeof allBoards = []

  // Initialize with all user's workspaces
  workspaces.forEach((ws: any) => {
    grouped.set(ws.id, [])
  })

  // Group boards by workspace — orphans go to "shared"
  allBoards.forEach((board: any) => {
    const wsId = board.workspace_id
    if (wsId && grouped.has(wsId)) {
      grouped.get(wsId)!.push(board)
    } else {
      shared.push(board) // ← Board-only member boards end up HERE
    }
  })

  return { boardsByWorkspace: grouped, sharedBoards: shared }
}, [allBoards, workspaces])
```

→ Since the workspace isn't in the user's workspace list (because `!inner` join + RLS), boards with that `workspace_id` fall into `shared`.

**Auto-select workspace logic (`Sidebar.tsx`, lines 197-216):**

```typescript
React.useEffect(() => {
  if (pathname.startsWith('/boards/') && allBoards) {
    const boardId = pathname.split('/')[2]
    const board = allBoards.find((b: any) => b.id === boardId)
    if (board) {
      const wsId = board.workspace_id
      const userWorkspaceIds = new Set(workspaces.map((ws: any) => ws.id))
      if (wsId && userWorkspaceIds.has(wsId)) {
        setSelectedWorkspaceId(wsId)
      } else {
        setSelectedWorkspaceId('__shared__') // ← Falls to shared
      }
    }
  }
})
```

### Previously Removed Code

We previously had auto-add-to-workspace when adding someone as a board member (in `BoardAccessModal.tsx`):

```typescript
// THIS WAS REMOVED — we don't want board membership to auto-grant workspace membership
const { error: wsError } = await supabase.from('workspace_members').upsert(
  {
    workspace_id: board.workspace_id,
    user_id: userId,
    role: 'guest',
    added_by: user.id,
  },
  { onConflict: 'workspace_id,user_id' }
)
```

This was removed because it conflated two access levels — adding someone to a board shouldn't give them full workspace access.

---

## Constraints

1. **Supabase RLS is the security layer** — all data access goes through RLS policies. The frontend just calls `.from('table').select('*')` and RLS filters.
2. **We cannot trust the frontend** — even if we change the frontend grouping, the RLS must also allow the workspace row to be read.
3. **Board-only members should NOT appear in workspace member lists** — they aren't workspace members. The workspace settings page should only show actual workspace members.
4. **Board-only members should NOT see boards they weren't added to** — they only see their specific boards, not all boards in the workspace.
5. **Workspace members should continue to see ALL boards in the workspace** — this behavior is correct and should not change.
6. **We want a clean, maintainable solution** — not a hack. This is a core access pattern that will be used heavily.
7. **Performance matters** — the sidebar loads on every page. The workspace/board queries should not become expensive.

---

## What We Need From You

Research and propose the best approach to solve this. Consider these possible approaches (and any others you think of):

### Approach A: Modify workspace RLS to allow board-member visibility

Add a condition to the workspace SELECT policy: "you can see a workspace if you're a member of any board in it."

```sql
-- Something like:
OR EXISTS (
    SELECT 1 FROM public.boards b
    JOIN public.board_members bm ON bm.board_id = b.id
    WHERE b.workspace_id = workspaces.id
    AND bm.user_id = auth.uid()
)
```

Pros: Clean — the workspace query naturally returns workspaces where you have board access.
Cons: Now the user can read the workspace row (name, description, settings). Is that a problem? Also need to make sure the `!inner` join in `getWorkspaces()` doesn't still filter them out (since they won't have a workspace_members row).

### Approach B: Change the frontend query to not use `!inner` join

Instead of `workspace_members!inner`, use a left join and let RLS + the modified workspace policy handle visibility. Board-only users would get the workspace row but with no workspace_members data.

### Approach C: Create a separate "workspace context" query

For boards that don't match a known workspace, fetch their workspace names separately (from the board's `workspace_id`). This avoids changing workspace RLS entirely.

### Approach D: Embed workspace info in the board query

Instead of fetching workspaces separately, join workspace name/icon/color onto the board query. The sidebar groups by this embedded data instead of by a separate workspace list. This way, you don't need workspace SELECT access at all.

### Approach E: Add a `board_member_workspace_access` view or function

A database view that returns workspace IDs + names where the user has at least one board membership, with limited fields (just name, icon, color — not settings).

---

## Questions to Answer

1. **Which approach is cleanest and most maintainable?**
2. **What are the security implications?** (Can board-only members learn things about the workspace they shouldn't?)
3. **What are the performance implications?** (Additional joins, subqueries in RLS)
4. **What changes are needed at each layer?** (DB migration, RLS policy, service, hook, component)
5. **How does this affect the workspace settings/members page?** (Board-only members shouldn't appear there)
6. **Should we introduce a concept like "limited workspace visibility" vs "full workspace membership"?**
7. **How do other tools handle this?** (monday.com, Notion, Trello, Asana — how do they separate board-level vs workspace-level access?)

Be brutally honest. If our current model is fundamentally flawed and needs rethinking, say so. If the simplest approach is good enough, say that too. We care about getting the right answer, not the clever one.
