import React, { memo } from 'react'
import {
  TextCell,
  StatusCell,
  DateCell,
  DateRangeCell,
  NumberCell,
  RouteCell,
  CompanyCell,
  CompanyAddressCell,
  ServiceTypeCell,
  CheckboxCell,
  PhoneCell,
  FilesCell,
  UpdatesCell,
} from './cells'
import { PersonCell } from './cells/PersonCell'
import type { CellRendererProps } from './types'
import type { ColumnType } from '@/types/board'

// Memoized CellRenderer to prevent unnecessary re-renders
// This is critical for performance as it's rendered for every cell in the table
export const CellRenderer = memo(function CellRenderer(props: CellRendererProps) {
  const { column, row } = props

  switch (column.column_type as ColumnType) {
    case 'status':
      return <StatusCell {...props} />

    case 'date':
      return <DateCell {...props} />

    case 'date_range':
      return <DateRangeCell {...props} />

    case 'number':
      return <NumberCell {...props} />

    case 'person':
      return <PersonCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'route':
      return <RouteCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'company':
      return <CompanyCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'company_address':
      // Company address is read-only and derived from a company column
      // The config should specify which company column to read from
      return (
        <CompanyAddressCell 
          value={props.value}
          companyColumnId={column.config?.linked_company_column_id}
          row={row}
        />
      )

    case 'service_type':
      return <ServiceTypeCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'checkbox':
      return <CheckboxCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'phone':
      return <PhoneCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'files':
      return <FilesCell value={props.value} onEdit={props.onEdit} itemId={row?.id} onEditStart={props.onEditStart} />

    case 'updates':
      return <UpdatesCell value={props.value} itemId={row?.id} itemName={row?.name || row?.data?.name} itemType="board_item" onEditStart={props.onEditStart} />

    case 'text':
    default:
      return <TextCell {...props} />
  }
}, (prevProps, nextProps) => {
  // Custom comparison for optimal memoization
  // Only re-render if value, column ID, row ID, or editing state changes
  return (
    prevProps.value === nextProps.value &&
    prevProps.column.id === nextProps.column.id &&
    prevProps.row?.id === nextProps.row?.id &&
    prevProps.isEditing === nextProps.isEditing
  )
})
