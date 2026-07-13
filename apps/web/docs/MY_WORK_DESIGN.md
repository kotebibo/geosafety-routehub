# My Work Feature — Design Doc

## What It Is

A personal dashboard at `/my-work` that shows all board items assigned to the current user across every board they have access to, grouped by date. Modeled after monday.com's "My Work" feature.

## User Experience

### Layout

- Full-page view accessible from sidebar
- Items grouped into collapsible date sections
- Each item shows: item name, board name (linked), status, date, person

### Date Groups (top to bottom)

| Group         | Condition                       |
| ------------- | ------------------------------- |
| **Past Due**  | date < today                    |
| **Today**     | date = today                    |
| **This Week** | date is this week (after today) |
| **Next Week** | date is next week               |
| **Later**     | date > next week                |
| **No Date**   | no date column value            |

### Inline Actions

- Change status (click status cell)
- Change date (click date cell)
- Click item name → navigate to board with item focused
- Click board name → navigate to board

### Customization (v2)

- Filter by board
- Filter by status
- Switch grouping: by date / by board / by status

## Data Model

### How Assignment Works

- `board_columns` table has columns with `column_type = 'person'`
- Column values are stored in `board_items.data[column_id]`
- Person values: `string` (single user ID) or `string[]` (multiple user IDs)
- An item is "assigned to me" if my `user.id` appears in ANY person-type column

### How Dates Work

- `board_columns` with `column_type = 'date'` and `config.is_due_date = true`
- Date values stored as ISO strings in `board_items.data[column_id]`
- Also: top-level `board_items.due_date` field (may be null)
- For grouping, prefer columns with `is_due_date` config, fall back to top-level `due_date`

## Technical Plan

### Phase 1: Database — RPC Function

Create a Supabase migration with an RPC function `get_my_work_items(p_user_id UUID)`:

```sql
-- Approach:
-- 1. Find boards where user is a member (board_members)
-- 2. Find person-type columns for those boards (board_columns)
-- 3. Find items where user_id appears in any person column's data value
-- 4. Return items with board name, group name, and column metadata

CREATE OR REPLACE FUNCTION get_my_work_items(p_user_id UUID)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  board_id UUID,
  board_name TEXT,
  board_icon TEXT,
  board_color TEXT,
  group_id UUID,
  group_name TEXT,
  group_color TEXT,
  item_data JSONB,
  item_status TEXT,
  item_due_date DATE,
  item_position INT,
  item_created_at TIMESTAMPTZ,
  item_updated_at TIMESTAMPTZ,
  person_column_ids TEXT[]   -- which person columns matched
)
AS $$
BEGIN
  RETURN QUERY
  WITH user_boards AS (
    SELECT bm.board_id
    FROM board_members bm
    WHERE bm.user_id = p_user_id
  ),
  person_columns AS (
    SELECT bc.board_id, bc.column_id
    FROM board_columns bc
    JOIN user_boards ub ON bc.board_id = ub.board_id
    WHERE bc.column_type = 'person'
  ),
  matched_items AS (
    SELECT DISTINCT
      bi.id,
      array_agg(DISTINCT pc.column_id) AS matched_columns
    FROM board_items bi
    JOIN person_columns pc ON bi.board_id = pc.board_id
    WHERE bi.deleted_at IS NULL
    AND (
      -- Check string value (single person)
      bi.data ->> pc.column_id = p_user_id::text
      OR
      -- Check array value (multiple people)
      bi.data -> pc.column_id @> to_jsonb(p_user_id::text)
    )
    GROUP BY bi.id
  )
  SELECT
    bi.id AS item_id,
    bi.name AS item_name,
    b.id AS board_id,
    b.name AS board_name,
    b.icon AS board_icon,
    b.color AS board_color,
    bg.id AS group_id,
    bg.name AS group_name,
    bg.color AS group_color,
    bi.data AS item_data,
    bi.status AS item_status,
    bi.due_date::date AS item_due_date,
    bi.position AS item_position,
    bi.created_at AS item_created_at,
    bi.updated_at AS item_updated_at,
    mi.matched_columns AS person_column_ids
  FROM matched_items mi
  JOIN board_items bi ON bi.id = mi.id
  JOIN boards b ON b.id = bi.board_id
  LEFT JOIN board_groups bg ON bg.id = bi.group_id
  ORDER BY bi.due_date ASC NULLS LAST, bi.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Phase 2: Service Layer

**New file:** `src/services/my-work.service.ts`

```typescript
export const myWorkService = {
  getMyWorkItems: async (userId: string) => {
    const { data, error } = await supabase.rpc('get_my_work_items', {
      p_user_id: userId,
    })
    if (error) throw error
    return data
  },
}
```

### Phase 3: Hook Layer

**New file:** `src/features/my-work/hooks/useMyWork.ts`

- `useMyWorkItems(userId)` — TanStack Query hook calling the service
- `useMyWorkGroups(items)` — groups items into date buckets
- Reuse `useUpdateBoardItemField` for inline edits (needs board_id context)

### Phase 4: UI Components

**New files:**

```
src/features/my-work/
├── components/
│   ├── MyWorkPage.tsx        — main page component
│   ├── MyWorkDateGroup.tsx   — collapsible date section
│   ├── MyWorkItem.tsx        — single item row
│   └── MyWorkEmptyState.tsx  — empty state illustration
├── hooks/
│   └── useMyWork.ts
├── services/
│   └── index.ts              — re-exports from root
└── index.ts                  — barrel exports
```

**Page:** `app/my-work/page.tsx` — Next.js page (default export)

### Phase 5: Navigation

Add to `Sidebar.tsx` navItems:

```typescript
{
  href: '/my-work',
  label: 'ჩემი სამუშაო',
  labelEn: 'My Work',
  icon: ClipboardCheck,  // or UserCheck
  permission: 'pages:my_work',
}
```

Position: after Home, before News (it's a personal productivity view).

## Item Row Design

```
┌──────────────────────────────────────────────────────────────┐
│ ● Item Name                Board Name    Status    Jun 15    │
│   └─ Group Name                          [Done ▾]  [📅]     │
└──────────────────────────────────────────────────────────────┘
```

- Left: colored dot (board color) + item name (bold) + group name (subtle)
- Middle: board name as link
- Right: inline-editable status + date cells (reuse existing cell components)

## Performance

- Single RPC call fetches everything — no N+1 queries
- `SECURITY DEFINER` ensures RLS doesn't block cross-board access (function runs as owner)
- Limit: cap at 500 items (matching monday.com's 1000 limit but starting conservative)
- TanStack Query with 30s staleTime (same as board items)
- Optimistic updates for status/date changes

## Scope

### v1 (MVP)

- Date-grouped view
- Inline status & date editing
- Navigate to source board
- Sidebar nav entry

### v2 (Later)

- Group by board / status / priority
- Filter by board / status
- Calendar view toggle
- Search within My Work
- Customization panel (show/hide boards, columns)

## Migration Needed

- One SQL migration for the `get_my_work_items` RPC function
- No schema changes — reads existing tables only

## Columns to Fetch for Display

For each item, we need to know which columns the board has to render inline cells.
The RPC returns `item_data` (full JSONB) + `person_column_ids`.
For status/date rendering, the frontend can derive from `item_status` and `item_due_date` fields,
or we can add a second lightweight query to fetch board columns for the boards present in the result set.
