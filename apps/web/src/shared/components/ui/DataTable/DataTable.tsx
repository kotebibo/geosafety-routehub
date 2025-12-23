'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import { ChevronUp, ChevronDown, Square, CheckSquare, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Column, DataTableProps, SortState, CellProps } from './types'

function getCellValue<T>(row: T, column: Column<T>): unknown {
  if (column.accessorFn) {
    return column.accessorFn(row)
  }
  if (column.accessorKey) {
    return row[column.accessorKey]
  }
  return undefined
}

function sortData<T>(data: T[], columns: Column<T>[], sort: SortState): T[] {
  if (!sort.column || !sort.direction) {
    return data
  }

  const column = columns.find((c) => c.id === sort.column)
  if (!column) {
    return data
  }

  return [...data].sort((a, b) => {
    const aVal = getCellValue(a, column)
    const bVal = getCellValue(b, column)

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return sort.direction === 'asc' ? 1 : -1
    if (bVal == null) return sort.direction === 'asc' ? -1 : 1

    // String comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const comparison = aVal.localeCompare(bVal, 'ka')
      return sort.direction === 'asc' ? comparison : -comparison
    }

    // Number comparison
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sort.direction === 'asc' ? aVal - bVal : bVal - aVal
    }

    // Date comparison
    if (aVal instanceof Date && bVal instanceof Date) {
      return sort.direction === 'asc'
        ? aVal.getTime() - bVal.getTime()
        : bVal.getTime() - aVal.getTime()
    }

    // Fallback to string comparison
    const aStr = String(aVal)
    const bStr = String(bVal)
    const comparison = aStr.localeCompare(bStr)
    return sort.direction === 'asc' ? comparison : -comparison
  })
}

function TableSkeleton({ columns, rows, selectable }: { columns: number; rows: number; selectable?: boolean }) {
  const totalColumns = selectable ? columns + 1 : columns

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-border-light">
          {Array.from({ length: totalColumns }).map((_, colIndex) => (
            <td key={colIndex} className={cn(
              'px-4 py-3 border-r border-border-light',
              colIndex === totalColumns - 1 && 'border-r-0'
            )}>
              <div className="h-4 bg-bg-secondary rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function DataTable<T>({
  data,
  columns,
  selectable = false,
  selectedRows,
  onSelectionChange,
  getRowId = (row: T) => (row as { id: string }).id,
  defaultSort,
  onRowClick,
  className,
  rowClassName,
  loading = false,
  loadingRows = 5,
  emptyState,
  caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>({
    column: defaultSort?.column ?? null,
    direction: defaultSort?.direction ?? null,
  })

  const sortedData = useMemo(() => sortData(data, columns, sort), [data, columns, sort])

  const handleSort = useCallback((columnId: string) => {
    setSort((prev) => {
      if (prev.column !== columnId) {
        return { column: columnId, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { column: columnId, direction: 'desc' }
      }
      return { column: null, direction: null }
    })
  }, [])

  const allSelected = useMemo(() => {
    if (!selectable || data.length === 0) return false
    return data.every((row) => selectedRows?.has(getRowId(row)))
  }, [selectable, data, selectedRows, getRowId])

  const someSelected = useMemo(() => {
    if (!selectable || data.length === 0) return false
    const selectedCount = data.filter((row) => selectedRows?.has(getRowId(row))).length
    return selectedCount > 0 && selectedCount < data.length
  }, [selectable, data, selectedRows, getRowId])

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return

    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      const allIds = new Set(data.map(getRowId))
      onSelectionChange(allIds)
    }
  }, [allSelected, data, getRowId, onSelectionChange])

  const handleSelectRow = useCallback(
    (row: T, event: React.MouseEvent) => {
      event.stopPropagation()
      if (!onSelectionChange || !selectedRows) return

      const rowId = getRowId(row)
      const newSelected = new Set(selectedRows)

      if (newSelected.has(rowId)) {
        newSelected.delete(rowId)
      } else {
        newSelected.add(rowId)
      }

      onSelectionChange(newSelected)
    },
    [getRowId, onSelectionChange, selectedRows]
  )

  const renderCell = useCallback(
    (row: T, column: Column<T>, rowIndex: number) => {
      const value = getCellValue(row, column)

      if (column.cell) {
        return column.cell({ row, value, rowIndex })
      }

      if (value == null) {
        return <span className="text-text-tertiary">-</span>
      }

      return String(value)
    },
    []
  )

  const getColumnStyle = (column: Column<T>): React.CSSProperties => {
    const style: React.CSSProperties = {}

    if (column.width) {
      style.width = typeof column.width === 'number' ? `${column.width}px` : column.width
    }

    return style
  }

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      default:
        return 'text-left'
    }
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border border-border-light bg-white', className)}>
      <table className="w-full border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-bg-secondary border-b border-border-light">
            {selectable && (
              <th className="w-12 px-4 py-3 border-r border-border-light">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                  aria-label={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : someSelected ? (
                    <Minus className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              </th>
            )}
            {columns.map((column, index) => (
              <th
                key={column.id}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary border-r border-border-light last:border-r-0',
                  getAlignClass(column.align),
                  column.sortable && 'cursor-pointer select-none hover:text-text-primary',
                  column.className
                )}
                style={getColumnStyle(column)}
                onClick={column.sortable ? () => handleSort(column.id) : undefined}
              >
                <div className={cn('flex items-center gap-1', column.align === 'right' && 'justify-end', column.align === 'center' && 'justify-center')}>
                  <span>{column.header}</span>
                  {column.sortable && sort.column === column.id && (
                    sort.direction === 'asc' ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton columns={columns.length} rows={loadingRows} selectable={selectable} />
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={selectable ? columns.length + 1 : columns.length} className="px-4 py-12">
                {emptyState || (
                  <div className="text-center text-text-secondary">
                    მონაცემები არ მოიძებნა
                  </div>
                )}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => {
              const rowId = getRowId(row)
              const isSelected = selectedRows?.has(rowId) ?? false

              return (
                <tr
                  key={rowId}
                  className={cn(
                    'border-b border-border-light transition-colors',
                    onRowClick && 'cursor-pointer',
                    isSelected ? 'bg-primary/5' : 'hover:bg-bg-hover',
                    rowClassName?.(row)
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td className="w-12 px-4 py-3 border-r border-border-light">
                      <button
                        type="button"
                        onClick={(e) => handleSelectRow(row, e)}
                        className="flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                        aria-label={isSelected ? 'Deselect row' : 'Select row'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        'px-4 py-3 text-sm text-text-primary border-r border-border-light last:border-r-0',
                        getAlignClass(column.align),
                        column.className
                      )}
                      style={getColumnStyle(column)}
                    >
                      {renderCell(row, column, rowIndex)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
