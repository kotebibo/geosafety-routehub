# Subitems & Board Tabs — Architecture Research

## 1. Database Schema

### Subitems: Separate table (not self-referential)

Use a separate `board_subitems` table, not a self-referential `board_items`. The reasons are practical:

- Subitems have their own column schema (different from parent board columns). Storing that per-parent-item or per-board-subitem config is simpler when it's isolated.
- RLS policies become cleaner — you can write a policy that says "user can access this subitem if they have access to the board the parent item belongs to" without recursive CTEs.
- Monday.com itself uses a separate conceptual model. ClickUp also separates subtasks. The only app that truly self-references is Notion, and that's because everything in Notion is a block — a fundamentally different model.
- Performance: fetching a board's items doesn't accidentally drag in subitem data. You load subitems on-demand per expanded row.

**Don't support multi-level nesting** for now. It's a product trap — building it quadruples complexity for a feature almost nobody uses. Monday.com, Linear, and ClickUp all cap at one level.

### Board tabs: extend `board_views`

Your existing `board_views` table is the right place. Add a `position` column if it doesn't exist, a `view_type` enum, and a `is_default` flag. The main table view should always exist and be non-deletable — enforce this at the application layer, not the database layer (simpler).

### SQL Migrations

```sql
-- Subitem column definitions (per board, shared across all items on that board)
CREATE TABLE board_subitem_columns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL,  -- same ColumnType enum as parent
  position    INTEGER NOT NULL DEFAULT 0,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subitem_columns_board ON board_subitem_columns(board_id);

-- Subitems
CREATE TABLE board_subitems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_item_id  UUID NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
  board_id        UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_values   JSONB DEFAULT '{}',
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id)
);

-- Critical: position is scoped to parent_item_id
CREATE INDEX idx_subitems_parent ON board_subitems(parent_item_id, position);
CREATE INDEX idx_subitems_board  ON board_subitems(board_id);

-- Extend board_views for tabs
ALTER TABLE board_views
  ADD COLUMN IF NOT EXISTS position   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_type  TEXT NOT NULL DEFAULT 'table',
  ADD COLUMN IF NOT EXISTS icon       TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- View types: 'table' | 'kanban' | 'calendar' | 'chart' | 'timeline' | 'gallery' | 'form'
-- Enforce one default per board
CREATE UNIQUE INDEX idx_board_views_default
  ON board_views(board_id) WHERE is_default = TRUE;

-- Seed default table view for existing boards (run once)
INSERT INTO board_views (board_id, view_type, name, position, is_default)
SELECT id, 'table', 'Main Table', 0, TRUE
FROM boards
WHERE NOT EXISTS (
  SELECT 1 FROM board_views WHERE board_views.board_id = boards.id AND is_default = TRUE
);
```

---

## 2. TypeScript Interfaces

```typescript
// --- Subitems ---

export interface BoardSubitemColumn {
  id: string
  board_id: string
  title: string
  type: ColumnType // reuse your existing enum
  position: number
  settings?: Record<string, any>
}

export interface BoardSubitem {
  id: string
  parent_item_id: string
  board_id: string
  column_values: Record<string, any>
  position: number
  created_at: string
  updated_at: string
  created_by?: string
}

// Augmented item — what the UI works with after fetching
export interface BoardItemWithSubitems extends BoardItem {
  subitem_count: number // from a count query or aggregation
  subitems?: BoardSubitem[] // loaded lazily on expand
  is_expanded?: boolean // local UI state only, never persisted
}

// --- Tabs / Views ---

export type ViewType = 'table' | 'kanban' | 'calendar' | 'chart' | 'timeline' | 'gallery' | 'form'

// View-specific config payloads — keep them typed
export interface KanbanViewConfig {
  grouping_column_id: string
  card_columns: string[] // column IDs to show on cards
}

export interface CalendarViewConfig {
  date_column_id: string
  title_column_id: string
}

export interface ChartViewConfig {
  chart_type: 'bar' | 'pie' | 'line'
  x_column_id: string
  y_column_id?: string
}

export interface TimelineViewConfig {
  start_date_column_id: string
  end_date_column_id?: string
  label_column_id: string
}

export type ViewConfig =
  | KanbanViewConfig
  | CalendarViewConfig
  | ChartViewConfig
  | TimelineViewConfig
  | Record<string, never> // for views with no config (gallery, form)

export interface BoardView {
  id: string
  board_id: string
  view_type: ViewType
  name: string
  position: number
  is_default: boolean
  icon?: string
  config: ViewConfig
  created_at: string
  updated_at: string
}
```

---

## 3. Component Architecture

**Key architectural decisions:**

- `BoardViewTabs` is a new component that sits above `BoardToolbar`. It owns the active view state.
- Use URL-based routing for tab switching — put the view ID in the URL (`/boards/[id]?view=abc123`). This means tab state survives page refresh and is shareable. Do NOT use local React state for this.
- `VirtualizedBoardTable` gets modified to understand two row types: parent rows and subitem rows. Both get passed to the virtualizer's items array. When a parent is expanded, you splice its subitems into the flat array immediately after the parent row.

---

## 4. Data Fetching Strategy

```typescript
// --- Board views (tabs) ---

export function useBoardViews(boardId: string) {
  return useQuery({
    queryKey: ['boards', boardId, 'views'],
    queryFn: () =>
      supabase.from('board_views').select('*').eq('board_id', boardId).order('position'),
  })
}

export function useUpdateBoardView() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<BoardView> & { id: string }) =>
      supabase.from('board_views').update(patch).eq('id', id),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['boards'] })
    },
  })
}

// --- Subitem columns (fetch once per board, cache aggressively) ---

export function useSubitemColumns(boardId: string) {
  return useQuery({
    queryKey: ['boards', boardId, 'subitem-columns'],
    queryFn: () =>
      supabase.from('board_subitem_columns').select('*').eq('board_id', boardId).order('position'),
    staleTime: 5 * 60 * 1000, // columns change rarely
  })
}

// --- Subitems: lazy per parent item ---

export function useSubitems(parentItemId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['subitems', parentItemId],
    queryFn: () =>
      supabase
        .from('board_subitems')
        .select('*')
        .eq('parent_item_id', parentItemId)
        .order('position'),
    enabled, // only fetch when parent row is expanded
    staleTime: 30_000,
  })
}

// --- Optimistic subitem count on parent items ---

export function useBoardItemsWithCounts(boardId: string) {
  return useQuery({
    queryKey: ['boards', boardId, 'items'],
    queryFn: async () => {
      const { data } = await supabase
        .from('board_items')
        .select(
          `
          *,
          subitem_count:board_subitems(count)
        `
        )
        .eq('board_id', boardId)
        .order('position')
      return data
    },
  })
}
```

### Cache Invalidation Rules

- Mutating a subitem → invalidate `['subitems', parentItemId]` only. Don't invalidate the whole board.
- Adding a subitem → also update the `subitem_count` in the parent item's cache entry via `qc.setQueryData` (optimistic update).
- Reordering subitems → optimistically update, no invalidation needed.
- Mutating board views → invalidate `['boards', boardId, 'views']`.

---

## 5. UX Recommendations

### Subitems

Every app that does this well follows the same pattern:

- The expand toggle is a small chevron/arrow on the left side of the row, only visible on hover for items that have no subitems yet, always visible for items that have subitems. Monday.com shows a subitem count badge ("3 subitems") that acts as the toggle.
- Subitem rows are visually distinguished by a 20–24px left indent plus a subtly different background (one step toward your secondary background color).
- Subitem columns are different from parent columns — show a mini column header row immediately below the parent row when expanded, before the first subitem. This is what Monday.com does and it's clarifying.
- Subitems are hidden from sort/filter/group operations on the parent board. They exist outside those axes. This is a firm UX rule — don't let subitems bubble up into group counts.

**What to avoid with subitems:**

- Don't show subitem cells in the parent columns — it makes no sense since the columns differ. Just show a count/summary badge.
- Don't let subitems participate in drag-and-drop reordering with parent items. Their drag scope is within their parent only.
- Don't make subitems filterable in the main board filter toolbar on day one. It adds enormous complexity for minimal return.

### Board Tabs (Linear pattern)

- Horizontal tabs as pills, with an overflow `+N` when too many to fit. Clicking `+N` opens a dropdown of the hidden tabs.
- A `+` button at the end that opens a modal/sheet with available view types and preview icons.
- Active tab has a filled background pill. Inactive tabs are ghost/text-only.
- Each tab remembers its own toolbar state (filters, sorts, grouping) — this is the main value of tabs. Implement this from day one or tabs feel useless.
- The default table view has no delete option — grey out the delete in the tab context menu.

---

## 6. Implementation Roadmap

### Phase 1 — Tabs (2–3 days)

This comes first because it's entirely additive. No existing component is broken. You're adding `BoardViewTabs`, running the migration to extend `board_views`, and wiring URL-based tab state.

Start with just the table view tab — so the UI shows one non-deletable tab. Then add the "Add view" button that creates new blank tabs. Then implement Kanban (the highest-value second view). Calendar and Timeline come later.

### Phase 2 — Subitem Data Layer (1–2 days)

Run the subitems migration. Add `useSubitems` and `useSubitemColumns` hooks. Add the subitem CRUD mutations. No UI yet. Write the Supabase RLS policies at this step.

### Phase 3 — Subitem UI (3–4 days)

This is the hardest phase. Modify `VirtualizedBoardTable` to handle a flat items array that interleaves parent and subitem rows. Implement `SubitemRow`, `SubitemColumnHeaders`, and `AddSubitemRow`. Wire the expand toggle in `MemoizedTableRow`.

### Phase 4 — Polish (1–2 days)

Subitem drag-to-reorder, tab drag-to-reorder, subitem count badges, keyboard nav for subitems.

---

## 7. Performance Considerations

### The virtualization problem with subitems

Your virtualizer (TanStack Virtual or react-window) works with a flat array of items. When subitems are expanded, you need to splice them into that flat array.

The right approach is to compute a `flatItems` derived value:

```typescript
const flatItems = useMemo(() => {
  const result: (BoardItemWithSubitems | BoardSubitem)[] = []
  for (const item of boardItems) {
    result.push(item)
    if (expandedItemIds.has(item.id) && item.subitems) {
      result.push(...item.subitems)
    }
  }
  return result
}, [boardItems, expandedItemIds])
```

Then your virtualizer uses `flatItems.length` and renders each row based on its type (parent vs subitem). The key issue is that parent rows and subitem rows have different heights — TanStack Virtual's `estimateSize` callback handles this by checking the item type.

**Don't prefetch all subitems on board load.** With 500 items that each have 5 subitems, that's 2,500 extra rows fetched before the user has asked for any of them. Fetch on expand only.

### RLS policies for subitems

The simplest correct policy:

```sql
CREATE POLICY "subitems_select" ON board_subitems
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );
```
