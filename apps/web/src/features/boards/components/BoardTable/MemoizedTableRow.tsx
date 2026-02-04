'use client'

import React, { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { GripVertical } from 'lucide-react'
import { CellRenderer } from './CellRenderer'
import type { BoardColumn, BoardItem, BoardGroup, BoardPresence } from '../../types/board'

interface MemoizedTableRowProps {
  item: BoardItem
  group: BoardGroup
  visibleColumns: BoardColumn[]
  isSelected: boolean
  isLast: boolean
  globalRowIndex: number
  // Drag state - only the relevant ones for this row
  isDragging: boolean
  isDragOver: boolean
  dragOverPosition: 'before' | 'after' | null
  // Dimensions
  checkboxWidth: number
  colorBarWidth: number
  firstColumnWidth: number
  addColumnWidth: number
  getColumnWidth: (col: BoardColumn) => number
  // Keyboard state
  focusedRowIndex: number | null
  focusedColumnIndex: number | null
  editingRowIndex: number | null
  editingColumnIndex: number | null
  // Collaboration
  editingUsersMap: Map<string, BoardPresence[]>
  // Handlers (stable refs from useCallback)
  onRowClick?: (row: BoardItem) => void
  onCellEdit?: (rowId: string, columnId: string, value: any) => void
  onCellEditStart?: (itemId: string, columnId: string) => void
  onCellEditEnd?: () => void
  hasSelectionChange: boolean
  hasItemMove: boolean
  onRowSelect: (rowId: string, checked: boolean) => void
  onDragStart: (e: React.DragEvent, itemId: string, groupId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, itemId: string, groupId: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, itemId: string, groupId: string) => void
  onFocusCell: (rowIndex: number, columnIndex: number) => void
}

// Helper to check if cell is focused
function isCellFocused(globalRowIndex: number, columnIndex: number, focusedRowIndex: number | null, focusedColumnIndex: number | null) {
  return focusedRowIndex === globalRowIndex && focusedColumnIndex === columnIndex
}

// Helper to check if cell is editing
function isCellEditing(globalRowIndex: number, columnIndex: number, editingRowIndex: number | null, editingColumnIndex: number | null) {
  return editingRowIndex === globalRowIndex && editingColumnIndex === columnIndex
}

export const MemoizedTableRow = memo(function MemoizedTableRow({
  item,
  group,
  visibleColumns,
  isSelected,
  isLast,
  globalRowIndex,
  isDragging,
  isDragOver,
  dragOverPosition,
  checkboxWidth,
  colorBarWidth,
  firstColumnWidth,
  addColumnWidth,
  getColumnWidth,
  focusedRowIndex,
  focusedColumnIndex,
  editingRowIndex,
  editingColumnIndex,
  editingUsersMap,
  onRowClick,
  onCellEdit,
  onCellEditStart,
  onCellEditEnd,
  hasSelectionChange,
  hasItemMove,
  onRowSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onFocusCell,
}: MemoizedTableRowProps) {
  const showDropIndicatorBefore = isDragOver && dragOverPosition === 'before'
  const showDropIndicatorAfter = isDragOver && dragOverPosition === 'after'

  // Get editing users for a cell
  const getUsersEditingCell = useCallback((itemId: string, columnId: string) => {
    return editingUsersMap.get(`${itemId}:${columnId}`) || []
  }, [editingUsersMap])

  return (
    <tr
      className={cn(
        'hover:bg-[#f0f3ff] transition-colors cursor-pointer group/row relative',
        isSelected && 'bg-[#e5e9ff]',
        isDragging && 'opacity-50',
        showDropIndicatorBefore && 'before:absolute before:left-0 before:right-0 before:top-0 before:h-[2px] before:bg-[#0073ea] before:z-20',
        showDropIndicatorAfter && 'after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-[#0073ea] after:z-20'
      )}
      onClick={() => onRowClick?.(item)}
      draggable={hasItemMove}
      onDragStart={(e) => onDragStart(e, item.id, group.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, item.id, group.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, item.id, group.id)}
    >
      {/* Checkbox cell */}
      {hasSelectionChange && (
        <td
          className={cn(
            'sticky left-0 z-10 border border-[#c3c6d4] p-0 align-middle',
            isSelected ? 'bg-[#e5e9ff]' : 'bg-white'
          )}
          style={{ width: checkboxWidth, height: 36 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center h-full">
            {hasItemMove && (
              <div className="absolute left-0.5 opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3 h-3 text-gray-400" />
              </div>
            )}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onRowSelect(item.id, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-monday-primary focus:ring-monday-primary"
            />
          </div>
        </td>
      )}

      {/* Color bar */}
      <td
        className={cn(
          'sticky z-10 border border-[#c3c6d4] p-0',
          isLast && 'rounded-bl',
          hasSelectionChange ? '' : 'left-0'
        )}
        style={{
          width: colorBarWidth,
          left: hasSelectionChange ? checkboxWidth : 0,
          backgroundColor: group.color,
        }}
      />

      {/* First column (sticky) */}
      <td
        className={cn(
          'sticky z-10 border p-0 align-middle',
          isSelected ? 'bg-[#e5e9ff]' : 'bg-white',
          isCellFocused(globalRowIndex, 0, focusedRowIndex, focusedColumnIndex)
            ? 'border-2 border-[#0073ea] z-20'
            : 'border-[#c3c6d4]'
        )}
        style={{
          width: firstColumnWidth,
          left: hasSelectionChange ? checkboxWidth + colorBarWidth : colorBarWidth,
          height: 36,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onFocusCell(globalRowIndex, 0)
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onRowClick?.(item)
        }}
      >
        {visibleColumns[0] && (
          <CellRenderer
            row={item}
            column={visibleColumns[0]}
            value={visibleColumns[0].column_id === 'name'
              ? (item.name ?? 'Unnamed')
              : (item.data?.[visibleColumns[0].column_id] ?? '')}
            isEditing={isCellEditing(globalRowIndex, 0, editingRowIndex, editingColumnIndex)}
            onEdit={(newValue) => onCellEdit?.(item.id, visibleColumns[0].column_id, newValue)}
          />
        )}
      </td>

      {/* Non-sticky cells */}
      {visibleColumns.slice(1).map((column, colIndex) => {
        const value = item.data?.[column.column_id] ?? item[column.column_id as keyof BoardItem]
        const columnIndex = colIndex + 1
        const isFocused = isCellFocused(globalRowIndex, columnIndex, focusedRowIndex, focusedColumnIndex)
        const isCellInEditMode = isCellEditing(globalRowIndex, columnIndex, editingRowIndex, editingColumnIndex)
        const editingUsers = getUsersEditingCell(item.id, column.column_id)
        const isBeingEditedByOther = editingUsers.length > 0

        return (
          <td
            key={`${item.id}-${column.id}`}
            className={cn(
              'border align-middle relative',
              isBeingEditedByOther ? 'p-[2px]' : 'p-0',
              isSelected ? 'bg-[#e5e9ff]' : 'bg-white',
              isBeingEditedByOther && 'ring-2 ring-inset ring-yellow-400',
              isFocused
                ? 'border-2 border-[#0073ea] z-10'
                : 'border-[#c3c6d4]'
            )}
            style={{ width: getColumnWidth(column), height: 36 }}
            onClick={(e) => {
              e.stopPropagation()
              onFocusCell(globalRowIndex, columnIndex)
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onRowClick?.(item)
            }}
            title={isBeingEditedByOther ? `${editingUsers[0].user_name} is editing` : undefined}
          >
            {isBeingEditedByOther && (
              <div className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center text-[8px] font-bold text-white shadow-sm">
                {editingUsers[0].user_name.charAt(0).toUpperCase()}
              </div>
            )}
            <CellRenderer
              row={item}
              column={column}
              value={value}
              isEditing={isCellInEditMode}
              onEdit={(newValue) => {
                onCellEditEnd?.()
                onCellEdit?.(item.id, column.column_id, newValue)
              }}
              onEditStart={() => onCellEditStart?.(item.id, column.column_id)}
            />
          </td>
        )
      })}

      {/* Empty cell for add column */}
      <td
        className={cn(
          'border border-[#c3c6d4] p-0',
          isSelected ? 'bg-[#e5e9ff]' : 'bg-white'
        )}
        style={{ width: addColumnWidth, height: 36 }}
      />
    </tr>
  )
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render when these specific things change
  // This is the KEY to performance - skip re-renders for unchanged rows

  // Item data changed
  if (prevProps.item.id !== nextProps.item.id) return false
  if (prevProps.item.name !== nextProps.item.name) return false
  if (prevProps.item.data !== nextProps.item.data) return false

  // Selection changed for this row
  if (prevProps.isSelected !== nextProps.isSelected) return false

  // Drag state changed for this row specifically
  if (prevProps.isDragging !== nextProps.isDragging) return false
  if (prevProps.isDragOver !== nextProps.isDragOver) return false
  if (prevProps.isDragOver && prevProps.dragOverPosition !== nextProps.dragOverPosition) return false

  // Group color changed
  if (prevProps.group.color !== nextProps.group.color) return false

  // Keyboard focus changed for this row
  const prevFocusedOnThisRow = prevProps.focusedRowIndex === prevProps.globalRowIndex
  const nextFocusedOnThisRow = nextProps.focusedRowIndex === nextProps.globalRowIndex
  if (prevFocusedOnThisRow !== nextFocusedOnThisRow) return false
  if (prevFocusedOnThisRow && nextFocusedOnThisRow && prevProps.focusedColumnIndex !== nextProps.focusedColumnIndex) return false

  // Editing state changed for this row
  const prevEditingOnThisRow = prevProps.editingRowIndex === prevProps.globalRowIndex
  const nextEditingOnThisRow = nextProps.editingRowIndex === nextProps.globalRowIndex
  if (prevEditingOnThisRow !== nextEditingOnThisRow) return false
  if (prevEditingOnThisRow && nextEditingOnThisRow && prevProps.editingColumnIndex !== nextProps.editingColumnIndex) return false

  // Columns changed
  if (prevProps.visibleColumns !== nextProps.visibleColumns) return false

  // No changes that affect this row - skip re-render
  return true
})
