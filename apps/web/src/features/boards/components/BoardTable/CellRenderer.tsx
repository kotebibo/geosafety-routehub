import React from 'react'
import { TextCell, StatusCell, DateCell, NumberCell } from './cells'
import { PersonCell } from './cells/PersonCell'
import type { CellRendererProps } from './types'
import type { ColumnType } from '@/types/board'

export function CellRenderer(props: CellRendererProps) {
  const { column } = props

  switch (column.column_type as ColumnType) {
    case 'status':
      return <StatusCell {...props} />

    case 'date':
      return <DateCell {...props} />

    case 'number':
      return <NumberCell {...props} />

    case 'person':
      return <PersonCell {...props} />

    case 'text':
    default:
      return <TextCell {...props} />
  }
}
