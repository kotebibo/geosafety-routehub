'use client'

import React, { memo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import { CellRenderer } from './CellRenderer'
import type { BoardSubitem, BoardColumn } from '../../types/board'

interface SubitemRowProps {
  subitem: BoardSubitem
  parentColumns: BoardColumn[]
  groupColor: string
  hasCheckbox: boolean
  checkboxWidth: number
  colorBarWidth: number
  firstColumnWidth: number
  getColumnWidth: (col: BoardColumn) => number
  onCellEdit?: (subitemId: string, field: string, value: any) => void
  onDelete?: (subitemId: string) => void
}

export const SubitemRow = memo(function SubitemRow({
  subitem,
  parentColumns,
  groupColor,
  hasCheckbox,
  checkboxWidth,
  colorBarWidth,
  firstColumnWidth,
  getColumnWidth,
  onCellEdit,
  onDelete,
}: SubitemRowProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleEdit = useCallback(
    (field: string, value: any) => {
      onCellEdit?.(subitem.id, field, value)
    },
    [subitem.id, onCellEdit]
  )

  // Map subitem columns to parent column widths for alignment
  // Subitem name goes in the first (sticky) column, other subitem columns map to parent columns
  const stickyLeft = hasCheckbox ? checkboxWidth + colorBarWidth : colorBarWidth

  return (
    <tr
      className={cn(
        'h-8 hover:bg-bg-hover transition-colors cursor-pointer group/subitem relative',
        'bg-bg-secondary'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox placeholder */}
      {hasCheckbox && (
        <td
          className="bg-bg-secondary border-b border-r border-border-medium p-0 h-8"
          style={{ width: checkboxWidth, position: 'sticky', left: 0, zIndex: 2 }}
        />
      )}

      {/* Color bar (dimmed) */}
      <td
        className="border-b border-r border-border-medium p-0 h-8 relative"
        style={{
          width: colorBarWidth,
          position: 'sticky',
          left: hasCheckbox ? checkboxWidth : 0,
          zIndex: 2,
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: groupColor, opacity: 0.2 }} />
      </td>

      {/* Name cell (first sticky column) - indented with connecting line */}
      <td
        className="bg-bg-secondary border-b border-r border-border-medium p-0 h-8"
        style={{
          width: firstColumnWidth,
          position: 'sticky',
          left: stickyLeft,
          zIndex: 2,
        }}
      >
        <div className="flex items-center h-full pl-8 pr-2 gap-1.5">
          {/* Connecting line */}
          <div className="absolute left-4 top-0 h-full w-px bg-border-medium" />
          <div className="absolute left-4 top-1/2 w-3 h-px bg-border-medium" />

          {/* Name input */}
          <div className="flex-1 min-w-0">
            <CellRenderer
              row={subitem as any}
              column={{ column_id: 'name', column_type: 'text', column_name: 'Name' } as any}
              value={subitem.name || ''}
              isEditing={false}
              onEdit={newValue => handleEdit('name', newValue)}
            />
          </div>

          {/* Delete button */}
          {isHovered && onDelete && (
            <button
              onClick={e => {
                e.stopPropagation()
                onDelete(subitem.id)
              }}
              className="p-0.5 rounded hover:bg-red-100 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
            </button>
          )}
        </div>
      </td>

      {/* Remaining columns - render all parent columns with proper type renderers */}
      {parentColumns.slice(1).map(col => {
        // Map known top-level fields; everything else comes from data JSONB
        const colId = col.column_id
        const value =
          colId === 'status'
            ? subitem.status
            : colId === 'assigned_to' || colId === 'person'
              ? subitem.assigned_to
              : colId === 'due_date' || colId === 'date'
                ? subitem.due_date
                : (subitem.data?.[colId] ?? '')

        return (
          <td
            key={`sub-${subitem.id}-${col.id}`}
            className="bg-bg-secondary border-b border-r border-border-medium p-0 h-8 text-sm"
            style={{ width: getColumnWidth(col) }}
          >
            <CellRenderer
              row={subitem as any}
              column={col}
              value={value}
              isEditing={false}
              onEdit={newValue => {
                if (colId === 'status') {
                  handleEdit('status', newValue)
                } else if (colId === 'assigned_to' || colId === 'person') {
                  handleEdit('assigned_to', newValue)
                } else if (colId === 'due_date' || colId === 'date') {
                  handleEdit('due_date', newValue)
                } else {
                  handleEdit('data', { ...subitem.data, [colId]: newValue })
                }
              }}
            />
          </td>
        )
      })}

      {/* Empty cell for add column */}
      <td className="bg-bg-secondary border-b border-r border-border-medium p-0 h-8 w-10" />
    </tr>
  )
})
