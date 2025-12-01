import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import type { HeaderCellProps } from './types'

export function BoardTableHeader({ column, onSort, sortConfig, onResize }: HeaderCellProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(column.width)
  const headerRef = useRef<HTMLDivElement>(null)

  const isSorted = sortConfig?.column === column.column_id
  const sortDirection = isSorted ? sortConfig.direction : undefined

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    setStartX(e.clientX)
    setStartWidth(column.width)
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX
      const newWidth = Math.max(80, startWidth + diff)

      if (headerRef.current) {
        headerRef.current.style.width = `${newWidth}px`
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false)
      const diff = e.clientX - startX
      const newWidth = Math.max(80, startWidth + diff)

      if (onResize) {
        onResize(column.column_id, newWidth)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, startX, startWidth, column.column_id, onResize])

  const handleSort = () => {
    if (onSort) {
      onSort(column.column_id)
    }
  }

  return (
    <div
      ref={headerRef}
      className={cn(
        'relative flex items-center justify-between',
        'h-10 px-3 border-r border-b border-border-light',
        'bg-bg-secondary text-text-secondary font-medium text-xs',
        'select-none',
        isResizing && 'cursor-col-resize'
      )}
      style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
    >
      {/* Column Name */}
      <button
        onClick={handleSort}
        className={cn(
          'flex items-center gap-1.5 flex-1',
          'hover:text-text-primary transition-colors',
          'focus:outline-none'
        )}
      >
        <span className="truncate">{column.column_name}</span>

        {/* Sort Icon */}
        {onSort && (
          <span className="flex-shrink-0">
            {!isSorted && <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />}
            {sortDirection === 'asc' && <ArrowUp className="w-3 h-3 text-monday-primary" />}
            {sortDirection === 'desc' && <ArrowDown className="w-3 h-3 text-monday-primary" />}
          </span>
        )}
      </button>

      {/* Resize Handle */}
      {onResize && (
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            'absolute right-0 top-0 bottom-0',
            'w-1 cursor-col-resize',
            'hover:bg-monday-primary/30',
            'transition-colors',
            isResizing && 'bg-monday-primary'
          )}
        >
          <GripVertical className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary opacity-0 hover:opacity-100" />
        </div>
      )}
    </div>
  )
}
