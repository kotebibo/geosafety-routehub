// Board Table Types
import type { BoardColumn, BoardType } from '@/types/board'

export interface BoardTableProps<TData = any> {
  boardType: BoardType
  columns: BoardColumn[]
  data: TData[]
  isLoading?: boolean
  onRowClick?: (row: TData) => void
  onCellEdit?: (rowId: string, columnId: string, value: any) => void
  selection?: Set<string>
  onSelectionChange?: (selection: Set<string>) => void
  height?: number
}

export interface CellRendererProps<TData = any> {
  row: TData
  column: BoardColumn
  value: any
  onEdit?: (value: any) => void
  isEditing?: boolean
  onEditStart?: () => void
}

export interface HeaderCellProps {
  column: BoardColumn
  onSort?: (columnId: string) => void
  sortConfig?: { column: string; direction: 'asc' | 'desc' }
  onResize?: (columnId: string, width: number) => void
}
