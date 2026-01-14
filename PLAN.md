# Plan: Generic DataTable Component for Assignments & Companies Pages

## Overview
Create a reusable, lightweight DataTable component to standardize table views across the application, starting with the Assignments and Companies pages.

## Current State Analysis

### Assignments Page (`/admin/assignments`)
- Uses `CompanyAssignmentTable` component
- Features: Checkbox selection, bulk actions, inspector dropdown
- Columns: Company, Address, Service, Inspector
- ~200 lines of table-specific code

### Companies Page (`/companies`)
- Uses `CompanyTable` component
- Features: Row click navigation, delete action
- Columns: Company, Address, Coordinates, Actions
- ~100 lines of table-specific code

### Existing Patterns
- `MondayBoardTable`: Feature-rich (1,952 lines) - too complex for simple lists
- `BoardTable`: Simpler but still board-specific
- Simple HTML tables scattered across features

## Proposed Solution: Generic DataTable Component

### Architecture

```
apps/web/src/shared/components/ui/
├── DataTable/
│   ├── index.ts              # Exports
│   ├── DataTable.tsx         # Main component
│   ├── DataTableHeader.tsx   # Header with sorting
│   ├── DataTableRow.tsx      # Row component
│   ├── DataTableCell.tsx     # Cell wrapper
│   ├── DataTablePagination.tsx  # Optional pagination
│   └── types.ts              # Type definitions
```

### Core Types

```typescript
interface Column<T> {
  id: string
  header: string
  accessorKey?: keyof T
  accessorFn?: (row: T) => any
  cell?: (props: { row: T; value: any }) => React.ReactNode
  sortable?: boolean
  width?: number | string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  // Selection
  selectable?: boolean
  selectedRows?: Set<string>
  onSelectionChange?: (selected: Set<string>) => void
  getRowId?: (row: T) => string
  // Sorting
  sortable?: boolean
  defaultSort?: { column: string; direction: 'asc' | 'desc' }
  // Row actions
  onRowClick?: (row: T) => void
  // Styling
  className?: string
  rowClassName?: (row: T) => string
  // States
  loading?: boolean
  emptyState?: React.ReactNode
}
```

### Features

1. **Declarative Column Definitions**
   - Type-safe column configuration
   - Custom cell renderers
   - Accessor functions for nested data

2. **Sorting**
   - Click header to sort (asc -> desc -> none cycle)
   - Visual indicators for sort direction

3. **Row Selection**
   - Checkbox column (optional)
   - Select all functionality
   - Callback for selection changes

4. **Row Actions**
   - Click handler for navigation
   - Action column support

5. **Styling**
   - Monday.com-inspired design
   - Hover effects
   - Responsive with horizontal scroll

6. **States**
   - Loading skeleton
   - Empty state with customization

## Implementation Steps

### Step 1: Create DataTable Types
- Define Column, DataTableProps interfaces
- Export from types.ts

### Step 2: Create DataTable Component
- Main table structure
- Handle sorting state
- Handle selection state
- Render header and rows

### Step 3: Create DataTableHeader Component
- Render column headers
- Sort click handlers
- Select-all checkbox

### Step 4: Create DataTableRow Component
- Render cells based on column config
- Row click handler
- Selection checkbox
- Hover styling

### Step 5: Refactor Companies Page
- Define columns using new Column interface
- Replace CompanyTable with DataTable
- Add custom cell renderers for:
  - Company name with icon
  - Address with map pin
  - Coordinates formatting
  - Delete action button

### Step 6: Refactor Assignments Page
- Define columns using new Column interface
- Replace CompanyAssignmentTable with DataTable
- Keep bulk assignment UI above table
- Add custom cell renderers for:
  - Company name
  - Address
  - Service type badge
  - Inspector dropdown/display

### Step 7: Clean Up
- Remove old CompanyTable component
- Remove old CompanyAssignmentTable component
- Update exports

## Example Usage

### Companies Page
```tsx
const columns: Column<Company>[] = [
  {
    id: 'name',
    header: 'კომპანია',
    accessorKey: 'name',
    cell: ({ value }) => (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <span>{value}</span>
      </div>
    ),
    sortable: true,
  },
  {
    id: 'address',
    header: 'მისამართი',
    accessorKey: 'address',
  },
  {
    id: 'coordinates',
    header: 'კოორდინატები',
    accessorFn: (row) => row.lat && row.lng
      ? `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}`
      : '-',
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DeleteButton onDelete={() => handleDelete(row.id)} />
    ),
    width: 60,
  },
]

<DataTable
  data={companies}
  columns={columns}
  onRowClick={(row) => router.push(`/companies/${row.id}`)}
  loading={loading}
  emptyState={<EmptyState icon={Building2} message="კომპანიები არ მოიძებნა" />}
/>
```

### Assignments Page
```tsx
const columns: Column<Assignment>[] = [
  {
    id: 'company',
    header: 'კომპანია',
    accessorFn: (row) => row.company?.name,
    sortable: true,
  },
  {
    id: 'address',
    header: 'მისამართი',
    accessorFn: (row) => row.company?.address,
  },
  {
    id: 'service',
    header: 'სერვისი',
    accessorFn: (row) => row.service_type?.name_ka,
    cell: ({ value }) => <Badge>{value}</Badge>,
  },
  {
    id: 'inspector',
    header: 'ინსპექტორი',
    accessorFn: (row) => row.assigned_inspector?.full_name,
    cell: ({ row, value }) => (
      <InspectorCell value={value} assignmentId={row.id} />
    ),
  },
]

<DataTable
  data={assignments}
  columns={columns}
  selectable
  selectedRows={selectedIds}
  onSelectionChange={setSelectedIds}
  getRowId={(row) => row.id}
/>
```

## Benefits

1. **Reduced Code Duplication**: One component instead of multiple table implementations
2. **Consistent UI**: Same look and feel across all list views
3. **Type Safety**: Full TypeScript support with generics
4. **Flexibility**: Custom cell renderers for any content
5. **Maintainability**: Changes in one place affect all tables
6. **Extensibility**: Easy to add new features (filtering, pagination, etc.)

## Future Enhancements (Out of Scope)

- Column resizing
- Column reordering
- Virtual scrolling for large datasets
- Server-side sorting/pagination
- Column filters
- Export to CSV/Excel
