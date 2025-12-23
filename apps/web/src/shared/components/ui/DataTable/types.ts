import { ReactNode } from 'react'

export type SortDirection = 'asc' | 'desc' | null

export interface SortState {
  column: string | null
  direction: SortDirection
}

export interface CellProps<T> {
  row: T
  value: unknown
  rowIndex: number
}

export interface Column<T> {
  /** Unique identifier for the column */
  id: string
  /** Header text to display */
  header: string
  /** Key to access value from row data */
  accessorKey?: keyof T
  /** Function to derive value from row data */
  accessorFn?: (row: T) => unknown
  /** Custom cell renderer */
  cell?: (props: CellProps<T>) => ReactNode
  /** Whether the column is sortable */
  sortable?: boolean
  /** Column width (number for px, string for css value) */
  width?: number | string
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Additional class name for the column */
  className?: string
}

export interface DataTableProps<T> {
  /** Array of data to display */
  data: T[]
  /** Column definitions */
  columns: Column<T>[]
  /** Enable row selection with checkboxes */
  selectable?: boolean
  /** Set of selected row IDs (controlled) */
  selectedRows?: Set<string>
  /** Callback when selection changes */
  onSelectionChange?: (selected: Set<string>) => void
  /** Function to get unique ID from row */
  getRowId?: (row: T) => string
  /** Default sort state */
  defaultSort?: { column: string; direction: 'asc' | 'desc' }
  /** Callback when row is clicked */
  onRowClick?: (row: T) => void
  /** Additional class name for the table */
  className?: string
  /** Function to generate row class name */
  rowClassName?: (row: T) => string
  /** Show loading state */
  loading?: boolean
  /** Number of skeleton rows to show when loading */
  loadingRows?: number
  /** Custom empty state component */
  emptyState?: ReactNode
  /** Table caption for accessibility */
  caption?: string
}
