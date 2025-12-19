# GeoSafety RouteHub - Code Walkthrough

This document explains the codebase line-by-line for junior developers. It covers two main systems:
1. **Boards System** - Monday.com-style tables with columns, groups, and cells
2. **Route Optimizer** - TSP algorithm with real road distance integration

---

# PART 1: BOARDS SYSTEM

The boards system is a Monday.com clone that allows users to create customizable tables with different column types (text, status, date, etc.). Let's break it down layer by layer.

---

## 1.1 Types (The Data Contracts)

📁 **File:** `apps/web/src/features/boards/types/board.ts`

Types define the "shape" of your data. Think of them as contracts that TypeScript enforces.

```typescript
// Line 3: Union type - BoardType can ONLY be one of these strings
export type BoardType = 'routes' | 'companies' | 'inspectors' | 'inspections' | 'custom'
```

**💡 Pattern: Union Types**
- Instead of using `string`, we use specific values
- TypeScript will catch typos: `board_type: 'rotues'` ❌ (error!)
- Gives autocomplete in VS Code

```typescript
// Lines 5-19: ColumnType - all possible column types
export type ColumnType =
  | 'text'
  | 'status'
  | 'person'
  | 'date'
  // ... etc
```

**💡 Why This Matters:**
When you add a new column type (like we did with 'files', 'updates'), you add it here FIRST. Then TypeScript tells you everywhere you need to handle it.

---

### The Board Interface (Lines 24-39)

```typescript
export interface Board {
  id: string                    // Unique identifier (UUID from Supabase)
  owner_id: string              // Who created this board
  board_type: BoardType         // Uses our union type above
  name: string                  // Display name
  name_ka?: string              // ? means OPTIONAL (Georgian translation)
  description?: string          // Optional description
  icon?: string                 // Optional icon
  color?: string                // Optional color
  is_template: boolean          // Is this a template others can copy?
  is_public: boolean            // Can non-members view it?
  folder_id?: string            // Optional: which folder it's in
  settings: BoardSettings       // Nested object (defined below)
  created_at: string            // ISO timestamp
  updated_at: string            // ISO timestamp
}
```

**💡 Pattern: Required vs Optional**
- No `?` = required (TypeScript error if missing)
- With `?` = optional (can be undefined)

---

### BoardItem (Rows in the Table) - Lines 53-68

```typescript
export interface BoardItem {
  id: string
  board_id: string              // Which board this belongs to
  group_id?: string             // Which group (like "To Do", "In Progress")
  position: number              // Order in the list (0, 1, 2...)
  data: Record<string, any>     // IMPORTANT: Dynamic fields as JSON!
  name: string                  // The first column value
  status: StatusType            // Status column value
  assigned_to?: string          // Person column value
  due_date?: string             // Date column value
  priority: number              // 1, 2, 3 for priority
  created_by?: string
  created_at: string
  updated_at: string
}
```

**💡 Key Insight: The `data` Field**

```typescript
data: Record<string, any>  // This is a dictionary/object
```

This is how we store dynamic columns! Instead of having a fixed database column for every possible field, we use JSONB:

```typescript
// Example: A board item with custom columns
{
  id: "abc123",
  name: "Task 1",
  data: {
    custom_text_1: "Some text",
    my_number_col: 42,
    status_column: { label: "Done", color: "#00c875" }
  }
}
```

**Why JSONB?**
- No database migrations when users add columns
- Each board can have different columns
- Flexible but still queryable in PostgreSQL

---

### BoardColumn (Column Configuration) - Lines 129-143

```typescript
export interface BoardColumn {
  id: string                    // Supabase row ID
  board_type: BoardType         // Which board type this column belongs to
  column_id: string             // The key used in item.data["column_id"]
  column_name: string           // Display name ("Due Date")
  column_name_ka?: string       // Georgian name
  column_type: ColumnType       // text, status, date, etc.
  is_visible: boolean           // Show/hide in table
  is_pinned: boolean            // Stick to left side
  position: number              // Order (0, 1, 2...)
  width: number                 // Pixel width
  config: Record<string, any>   // Column-specific settings
  created_at?: string
  updated_at?: string
}
```

**💡 Pattern: Separation of Concerns**
- `column_id` = the data key (machine-readable)
- `column_name` = display text (human-readable)
- This allows renaming without breaking data

---

## 1.2 Service Layer (Database Operations)

📁 **File:** `apps/web/src/features/boards/services/boards.service.ts`

The service layer handles ALL database operations. Components never talk to Supabase directly.

```typescript
// Line 1: Import Supabase client
import { getSupabase } from '@/lib/supabase'

// Line 14: Cast to 'any' to bypass strict typing
// (Sometimes Supabase types don't match our schema)
const supabase = getSupabase() as any
```

**💡 Pattern: Singleton Service Object**

```typescript
// Line 20: Export a single service object
export const boardsService = {
  // All methods live here
}
```

Why an object instead of a class?
- Simpler syntax
- No need for `new BoardsService()`
- Tree-shakeable (unused methods can be removed)

---

### getColumns Method (Lines 28-49)

```typescript
async getColumns(boardType: BoardType, boardId?: string): Promise<BoardColumn[]> {
  // Step 1: Query Supabase
  const { data, error } = await supabase
    .from('board_columns')           // Table name
    .select('*')                     // Get all columns
    .eq('board_type', boardType)     // WHERE board_type = ?
    .order('position', { ascending: true })  // ORDER BY position ASC

  // Step 2: Handle errors
  if (error) throw error

  // Step 3: Client-side filtering for board-specific columns
  if (boardId && data && data.length > 0) {
    const hasBoardIdColumn = 'board_id' in data[0]
    if (hasBoardIdColumn) {
      // Include default columns (board_id = null) OR this board's columns
      return data.filter((col: any) => !col.board_id || col.board_id === boardId)
    }
  }

  return data || []
}
```

**💡 Pattern: Supabase Query Builder**

```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)
```

- Returns `{ data, error }` - always check error first!
- Chainable methods: `.eq()`, `.order()`, `.limit()`
- `select('*')` = all columns, `select('id, name')` = specific columns

---

### createColumn Method (Lines 120-138)

```typescript
async createColumn(column: {
  board_type: BoardType
  board_id?: string           // Optional: makes column specific to one board
  column_id: string
  column_name: string         // IMPORTANT: Must match DB column name!
  column_type: string
  width: number
  position: number
  is_visible: boolean
}): Promise<BoardColumn> {
  const { data, error } = await supabase
    .from('board_columns')
    .insert(column)           // INSERT INTO board_columns VALUES (...)
    .select()                 // Return the inserted row
    .single()                 // Expect exactly one result

  if (error) throw error
  return data
}
```

**💡 Common Bug We Fixed:**
The original code used `label` but the database column was `column_name`. Always check your database schema!

---

### applyFilters Helper (Lines 356-423)

This is a powerful pattern for building dynamic queries:

```typescript
applyFilters(query: any, filters: BoardFilter[]): any {
  let modifiedQuery = query

  filters.forEach((filter) => {
    const { column_id, operator, value } = filter

    switch (operator) {
      case 'equals':
        modifiedQuery = modifiedQuery.eq(column_id, value)
        break
      case 'contains':
        modifiedQuery = modifiedQuery.ilike(column_id, `%${value}%`)
        break
      case 'greater_than':
        modifiedQuery = modifiedQuery.gt(column_id, value)
        break
      // ... more operators
    }
  })

  return modifiedQuery
}
```

**💡 Pattern: Query Builder + Filter Translation**

This translates user-friendly filter objects into Supabase query methods:

```typescript
// User creates filter in UI:
{ column_id: 'price', operator: 'greater_than', value: 100 }

// Gets translated to:
query.gt('price', 100)

// Which becomes SQL:
// WHERE price > 100
```

---

## 1.3 React Query Hooks (State Management)

📁 **File:** `apps/web/src/features/boards/hooks/useUserBoards.ts`

This file uses **TanStack Query** (React Query) for server state management.

```typescript
// Lines 1-6: Imports
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userBoardsService } from '../services/user-boards.service'
import { queryKeys } from '@/lib/react-query'
```

**💡 Why React Query?**
- Automatic caching
- Background refetching
- Loading/error states
- Optimistic updates
- Deduplication (multiple components, one request)

---

### Basic Query Hook (Lines 13-19)

```typescript
export function useUserBoards(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'user-boards', userId],
    queryFn: () => userBoardsService.getBoards(userId),
    enabled: !!userId,  // Don't run if userId is empty
  })
}
```

**💡 The queryKey Explained:**

```typescript
queryKey: [...queryKeys.routes.all, 'user-boards', userId]
// Results in: ['routes', 'user-boards', 'abc123']
```

- Keys are arrays that uniquely identify data
- React Query uses these for caching
- Changing `userId` = new cache entry
- `invalidateQueries({ queryKey: [...] })` refreshes data

---

### Mutation with Optimistic Update (Lines 181-225)

This is an advanced pattern. Let's break it down:

```typescript
export function useUpdateBoardItem(boardId: string) {
  const queryClient = useQueryClient()  // Access the cache

  return useMutation({
    // The actual API call
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<BoardItem> }) =>
      userBoardsService.updateBoardItem(itemId, updates),

    // OPTIMISTIC UPDATE: Update UI before server responds
    onMutate: async ({ itemId, updates }) => {
      // Step 1: Cancel any in-flight refetches (avoid overwriting our update)
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })

      // Step 2: Snapshot current data (for rollback)
      const previousItems = queryClient.getQueryData<BoardItem[]>([
        ...queryKeys.routes.all,
        'board-items',
        boardId,
      ])

      // Step 3: Optimistically update cache
      if (previousItems) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-items', boardId],
          previousItems.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        )
      }

      // Return context for rollback
      return { previousItems }
    },

    // ROLLBACK: If server fails, restore previous data
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-items', boardId],
          context.previousItems
        )
      }
    },

    // ALWAYS: Refetch to ensure sync with server
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    },
  })
}
```

**💡 Why Optimistic Updates?**

Without optimistic updates:
1. User clicks "Done" ✓
2. Wait 200-500ms for server
3. UI updates

With optimistic updates:
1. User clicks "Done" ✓
2. UI updates INSTANTLY
3. Server updates in background
4. If fails, rollback

This makes the app feel instant!

---

## 1.4 The Main Table Component

📁 **File:** `apps/web/src/features/boards/components/BoardTable/MondayBoardTable.tsx`

This is a 1500+ line component. Let's break it into digestible parts.

### Imports & Constants (Lines 1-67)

```typescript
'use client'  // Next.js: This component runs in browser, not server

import React, { useState, useMemo, useRef, useCallback, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'  // Render outside component tree
// ... more imports

// Essential column types for quick-add popup
const ESSENTIAL_COLUMNS: { type: ColumnType; label: string; icon: React.ElementType }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'number', label: 'Numbers', icon: Hash },
  { type: 'status', label: 'Status', icon: CheckSquare },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'person', label: 'Person', icon: User },
]
```

**💡 Pattern: `'use client'` Directive**
- Next.js 13+ uses server components by default
- Interactive components need `'use client'`
- Always at the TOP of the file

---

### Component Props Interface (Lines 181-208)

```typescript
interface MondayBoardTableProps {
  boardType: BoardType
  columns: BoardColumn[]
  data: BoardItem[]
  groups?: BoardGroup[]
  isLoading?: boolean
  onRowClick?: (row: BoardItem) => void
  onCellEdit?: (rowId: string, columnId: string, value: any) => void
  onSelectionChange?: (selection: Set<string>) => void
  onAddItem?: (groupId?: string) => void
  onColumnResize?: (columnId: string, width: number) => void
  // ... more handlers

  // Real-time collaboration props
  presence?: BoardPresence[]
  onCellEditStart?: (itemId: string, columnId: string) => void
  onCellEditEnd?: () => void
}
```

**💡 Pattern: Callback Props**
- `onSomething` = callback function
- Parent passes handler, child calls it
- Keeps state in parent (lifting state up)

---

### State Management (Lines 247-289)

```typescript
export function MondayBoardTable({ ... }: MondayBoardTableProps) {
  // UI State
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null)
  const [showAddColumnPopup, setShowAddColumnPopup] = useState(false)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)

  // Refs for DOM elements
  const editInputRef = useRef<HTMLInputElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Column resizing state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)
```

**💡 Pattern: `useState` vs `useRef`**

| useState | useRef |
|----------|--------|
| Re-renders component | Does NOT re-render |
| For UI-related state | For DOM refs or mutable values |
| `collapsedGroups` | `resizeStartX` (temporary tracking) |

---

### Performance Optimization with useMemo (Lines 316-332)

```typescript
// Pre-compute editing users Map for O(1) lookups
const editingUsersMap = useMemo(() => {
  const map = new Map<string, BoardPresence[]>()
  for (const p of presence) {
    if (p.editing_item_id && p.editing_column_id) {
      const key = `${p.editing_item_id}:${p.editing_column_id}`
      const existing = map.get(key) || []
      existing.push(p)
      map.set(key, existing)
    }
  }
  return map
}, [presence])  // Only recompute when presence changes

// O(1) lookup instead of O(n) filter
const getUsersEditingCell = useCallback((itemId: string, columnId: string) => {
  return editingUsersMap.get(`${itemId}:${columnId}`) || []
}, [editingUsersMap])
```

**💡 Performance Pattern Explained:**

Without optimization:
```typescript
// Called for EVERY cell (100 rows × 10 cols = 1000 calls)
const editingUsers = presence.filter(p =>
  p.editing_item_id === itemId && p.editing_column_id === columnId
)
// O(n) × 1000 = SLOW
```

With optimization:
```typescript
// Build map once
const map = new Map()  // O(n) - once

// Lookup is instant
const editingUsers = map.get(key)  // O(1) × 1000 = FAST
```

---

### Column Resize Logic (Lines 561-605)

```typescript
const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string, currentWidth: number) => {
  e.preventDefault()
  e.stopPropagation()
  setResizingColumn(columnId)
  resizeStartX.current = e.clientX      // Store initial mouse X
  resizeStartWidth.current = currentWidth
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'  // Prevent text selection
}, [])

const handleResizeMove = useCallback((e: MouseEvent) => {
  if (!resizingColumn) return

  const delta = e.clientX - resizeStartX.current  // How far mouse moved
  const newWidth = Math.max(
    MIN_COLUMN_WIDTH,   // Don't go below 80px
    Math.min(MAX_COLUMN_WIDTH, resizeStartWidth.current + delta)  // Don't exceed 600px
  )

  setColumnWidths(prev => ({
    ...prev,
    [resizingColumn]: newWidth
  }))
}, [resizingColumn])
```

**💡 Pattern: Global Event Listeners**

```typescript
useEffect(() => {
  if (resizingColumn) {
    // Attach to document (not element) to capture mouse even outside
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)

    return () => {
      // Cleanup on unmount or when resizing stops
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }
}, [resizingColumn, handleResizeMove, handleResizeEnd])
```

Why attach to `document`?
- Mouse can move outside the column header
- Without this, resize would "stick" when cursor leaves element

---

### Grouping Items (Lines 648-731)

```typescript
const groupedItems = useMemo(() => {
  // Dynamic grouping by column value
  if (groupByColumn) {
    const groupsMap = new Map<string, BoardItem[]>()

    data.forEach(item => {
      const value = groupByColumn === 'name'
        ? item.name
        : item.data?.[groupByColumn]

      let groupKey: string
      if (value === null || value === undefined || value === '') {
        groupKey = '(Empty)'
      } else if (typeof value === 'boolean') {
        groupKey = value ? 'Yes' : 'No'
      } else if (typeof value === 'object') {
        groupKey = value.label || value.text || JSON.stringify(value)
      } else {
        groupKey = String(value)
      }

      const existing = groupsMap.get(groupKey) || []
      existing.push(item)
      groupsMap.set(groupKey, existing)
    })

    // Convert to array and sort
    return Array.from(groupsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([groupName, items], index) => ({
        group: { /* group object */ },
        items: items.sort(/* sort function */),
      }))
  }

  // Default: use predefined groups
  return groups.map((group) => ({
    group,
    items: data.filter((item) => getItemGroupId(item) === group.id),
  }))
}, [data, groups, columns, sortConfig, groupByColumn])
```

**💡 Pattern: Derived State with useMemo**

Instead of storing `groupedItems` in state and updating it manually:
- Compute it from `data`, `groups`, `groupByColumn`
- `useMemo` caches the result
- Automatically updates when dependencies change

---

## 1.5 Cell Renderer (Polymorphism in React)

📁 **File:** `apps/web/src/features/boards/components/BoardTable/CellRenderer.tsx`

```typescript
export const CellRenderer = memo(function CellRenderer(props: CellRendererProps) {
  const { column, row } = props

  switch (column.column_type as ColumnType) {
    case 'status':
      return <StatusCell {...props} />
    case 'date':
      return <DateCell {...props} />
    case 'number':
      return <NumberCell {...props} />
    case 'person':
      return <PersonCell value={props.value} onEdit={props.onEdit} />
    // ... more cases
    case 'text':
    default:
      return <TextCell {...props} />
  }
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.value === nextProps.value &&
    prevProps.column.id === nextProps.column.id &&
    prevProps.row?.id === nextProps.row?.id &&
    prevProps.isEditing === nextProps.isEditing
  )
})
```

**💡 Pattern: Polymorphic Component**

Instead of one giant component with if/else for each type, we:
1. Have a "router" component (CellRenderer)
2. Each type has its own specialized component
3. Easy to add new types: just add a case and create the component

**💡 Pattern: Custom Memo Comparison**

The second argument to `memo()` is a comparison function:
- Return `true` = props are "equal", don't re-render
- Return `false` = props changed, re-render

This is critical because CellRenderer is called for EVERY cell!

---

# PART 2: ROUTE OPTIMIZER

The route optimizer solves the **Traveling Salesman Problem (TSP)** - finding the shortest route that visits all locations.

---

## 2.1 Types

📁 **File:** `packages/route-optimizer/src/types.ts`

```typescript
export interface Location {
  id: string
  name: string
  lat: number   // Latitude
  lng: number   // Longitude
  address?: string
}

export interface OptimizationOptions {
  algorithm?: 'nearest-neighbor' | '2-opt' | 'hybrid'
  useRealRoads?: boolean   // Use OSRM for real driving distances
  maxStops?: number        // Limit number of locations
}

export interface OptimizedRoute {
  stops: RouteStop[]
  totalDistance: number
  originalDistance: number
  improvement: number       // Percentage improved
  algorithm: string
  metadata: {
    numLocations: number
    usingRealRoads: boolean
    routeGeometry: number[][] | null
  }
}
```

---

## 2.2 Distance Calculations

📁 **File:** `packages/route-optimizer/src/distance.ts`

### Haversine Formula (Lines 16-37)

```typescript
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371  // Earth's radius in kilometers

  // Convert degrees to radians
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 100) / 100
}
```

**💡 What is Haversine?**

The Haversine formula calculates the **great-circle distance** between two points on a sphere (Earth).

```
Point A (lat1, lng1) ----arc---- Point B (lat2, lng2)
          \                    /
           \    Earth's     /
            \   center    /
             \          /
              \       /
               \    /
                \ /
```

It's the "as the crow flies" distance - NOT road distance.

---

### Distance Matrix (Lines 47-69)

```typescript
export function createDistanceMatrix(locations: Location[]): number[][] {
  const n = locations.length

  // Create n×n matrix filled with zeros
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0))

  // Fill in distances
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0  // Distance to self is 0
      } else {
        matrix[i][j] = calculateDistance(
          locations[i].lat, locations[i].lng,
          locations[j].lat, locations[j].lng
        )
      }
    }
  }

  return matrix
}
```

**💡 What is a Distance Matrix?**

For 4 locations A, B, C, D:

```
      A     B     C     D
A  [  0    5.2   3.1   7.8  ]
B  [ 5.2    0    4.5   2.3  ]
C  [ 3.1   4.5    0    6.1  ]
D  [ 7.8   2.3   6.1    0   ]
```

- `matrix[0][1]` = distance from A to B = 5.2 km
- `matrix[i][j]` = distance from location i to location j
- Symmetric: `matrix[i][j] === matrix[j][i]`

---

## 2.3 OSRM Integration (Real Road Distances)

📁 **File:** `packages/route-optimizer/src/osrm.ts`

OSRM (Open Source Routing Machine) is a free service that calculates ACTUAL driving distances.

### The Table API (Lines 85-139)

```typescript
export async function getOSRMDistanceMatrix(
  locations: Array<{ lat: number; lng: number }>
): Promise<number[][]> {
  const n = locations.length

  // Format: lng,lat;lng,lat;lng,lat (NOTE: lng first!)
  const coordsStr = locations.map(loc => `${loc.lng},${loc.lat}`).join(';')

  const params = new URLSearchParams({
    annotations: 'distance',  // We want distance matrix
  })

  const url = `${OSRM_TABLE_URL}/${coordsStr}?${params}`

  const response = await fetch(url)
  const data: OSRMTableResponse = await response.json()

  if (data.code === 'Ok' && data.distances) {
    // Convert meters to kilometers
    return data.distances.map(row =>
      row.map(dist => (dist !== null ? dist / 1000 : 0))
    )
  }

  throw new Error(`OSRM Table returned code: ${data.code}`)
}
```

**💡 Why OSRM Table API is Better**

Old approach (pairwise):
```
10 locations = 10 × 9 / 2 = 45 API calls
25 locations = 25 × 24 / 2 = 300 API calls  (SLOW!)
```

Table API:
```
Any number of locations = 1 API call  (FAST!)
```

**💡 Coordinate Order Gotcha**

Most APIs use `(lat, lng)` but OSRM uses `(lng, lat)`:
```typescript
// Our data: { lat: 41.72, lng: 44.79 }
// OSRM wants: "44.79,41.72"
const coordsStr = locations.map(loc => `${loc.lng},${loc.lat}`).join(';')
```

---

## 2.4 The Optimization Algorithms

📁 **File:** `packages/route-optimizer/src/index.ts`

### Nearest Neighbor Algorithm (Lines 13-43)

```typescript
function nearestNeighborIndices(distanceMatrix: number[][]): number[] {
  const n = distanceMatrix.length
  if (n === 0) return []
  if (n === 1) return [0]

  const route: number[] = []
  const unvisited = new Set(Array.from({ length: n }, (_, i) => i))

  // Start with first location
  let current = 0
  route.push(current)
  unvisited.delete(current)

  // Greedily pick nearest unvisited location
  while (unvisited.size > 0) {
    let nearest = -1
    let nearestDist = Infinity

    for (const next of unvisited) {
      if (distanceMatrix[current][next] < nearestDist) {
        nearestDist = distanceMatrix[current][next]
        nearest = next
      }
    }

    current = nearest
    route.push(current)
    unvisited.delete(current)
  }

  return route
}
```

**💡 Nearest Neighbor Explained**

```
Step 1: Start at A
        [A] → B(5.2), C(3.1), D(7.8)
        Nearest: C (3.1 km)

Step 2: At C
        [A, C] → B(4.5), D(6.1)
        Nearest: B (4.5 km)

Step 3: At B
        [A, C, B] → D(2.3)
        Only one left: D

Result: [A, C, B, D]
```

Pros:
- Fast: O(n²)
- Simple to understand

Cons:
- Not optimal (greedy doesn't see the big picture)
- Can create crossing paths

---

### 2-Opt Improvement (Lines 48-85)

```typescript
function twoOptIndices(distanceMatrix: number[][], route: number[]): number[] {
  if (route.length < 4) return route

  let improved = [...route]
  let bestDist = calculateRouteDistFromMatrix(distanceMatrix, improved)
  let foundImprovement = true
  let iterations = 0

  while (foundImprovement && iterations < 100) {
    foundImprovement = false
    iterations++

    // Try all pairs of edges
    for (let i = 1; i < improved.length - 2; i++) {
      for (let j = i + 1; j < improved.length - 1; j++) {
        // Reverse segment between i and j
        const newRoute = twoOptSwap(improved, i, j)
        const newDist = calculateRouteDistFromMatrix(distanceMatrix, newRoute)

        if (newDist < bestDist) {
          improved = newRoute
          bestDist = newDist
          foundImprovement = true
        }
      }
    }
  }

  return improved
}
```

**💡 2-Opt Explained**

2-Opt removes "crossed" edges by reversing segments:

```
Before (crossed):          After (uncrossed):
    A ----X---- B              A -------- B
         X                          |
    D ----X---- C              D -------- C

Route: [A, C, B, D]        Route: [A, B, C, D]
       (crosses!)                 (no crosses)
```

The algorithm:
1. Try reversing every possible segment
2. If it's shorter, keep it
3. Repeat until no more improvements

---

### Hybrid Algorithm (Lines 153-157)

```typescript
if (algorithm === 'hybrid') {
  // Step 1: Get good initial route with nearest neighbor
  const nnRoute = nearestNeighborIndices(distanceMatrix)

  // Step 2: Improve it with 2-opt
  optimizedIndices = twoOptIndices(distanceMatrix, nnRoute)
}
```

**💡 Why Hybrid is Best**

| Algorithm | Speed | Quality |
|-----------|-------|---------|
| Nearest Neighbor | Fast | Good (~80% optimal) |
| 2-Opt alone | Slow | Depends on start |
| Hybrid | Fast | Better (~90%+ optimal) |

The hybrid approach:
1. NN gives a good starting point quickly
2. 2-Opt refines it to remove inefficiencies
3. Best of both worlds!

---

### Main Entry Point (Lines 98-216)

```typescript
export async function optimizeRoute(
  locations: Location[],
  options: OptimizationOptions = {}
): Promise<OptimizedRoute> {
  const {
    algorithm = 'hybrid',
    useRealRoads = true,
    maxStops = 50,
  } = options

  // Limit locations
  const limitedLocations = locations.slice(0, maxStops)

  let distanceMatrix: number[][]
  let usingRealRoads = false

  // Try OSRM for real roads (Table API supports up to ~100 locations)
  if (useRealRoads && limitedLocations.length <= 100) {
    try {
      distanceMatrix = await getOSRMDistanceMatrix(limitedLocations)
      usingRealRoads = true
      console.log('✅ Using OSRM real road distances')
    } catch (error) {
      console.warn('⚠️ OSRM failed, falling back to Haversine')
      distanceMatrix = createDistanceMatrix(limitedLocations)
    }
  } else {
    distanceMatrix = createDistanceMatrix(limitedLocations)
  }

  // Run optimization
  let optimizedIndices: number[]
  if (algorithm === 'nearest-neighbor') {
    optimizedIndices = nearestNeighborIndices(distanceMatrix)
  } else if (algorithm === '2-opt') {
    const initial = Array.from({ length: n }, (_, i) => i)
    optimizedIndices = twoOptIndices(distanceMatrix, initial)
  } else {
    // Hybrid (default)
    const nnRoute = nearestNeighborIndices(distanceMatrix)
    optimizedIndices = twoOptIndices(distanceMatrix, nnRoute)
  }

  // Build result
  const optimizedLocations = optimizedIndices.map(i => limitedLocations[i])
  // ... calculate distances, improvement, etc.

  return {
    stops,
    totalDistance,
    originalDistance,
    improvement,
    algorithm,
    metadata: { numLocations, usingRealRoads, routeGeometry },
  }
}
```

**💡 The Complete Flow**

```
1. Input: [Location A, B, C, D, E] (user's order)
                    ↓
2. Get Distance Matrix:
   - Try OSRM (real roads)
   - Fallback to Haversine (straight line)
                    ↓
3. Run Optimization:
   - Nearest Neighbor → [A, C, E, B, D]
   - 2-Opt refinement → [A, C, E, D, B]
                    ↓
4. Output: OptimizedRoute {
     stops: [A, C, E, D, B] (optimized order)
     totalDistance: 45.2 km
     originalDistance: 67.8 km
     improvement: 33.3%
   }
```

---

# Summary: Key Patterns to Remember

## TypeScript Patterns
- **Union Types** for constrained values
- **Interface** for object shapes
- **Optional (`?`)** for nullable fields
- **Record<K, V>** for dictionaries

## React Patterns
- **Feature-based folders** for organization
- **Service layer** for database operations
- **Custom hooks** for reusable logic
- **useMemo** for expensive computations
- **useCallback** for stable function references
- **memo()** for preventing re-renders
- **Optimistic updates** for instant UI feedback

## Algorithm Patterns
- **Distance Matrix** for pre-computing all distances
- **Nearest Neighbor** for greedy initial solution
- **2-Opt** for local search improvement
- **Hybrid** combining both for best results

---

# Next Steps

1. Open the files mentioned above in VS Code
2. Set breakpoints and step through the code
3. Modify something small and see what breaks
4. Add console.logs to understand data flow

Questions? Ask about any specific part!
