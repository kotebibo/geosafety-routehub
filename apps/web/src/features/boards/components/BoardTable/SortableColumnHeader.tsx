'use client'

import React, { memo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { MoreHorizontal, GripVertical, Trash2, Type, ArrowUp, ArrowDown, Clock } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { OverflowTooltip } from './cells/OverflowTooltip'
import type { BoardColumn } from '../../types/board'

export interface SortConfig {
  column: string
  direction: 'asc' | 'desc'
}

export interface SortableColumnHeaderProps {
  column: BoardColumn
  width: number
  isEditing: boolean
  editingColumnName: string
  onColumnNameChange: (value: string) => void
  onColumnNameSave: () => void
  onColumnNameKeyDown: (e: React.KeyboardEvent) => void
  onColumnNameDoubleClick: (e: React.MouseEvent, column: BoardColumn) => void
  onSort: (columnId: string) => void
  onResizeStart: (e: React.MouseEvent, columnId: string, width: number) => void
  canReorder: boolean
  editInputRef: React.RefObject<HTMLInputElement>
  isMenuOpen: boolean
  onMenuToggle: (columnId: string | null) => void
  onDeleteColumn: (column: BoardColumn) => void
  onColumnConfigUpdate?: (columnId: string, config: Record<string, any>) => void
  menuRef: React.RefObject<HTMLDivElement>
  sortConfig?: SortConfig | null
  stickyStyle?: React.CSSProperties
}

interface ColumnMenuProps {
  column: BoardColumn
  isMenuOpen: boolean
  onMenuToggle: (columnId: string | null) => void
  onDeleteColumn: (column: BoardColumn) => void
  onColumnNameDoubleClick: (e: React.MouseEvent, column: BoardColumn) => void
  onColumnConfigUpdate?: (columnId: string, config: Record<string, any>) => void
  menuRef: React.RefObject<HTMLDivElement>
}

function ColumnMenu({ column, isMenuOpen, onMenuToggle, onDeleteColumn, onColumnNameDoubleClick, onColumnConfigUpdate, menuRef }: ColumnMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.min(rect.right - 192, window.innerWidth - 200), // 192 = w-48
      })
    }
  }, [isMenuOpen])

  // Close menu on scroll so it doesn't float away from the header
  useEffect(() => {
    if (!isMenuOpen) return
    const handleScroll = () => onMenuToggle(null)
    const scrollParent = buttonRef.current?.closest('.overflow-auto, .overflow-y-auto, [style*="overflow"]')
    scrollParent?.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollParent?.removeEventListener('scroll', handleScroll)
  }, [isMenuOpen, onMenuToggle])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          onMenuToggle(isMenuOpen ? null : column.id)
        }}
        className="column-menu-btn opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto p-0.5 hover:bg-[#c3c6d4] rounded transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-[#676879]" />
      </button>
      {isMenuOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation()
              onMenuToggle(null)
            }}
          />
          <div
            ref={menuRef}
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed w-48 bg-white rounded-lg shadow-lg border border-border-light z-[9999] py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMenuToggle(null)
                onColumnNameDoubleClick(e as unknown as React.MouseEvent, column)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Type className="w-4 h-4" />
              <span>Rename column</span>
            </button>
            {/* Due date toggle — only for date columns */}
            {column.column_type === 'date' && onColumnConfigUpdate && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const isDueDate = !column.config?.is_due_date
                    onColumnConfigUpdate(column.id, { ...column.config, is_due_date: isDueDate })
                    onMenuToggle(null)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span className="flex-1">Due date mode</span>
                  <div className={cn(
                    'w-8 h-[18px] rounded-full transition-colors flex items-center px-0.5',
                    column.config?.is_due_date ? 'bg-[#0073ea] justify-end' : 'bg-[#c3c6d4] justify-start'
                  )}>
                    <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
                  </div>
                </button>
              </>
            )}
            <div className="border-t border-border-light my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteColumn(column)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete column</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export const SortableColumnHeader = memo(function SortableColumnHeader({
  column,
  width,
  isEditing,
  editingColumnName,
  onColumnNameChange,
  onColumnNameSave,
  onColumnNameKeyDown,
  onColumnNameDoubleClick,
  onSort,
  onResizeStart,
  canReorder,
  editInputRef,
  isMenuOpen,
  onMenuToggle,
  onDeleteColumn,
  onColumnConfigUpdate,
  menuRef,
  sortConfig,
  stickyStyle,
}: SortableColumnHeaderProps) {
  const isSorted = sortConfig?.column === column.column_id
  const sortDirection = isSorted ? sortConfig.direction : null
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: !canReorder,
  })

  const style: React.CSSProperties = {
    ...stickyStyle,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width,
    zIndex: isDragging ? 50 : stickyStyle?.zIndex,
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative bg-[#f5f6f8] border text-left px-3 py-2 text-xs font-semibold text-[#676879] uppercase tracking-wide cursor-pointer hover:bg-[#ecedf0] transition-colors group',
        isDragging && 'bg-blue-50 shadow-lg',
        isSorted && 'bg-[#f0f1f3]',
        'border-[#c3c6d4]'
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        if ((e.target as HTMLElement).closest('.drag-handle')) return
        if ((e.target as HTMLElement).closest('.column-menu-btn')) return
        onSort(column.column_id)
      }}
      onDoubleClick={(e) => {
        if (isEditing) return
        if ((e.target as HTMLElement).closest('.drag-handle')) return
        onColumnNameDoubleClick(e, column)
      }}
    >
      {/* Sort indicator - positioned at top center of header cell */}
      {isSorted ? (
        <div className="absolute top-[1px] left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-[14px] h-[14px] rounded-full bg-[#c3c6d4] text-[#323338] shadow-sm">
          {sortDirection === 'asc' ? (
            <ArrowUp className="w-[10px] h-[10px]" />
          ) : (
            <ArrowDown className="w-[10px] h-[10px]" />
          )}
        </div>
      ) : (
        <div className="absolute top-[1px] left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-[14px] h-[14px] rounded-full bg-[#c3c6d4] text-[#676879] opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUp className="w-[10px] h-[10px]" />
        </div>
      )}
      <div className="flex items-center gap-1">
        {/* Drag handle with dnd-kit listeners */}
        {canReorder && !isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="drag-handle opacity-0 group-hover:opacity-100 hover:opacity-100 cursor-grab active:cursor-grabbing -ml-1 p-0.5"
          >
            <GripVertical className="w-3 h-3 text-[#9699a6]" />
          </div>
        )}
        <span className="flex-1 truncate">
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editingColumnName}
              onChange={(e) => onColumnNameChange(e.target.value)}
              onBlur={onColumnNameSave}
              onKeyDown={onColumnNameKeyDown}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full bg-white border border-[#0073ea] rounded px-1 py-0.5 text-xs font-semibold text-[#323338] uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
            />
          ) : (
            <OverflowTooltip text={column.column_name} className="truncate block">
              {column.column_name}
            </OverflowTooltip>
          )}
        </span>
        {/* Column menu button */}
        {!isEditing && (
          <ColumnMenu
            column={column}
            isMenuOpen={isMenuOpen}
            onMenuToggle={onMenuToggle}
            onDeleteColumn={onDeleteColumn}
            onColumnNameDoubleClick={onColumnNameDoubleClick}
            onColumnConfigUpdate={onColumnConfigUpdate}
            menuRef={menuRef}
          />
        )}
      </div>
      {/* Resize handle */}
      <div
        className={cn(
          'absolute top-0 right-0 w-1 h-full cursor-col-resize group',
          'hover:bg-[#0073ea] transition-colors'
        )}
        onMouseDown={(e) => onResizeStart(e, column.id, width)}
      >
        <div className="absolute top-0 right-0 w-3 h-full -translate-x-1" />
      </div>
    </th>
  )
})
