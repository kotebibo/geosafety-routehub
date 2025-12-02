import React from 'react'
import {
  TextCell,
  StatusCell,
  DateCell,
  NumberCell,
  RouteCell,
  CompanyCell,
  ServiceTypeCell,
  CheckboxCell,
  PhoneCell,
  FilesCell,
} from './cells'
import { PersonCell } from './cells/PersonCell'
import type { CellRendererProps } from './types'
import type { ColumnType } from '@/types/board'

export function CellRenderer(props: CellRendererProps) {
  const { column, row } = props

  switch (column.column_type as ColumnType) {
    case 'status':
      return <StatusCell {...props} />

    case 'date':
      return <DateCell {...props} />

    case 'number':
      return <NumberCell {...props} />

    case 'person':
      return <PersonCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'route':
      return <RouteCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'company':
      return <CompanyCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'service_type':
      return <ServiceTypeCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'checkbox':
      return <CheckboxCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'phone':
      return <PhoneCell value={props.value} onEdit={props.onEdit} onEditStart={props.onEditStart} />

    case 'files':
      return <FilesCell value={props.value} onEdit={props.onEdit} itemId={row?.id} onEditStart={props.onEditStart} />

    case 'text':
    default:
      return <TextCell {...props} />
  }
}
