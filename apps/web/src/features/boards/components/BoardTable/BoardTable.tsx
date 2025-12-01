'use client'

import React, { useState, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { BoardTableHeader } from './BoardTableHeader'
import { CellRenderer } from './CellRenderer'
import type { BoardTableProps } from './types'
import type { BoardColumn } from '@/types/board'

export function BoardTable<TData extends Record<string, any>>({
  boardType,
  columns,
  data,
  isLoading = false,
  onRowClick,
  onCellEdit,
  selection = new Set(),
  onSelectionChange,
  height = 600,
}: BoardTableProps<TData>) {
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null)

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      // Read from data JSONB field
      const aValue = a.data?.[sortConfig.column] ?? a[sortConfig.column]
      const bValue = b.data?.[sortConfig.column] ?? b[sortConfig.column]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  // Setup virtualizer
  const parentRef = React.useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  })

  const handleSort = (columnId: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.column !== columnId) {
        return { column: columnId, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { column: columnId, direction: 'desc' }
      }
      return null
    })
  }

  const handleCellEdit = (rowId: string, columnId: string, value: any) => {
    if (onCellEdit) {
      onCellEdit(rowId, columnId, value)
    }
  }

  const handleRowSelect = (rowId: string, checked: boolean) => {
    if (!onSelectionChange) return

    const newSelection = new Set(selection)
    if (checked) {
      newSelection.add(rowId)
    } else {
      newSelection.delete(rowId)
    }
    onSelectionChange(newSelection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return

    if (checked) {
      const allIds = new Set(data.map((row) => row.id))
      onSelectionChange(allIds)
    } else {
      onSelectionChange(new Set())
    }
  }

  const visibleColumns = columns.filter((col) => col.is_visible)
  const totalWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0) + (onSelectionChange ? 40 : 0)

  if (isLoading) {
    const skeletonRows = Array.from({ length: 8 })
    const visibleColumns = columns.filter((col) => col.is_visible)
    const totalWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0) + (onSelectionChange ? 40 : 0)

    return (
      <div className="w-full bg-bg-primary rounded-lg border border-border-light overflow-hidden shadow-monday-sm">
        {/* Header Row Skeleton */}
        <div
          className="flex border-b-2 border-border-light bg-bg-secondary"
          style={{ width: `${totalWidth}px` }}
        >
          {onSelectionChange && (
            <div className="w-10 h-10 flex items-center justify-center border-r border-border-light">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          )}
          {visibleColumns.map((column) => (
            <div
              key={column.id}
              className="flex items-center gap-2 px-3 h-10 border-r border-border-light"
              style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
            >
              <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
            </div>
          ))}
        </div>

        {/* Body Skeleton */}
        <div className="overflow-auto" style={{ height: `${height}px` }}>
          {skeletonRows.map((_, idx) => (
            <div
              key={idx}
              className="flex border-b border-border-light"
              style={{ width: `${totalWidth}px`, height: '40px' }}
            >
              {onSelectionChange && (
                <div className="w-10 flex items-center justify-center border-r border-border-light">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              )}
              {visibleColumns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center px-3 border-r border-border-light"
                  style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                >
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-bg-primary rounded-lg border border-border-light overflow-hidden shadow-monday-sm">
      {/* Header Row */}
      <div
        className="flex border-b-2 border-border-light sticky top-0 z-10 bg-bg-secondary"
        style={{ width: `${totalWidth}px` }}
      >
        {/* Checkbox Column */}
        {onSelectionChange && (
          <div className="w-10 h-10 flex items-center justify-center border-r border-border-light bg-bg-secondary">
            <input
              type="checkbox"
              checked={selection.size === data.length && data.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-border-default text-monday-primary focus:ring-monday-primary"
            />
          </div>
        )}

        {/* Column Headers */}
        {visibleColumns.map((column) => (
          <BoardTableHeader
            key={column.id}
            column={column}
            onSort={handleSort}
            sortConfig={sortConfig || undefined}
          />
        ))}
      </div>

      {/* Body - Virtualized Rows */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: `${height}px` }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: `${totalWidth}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = sortedData[virtualRow.index]
            const isSelected = selection.has(row.id)

            return (
              <div
                key={row.id}
                className={cn(
                  'absolute top-0 left-0 w-full flex',
                  'border-b border-border-light',
                  'hover:bg-bg-hover transition-colors',
                  isSelected && 'bg-bg-selected'
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(row)}
              >
                {/* Checkbox Column */}
                {onSelectionChange && (
                  <div className="w-10 flex items-center justify-center border-r border-border-light">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleRowSelect(row.id, e.target.checked)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-border-default text-monday-primary focus:ring-monday-primary"
                    />
                  </div>
                )}

                {/* Data Cells */}
                {visibleColumns.map((column) => {
                  // Read from data JSONB field, fallback to top-level field for backward compatibility
                  const value = row.data?.[column.column_id] ?? row[column.column_id]

                  return (
                    <div
                      key={`${row.id}-${column.id}`}
                      className="border-r border-border-light"
                      style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CellRenderer
                        row={row}
                        column={column}
                        value={value}
                        onEdit={(newValue) => handleCellEdit(row.id, column.column_id, newValue)}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center h-96 text-text-secondary">
          <svg
            className="w-16 h-16 mb-4 text-text-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium mb-1">No items yet</p>
          <p className="text-sm text-text-tertiary">Create your first item to get started</p>
        </div>
      )}
    </div>
  )
}
