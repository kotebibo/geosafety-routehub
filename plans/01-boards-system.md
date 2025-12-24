# Boards System Improvement Plan

## Overview
The Boards system is a Monday.com-style collaborative workboard implementation with 45+ components. It's the most complex feature in the application and requires strategic improvements for maintainability and performance.

## Current State Analysis

### Strengths
- Rich feature set with 14+ column types
- Real-time collaboration via Ably
- Activity tracking with full history
- Drag-and-drop support with @dnd-kit

### Pain Points
- MondayBoardTable.tsx is still ~1,460 lines (reduced from 1,952)
- Cell components have inconsistent patterns
- Complex prop drilling through components
- Performance concerns with large datasets

## Improvement Areas

### 1. Component Architecture Refactoring

#### 1.1 Extract Remaining Sub-components
```
BoardTable/
├── MondayBoardTable.tsx (main orchestrator, ~500 lines target)
├── components/
│   ├── TableHeader.tsx
│   ├── TableBody.tsx
│   ├── GroupRow.tsx
│   ├── ItemRow.tsx
│   ├── AddColumnPopup.tsx
│   ├── AllColumnsModal.tsx
│   └── CustomScrollbar.tsx
├── cells/
│   └── (existing cell components)
├── hooks/
│   ├── useTableState.ts
│   ├── useGroupManagement.ts
│   └── useRowSelection.ts
└── constants.ts
```

#### 1.2 Implement Compound Component Pattern
```typescript
// Usage example
<BoardTable board={board}>
  <BoardTable.Toolbar />
  <BoardTable.Header />
  <BoardTable.Body>
    {groups.map(group => (
      <BoardTable.Group key={group.id} group={group}>
        {items.map(item => (
          <BoardTable.Row key={item.id} item={item} />
        ))}
      </BoardTable.Group>
    ))}
  </BoardTable.Body>
  <BoardTable.Footer />
</BoardTable>
```

### 2. State Management Improvements

#### 2.1 Create Board Context
```typescript
// contexts/BoardContext.tsx
interface BoardContextValue {
  board: Board
  columns: BoardColumn[]
  items: BoardItem[]
  groups: BoardGroup[]
  selection: Set<string>
  editingCell: { rowId: string; columnId: string } | null
  // Actions
  updateCell: (rowId: string, columnId: string, value: unknown) => void
  selectRows: (rowIds: string[]) => void
  // ... more actions
}
```

#### 2.2 Implement useReducer for Complex State
```typescript
type BoardAction =
  | { type: 'SELECT_ROW'; rowId: string }
  | { type: 'DESELECT_ROW'; rowId: string }
  | { type: 'UPDATE_CELL'; rowId: string; columnId: string; value: unknown }
  | { type: 'REORDER_COLUMNS'; columnIds: string[] }
  | { type: 'COLLAPSE_GROUP'; groupId: string }
  // ... more actions
```

### 3. Performance Optimizations

#### 3.1 Virtualization for Large Datasets
```typescript
// Use @tanstack/react-virtual for row virtualization
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualizedBoardBody({ items }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // row height
    overscan: 5,
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <ItemRow
            key={items[virtualRow.index].id}
            item={items[virtualRow.index]}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

#### 3.2 Memoization Strategy
```typescript
// Memoize cell components
const MemoizedCell = memo(CellRenderer, (prev, next) => {
  return (
    prev.value === next.value &&
    prev.column.id === next.column.id &&
    prev.isEditing === next.isEditing
  )
})

// Memoize row components
const MemoizedRow = memo(ItemRow, (prev, next) => {
  return (
    prev.item.updated_at === next.item.updated_at &&
    prev.isSelected === next.isSelected
  )
})
```

#### 3.3 Debounced Updates
```typescript
// Debounce cell updates to reduce API calls
const debouncedUpdate = useDebouncedCallback(
  (rowId: string, columnId: string, value: unknown) => {
    updateCell(rowId, columnId, value)
  },
  300
)
```

### 4. Cell Component Standardization

#### 4.1 Create Base Cell Interface
```typescript
interface BaseCellProps<T = unknown> {
  value: T
  row: BoardItem
  column: BoardColumn
  isEditing: boolean
  onEdit: (value: T) => void
  onEditStart?: () => void
  onEditEnd?: () => void
}

interface CellComponent<T = unknown> {
  (props: BaseCellProps<T>): JSX.Element
  displayName: string
  defaultValue: T
  validate?: (value: T) => boolean
}
```

#### 4.2 Cell Registry Pattern
```typescript
// cells/registry.ts
const cellRegistry: Record<ColumnType, CellComponent> = {
  text: TextCell,
  number: NumberCell,
  status: StatusCell,
  date: DateCell,
  // ... all cell types
}

export function getCellComponent(type: ColumnType): CellComponent {
  return cellRegistry[type] || TextCell
}
```

### 5. Real-time Collaboration Improvements

#### 5.1 Optimistic Updates
```typescript
function useOptimisticUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCell,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['board', boardId])

      // Snapshot previous value
      const previous = queryClient.getQueryData(['board', boardId])

      // Optimistically update
      queryClient.setQueryData(['board', boardId], (old) => ({
        ...old,
        items: old.items.map(item =>
          item.id === variables.rowId
            ? { ...item, data: { ...item.data, [variables.columnId]: variables.value } }
            : item
        ),
      }))

      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['board', boardId], context.previous)
    },
  })
}
```

#### 5.2 Conflict Resolution
```typescript
interface CellEdit {
  userId: string
  timestamp: number
  value: unknown
}

function resolveConflict(local: CellEdit, remote: CellEdit): CellEdit {
  // Last-write-wins with timestamp
  return local.timestamp > remote.timestamp ? local : remote
}
```

### 6. Accessibility Improvements

#### 6.1 Keyboard Navigation Enhancement
```typescript
const keyboardHandlers = {
  ArrowUp: () => moveFocus('up'),
  ArrowDown: () => moveFocus('down'),
  ArrowLeft: () => moveFocus('left'),
  ArrowRight: () => moveFocus('right'),
  Enter: () => startEditing(),
  Escape: () => cancelEditing(),
  Tab: () => moveFocus('next'),
  'Shift+Tab': () => moveFocus('prev'),
  'Ctrl+C': () => copySelection(),
  'Ctrl+V': () => pasteSelection(),
}
```

#### 6.2 ARIA Attributes
```typescript
<table
  role="grid"
  aria-label={`${board.name} board`}
  aria-rowcount={items.length}
  aria-colcount={columns.length}
>
  <tbody>
    {items.map((item, rowIndex) => (
      <tr
        key={item.id}
        role="row"
        aria-rowindex={rowIndex + 1}
        aria-selected={selectedRows.has(item.id)}
      >
        {columns.map((column, colIndex) => (
          <td
            key={column.id}
            role="gridcell"
            aria-colindex={colIndex + 1}
            aria-readonly={!column.editable}
          />
        ))}
      </tr>
    ))}
  </tbody>
</table>
```

## Implementation Priority

### Phase 1: Architecture (Week 1-2)
1. Create BoardContext for state management
2. Extract TableHeader, TableBody, GroupRow components
3. Implement compound component pattern

### Phase 2: Performance (Week 3-4)
1. Add virtualization for large datasets
2. Implement proper memoization
3. Add debounced updates

### Phase 3: Standardization (Week 5-6)
1. Create base cell interface
2. Implement cell registry
3. Standardize all cell components

### Phase 4: Polish (Week 7-8)
1. Improve accessibility
2. Add comprehensive keyboard navigation
3. Implement conflict resolution

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| MondayBoardTable.tsx lines | ~1,460 | <500 |
| Time to render 1000 rows | TBD | <100ms |
| Bundle size (boards feature) | TBD | -30% |
| Accessibility score | TBD | 100% |

## Dependencies
- @tanstack/react-virtual for virtualization
- Existing @dnd-kit for drag-and-drop
- React Query for data fetching

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes during refactor | Comprehensive test coverage first |
| Performance regression | Benchmark before/after each change |
| Real-time sync issues | Implement robust conflict resolution |
