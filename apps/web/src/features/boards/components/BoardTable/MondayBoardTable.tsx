'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, Type, Hash, Calendar, User, MapPin, CheckSquare, MoreHorizontal } from 'lucide-react'
import { CellRenderer } from './CellRenderer'
import type { BoardColumn, BoardItem, BoardGroup, BoardType, ColumnType } from '../../types/board'

// Essential column types for quick-add popup
const ESSENTIAL_COLUMNS: { type: ColumnType; label: string; icon: React.ElementType }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'number', label: 'Numbers', icon: Hash },
  { type: 'status', label: 'Status', icon: CheckSquare },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'person', label: 'Person', icon: User },
]

// All available column types
const ALL_COLUMN_TYPES: { type: ColumnType; label: string; icon: React.ElementType; description: string }[] = [
  { type: 'text', label: 'Text', icon: Type, description: 'Add text, links, or notes' },
  { type: 'number', label: 'Numbers', icon: Hash, description: 'Add numbers and perform calculations' },
  { type: 'status', label: 'Status', icon: CheckSquare, description: 'Track progress with customizable labels' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Add dates and deadlines' },
  { type: 'person', label: 'Person', icon: User, description: 'Assign people to items' },
  { type: 'location', label: 'Location', icon: MapPin, description: 'Add addresses and coordinates' },
]

// Monday.com color palette for groups
const MONDAY_GROUP_COLORS = [
  { name: 'bright-blue', value: '#579bfc', bg: 'bg-[#579bfc]', light: 'bg-[#579bfc]/10' },
  { name: 'dark-purple', value: '#a25ddc', bg: 'bg-[#a25ddc]', light: 'bg-[#a25ddc]/10' },
  { name: 'grass-green', value: '#00c875', bg: 'bg-[#00c875]', light: 'bg-[#00c875]/10' },
  { name: 'egg-yolk', value: '#fdab3d', bg: 'bg-[#fdab3d]', light: 'bg-[#fdab3d]/10' },
  { name: 'berry', value: '#e2445c', bg: 'bg-[#e2445c]', light: 'bg-[#e2445c]/10' },
  { name: 'aquamarine', value: '#00d2d2', bg: 'bg-[#00d2d2]', light: 'bg-[#00d2d2]/10' },
  { name: 'peach', value: '#ffadad', bg: 'bg-[#ffadad]', light: 'bg-[#ffadad]/10' },
  { name: 'royal', value: '#784bd1', bg: 'bg-[#784bd1]', light: 'bg-[#784bd1]/10' },
]

interface MondayBoardTableProps {
  boardType: BoardType
  columns: BoardColumn[]
  data: BoardItem[]
  groups?: BoardGroup[]
  isLoading?: boolean
  onRowClick?: (row: BoardItem) => void
  onCellEdit?: (rowId: string, columnId: string, value: any) => void
  selection?: Set<string>
  onSelectionChange?: (selection: Set<string>) => void
  onAddItem?: (groupId?: string) => void
  onAddGroup?: () => void
  onColumnResize?: (columnId: string, width: number) => void
  onQuickAddColumn?: (columnType: ColumnType) => void
  onOpenAddColumnModal?: () => void
  onColumnRename?: (columnId: string, newName: string) => void
}

const DEFAULT_GROUP: BoardGroup = {
  id: 'default',
  board_id: '',
  name: 'Items',
  color: '#579bfc',
  position: 0,
}

const MIN_COLUMN_WIDTH = 80
const MAX_COLUMN_WIDTH = 600

export function MondayBoardTable({
  boardType,
  columns,
  data,
  groups = [],
  isLoading = false,
  onRowClick,
  onCellEdit,
  selection = new Set(),
  onSelectionChange,
  onAddItem,
  onAddGroup,
  onColumnResize,
  onQuickAddColumn,
  onOpenAddColumnModal,
  onColumnRename,
}: MondayBoardTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null)
  const [showAddColumnPopup, setShowAddColumnPopup] = useState(false)
  const [showAllColumnsModal, setShowAllColumnsModal] = useState(false)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [originalColumnName, setOriginalColumnName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const [addColumnPopupPosition, setAddColumnPopupPosition] = useState({ top: 0, left: 0 })
  const addColumnButtonRef = useRef<HTMLButtonElement>(null)
  const addColumnPopupRef = useRef<HTMLDivElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const scrollbarThumbRef = useRef<HTMLDivElement>(null)

  // Column resizing state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)

  // Scrollbar state
  const [scrollInfo, setScrollInfo] = useState({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 })
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false)
  const [scrollbarPosition, setScrollbarPosition] = useState({ left: 0, width: 0, bottom: 0 })
  const scrollbarDragStartX = useRef(0)
  const scrollbarDragStartScrollLeft = useRef(0)

  // Initialize column widths from props
  useEffect(() => {
    const widths: Record<string, number> = {}
    columns.forEach(col => {
      widths[col.id] = col.width || 150
    })
    setColumnWidths(widths)
  }, [columns])

  // Update scroll info and scrollbar position when table scrolls or resizes
  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    const updateScrollInfo = () => {
      const rect = container.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // Calculate where the scrollbar should be positioned
      // If the container bottom is below the viewport, position at viewport bottom
      // Otherwise position at the container bottom
      const containerBottom = rect.bottom
      const isContainerBelowViewport = containerBottom > viewportHeight

      setScrollInfo({
        scrollLeft: container.scrollLeft,
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
      })

      setScrollbarPosition({
        left: rect.left,
        width: rect.width,
        // Position at viewport bottom if container extends below, otherwise at container bottom
        bottom: isContainerBelowViewport ? 0 : viewportHeight - containerBottom,
      })
    }

    updateScrollInfo()
    container.addEventListener('scroll', updateScrollInfo)
    window.addEventListener('scroll', updateScrollInfo, true)
    window.addEventListener('resize', updateScrollInfo)

    // Also update when columns change
    const resizeObserver = new ResizeObserver(updateScrollInfo)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', updateScrollInfo)
      window.removeEventListener('scroll', updateScrollInfo, true)
      window.removeEventListener('resize', updateScrollInfo)
      resizeObserver.disconnect()
    }
  }, [columnWidths])

  // Handle custom scrollbar drag
  const handleScrollbarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingScrollbar(true)
    scrollbarDragStartX.current = e.clientX
    scrollbarDragStartScrollLeft.current = tableContainerRef.current?.scrollLeft || 0
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }, [])

  const handleScrollbarMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingScrollbar || !tableContainerRef.current) return

    const container = tableContainerRef.current
    const scrollableWidth = container.scrollWidth - container.clientWidth
    const trackWidth = scrollbarRef.current?.clientWidth || container.clientWidth
    const thumbWidth = Math.max(50, (container.clientWidth / container.scrollWidth) * trackWidth)
    const availableTrackWidth = trackWidth - thumbWidth

    const deltaX = e.clientX - scrollbarDragStartX.current
    const scrollRatio = deltaX / availableTrackWidth
    const newScrollLeft = scrollbarDragStartScrollLeft.current + scrollRatio * scrollableWidth

    container.scrollLeft = Math.max(0, Math.min(scrollableWidth, newScrollLeft))
  }, [isDraggingScrollbar])

  const handleScrollbarMouseUp = useCallback(() => {
    setIsDraggingScrollbar(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // Attach/detach scrollbar drag listeners
  useEffect(() => {
    if (isDraggingScrollbar) {
      document.addEventListener('mousemove', handleScrollbarMouseMove)
      document.addEventListener('mouseup', handleScrollbarMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleScrollbarMouseMove)
        document.removeEventListener('mouseup', handleScrollbarMouseUp)
      }
    }
  }, [isDraggingScrollbar, handleScrollbarMouseMove, handleScrollbarMouseUp])

  // Handle click on scrollbar track
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!tableContainerRef.current || !scrollbarRef.current) return
    // Only handle clicks on the track itself, not the thumb
    if (e.target !== scrollbarRef.current) return

    const container = tableContainerRef.current
    const trackRect = scrollbarRef.current.getBoundingClientRect()
    const clickPosition = e.clientX - trackRect.left
    const trackWidth = trackRect.width
    const scrollableWidth = container.scrollWidth - container.clientWidth

    // Calculate where to scroll based on click position
    const scrollRatio = clickPosition / trackWidth
    const newScrollLeft = scrollRatio * container.scrollWidth - container.clientWidth / 2
    container.scrollLeft = Math.max(0, Math.min(scrollableWidth, newScrollLeft))
  }, [])

  // Handle add column button click
  const handleAddColumnClick = useCallback(() => {
    if (addColumnButtonRef.current) {
      const rect = addColumnButtonRef.current.getBoundingClientRect()
      setAddColumnPopupPosition({
        top: rect.bottom + 4,
        left: rect.left,
      })
    }
    setShowAddColumnPopup(prev => !prev)
  }, [])

  // Handle quick add column
  const handleQuickAddColumn = useCallback((columnType: ColumnType) => {
    setShowAddColumnPopup(false)
    onQuickAddColumn?.(columnType)
  }, [onQuickAddColumn])

  // Handle open more columns modal
  const handleOpenMoreColumns = useCallback(() => {
    setShowAddColumnPopup(false)
    if (onOpenAddColumnModal) {
      onOpenAddColumnModal()
    } else {
      setShowAllColumnsModal(true)
    }
  }, [onOpenAddColumnModal])

  // Handle column name double-click to edit
  const handleColumnNameDoubleClick = useCallback((e: React.MouseEvent, column: BoardColumn) => {
    e.preventDefault() // Prevent text selection from double-click
    e.stopPropagation()
    setEditingColumnId(column.id)
    setEditingColumnName(column.column_name)
    setOriginalColumnName(column.column_name)
  }, [])

  // Focus input when editing starts
  useEffect(() => {
    if (editingColumnId && editInputRef.current) {
      // Use requestAnimationFrame to ensure the input is rendered
      requestAnimationFrame(() => {
        if (editInputRef.current) {
          editInputRef.current.focus()
          editInputRef.current.select()
        }
      })
    }
  }, [editingColumnId])

  // Handle column name save
  const handleColumnNameSave = useCallback(() => {
    const trimmedName = editingColumnName.trim()
    // Only save if name actually changed and is not empty
    if (editingColumnId && trimmedName && trimmedName !== originalColumnName && onColumnRename) {
      onColumnRename(editingColumnId, trimmedName)
    }
    setEditingColumnId(null)
    setEditingColumnName('')
    setOriginalColumnName('')
  }, [editingColumnId, editingColumnName, originalColumnName, onColumnRename])

  // Handle column name input key down
  const handleColumnNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleColumnNameSave()
    } else if (e.key === 'Escape') {
      setEditingColumnId(null)
      setEditingColumnName('')
    }
  }, [handleColumnNameSave])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showAddColumnPopup &&
        addColumnPopupRef.current &&
        !addColumnPopupRef.current.contains(e.target as Node) &&
        addColumnButtonRef.current &&
        !addColumnButtonRef.current.contains(e.target as Node)
      ) {
        setShowAddColumnPopup(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddColumnPopup])

  // Get effective column width (local state or prop)
  const getColumnWidth = useCallback((col: BoardColumn) => {
    return columnWidths[col.id] ?? col.width ?? 150
  }, [columnWidths])

  // Columns are already filtered for visibility by the parent
  const visibleColumns = columns

  // Calculate widths
  const firstColumnWidth = getColumnWidth(visibleColumns[0]) || 250
  const colorBarWidth = 6
  const checkboxWidth = onSelectionChange ? 40 : 0
  const stickyWidth = checkboxWidth + colorBarWidth + firstColumnWidth

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string, currentWidth: number) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingColumn(columnId)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = currentWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return

    const delta = e.clientX - resizeStartX.current
    const newWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, resizeStartWidth.current + delta))

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }))
  }, [resizingColumn])

  const handleResizeEnd = useCallback(() => {
    if (resizingColumn && onColumnResize) {
      const finalWidth = columnWidths[resizingColumn]
      if (finalWidth) {
        onColumnResize(resizingColumn, finalWidth)
      }
    }
    setResizingColumn(null)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [resizingColumn, columnWidths, onColumnResize])

  // Attach/detach mouse listeners for resizing
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd])

  // Helper to get group_id from item (checks both column and data JSONB)
  const getItemGroupId = (item: BoardItem): string => {
    if (item.group_id) return item.group_id
    if (item.data?.group_id) return item.data.group_id as string
    return 'default'
  }

  // Group items by group_id
  const groupedItems = useMemo(() => {
    const effectiveGroups = groups.length > 0 ? groups : [DEFAULT_GROUP]

    const result = effectiveGroups.map((group) => ({
      group,
      items: data
        .filter((item) => getItemGroupId(item) === group.id)
        .sort((a, b) => {
          if (!sortConfig) return a.position - b.position
          const aValue = a.data?.[sortConfig.column] ?? a[sortConfig.column as keyof BoardItem]
          const bValue = b.data?.[sortConfig.column] ?? b[sortConfig.column as keyof BoardItem]
          if (aValue === null || aValue === undefined) return 1
          if (bValue === null || bValue === undefined) return -1
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
          return 0
        }),
    }))

    return result
  }, [data, groups, sortConfig])

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

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

  const handleGroupSelectAll = (groupId: string, checked: boolean) => {
    if (!onSelectionChange) return
    const groupItems = data.filter((item) => getItemGroupId(item) === groupId)
    const newSelection = new Set(selection)
    groupItems.forEach((item) => {
      if (checked) {
        newSelection.add(item.id)
      } else {
        newSelection.delete(item.id)
      }
    })
    onSelectionChange(newSelection)
  }

  const isAllGroupSelected = (groupId: string) => {
    const groupItems = data.filter((item) => getItemGroupId(item) === groupId)
    return groupItems.length > 0 && groupItems.every((item) => selection.has(item.id))
  }

  if (isLoading) {
    return <TableSkeleton columns={visibleColumns} hasCheckbox={!!onSelectionChange} />
  }

  // Early return if no columns
  if (visibleColumns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-secondary bg-bg-primary rounded-lg border border-[#c3c6d4]">
        <p className="text-lg font-medium mb-1">No columns configured</p>
        <p className="text-sm text-text-tertiary">Add columns to start building your board</p>
      </div>
    )
  }

  // Add column header width
  const addColumnWidth = 44

  // Calculate total table width based on all column widths
  const totalTableWidth = useMemo(() => {
    const columnsWidth = visibleColumns.reduce((sum, col) => sum + getColumnWidth(col), 0)
    return checkboxWidth + colorBarWidth + columnsWidth + addColumnWidth
  }, [visibleColumns, getColumnWidth, checkboxWidth, colorBarWidth])

  // Calculate scrollbar dimensions
  const hasHorizontalScroll = scrollInfo.scrollWidth > scrollInfo.clientWidth
  const thumbWidthPercent = scrollInfo.clientWidth / scrollInfo.scrollWidth * 100
  const thumbLeftPercent = scrollInfo.scrollLeft / scrollInfo.scrollWidth * 100

  // Resize handle component
  const ResizeHandle = ({ columnId, width }: { columnId: string; width: number }) => (
    <div
      className={cn(
        'absolute top-0 right-0 w-1 h-full cursor-col-resize group',
        'hover:bg-[#0073ea] transition-colors',
        resizingColumn === columnId && 'bg-[#0073ea]'
      )}
      onMouseDown={(e) => handleResizeStart(e, columnId, width)}
    >
      <div className="absolute top-0 right-0 w-3 h-full -translate-x-1" />
    </div>
  )

  return (
    <div className="flex flex-col min-h-[400px] bg-white relative">
      {/* Scrollable container - hide native scrollbar */}
      <div
        ref={tableContainerRef}
        className={cn(
          'flex-1 overflow-x-auto overflow-y-auto',
          // Hide native horizontal scrollbar
          '[&::-webkit-scrollbar]:h-0',
          '[&::-webkit-scrollbar]:w-2',
          '[&::-webkit-scrollbar-track]:bg-gray-100',
          '[&::-webkit-scrollbar-thumb]:bg-gray-300',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
        )}
        style={{
          scrollbarWidth: 'thin',
        }}
      >
        <div className="pb-4">
          {/* Groups */}
          {groupedItems.map(({ group, items }, groupIndex) => {
            const isCollapsed = collapsedGroups.has(group.id)
            const groupItemCount = items.length

            return (
              <div key={group.id} className={cn(groupIndex > 0 && 'mt-6')}>
                {/* Group Header Row */}
                <div className="flex items-center h-9 bg-white" style={{ width: totalTableWidth, minWidth: totalTableWidth }}>
                  {/* Sticky section */}
                  <div
                    className="flex items-center sticky left-0 z-20 bg-bg-primary"
                    style={{ width: stickyWidth, minWidth: stickyWidth }}
                  >
                    {onSelectionChange && (
                      <div className="flex items-center justify-center" style={{ width: checkboxWidth }}>
                        <input
                          type="checkbox"
                          checked={isAllGroupSelected(group.id)}
                          onChange={(e) => handleGroupSelectAll(group.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-monday-primary focus:ring-monday-primary"
                        />
                      </div>
                    )}
                    <div
                      className="h-full rounded-tl"
                      style={{ width: colorBarWidth, backgroundColor: group.color }}
                    />
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="flex items-center gap-2 px-3 h-full hover:bg-bg-hover transition-colors flex-1"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" style={{ color: group.color }} />
                      ) : (
                        <ChevronDown className="w-4 h-4" style={{ color: group.color }} />
                      )}
                      <span className="font-semibold text-sm" style={{ color: group.color }}>
                        {group.name}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        {groupItemCount} {groupItemCount === 1 ? 'item' : 'items'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Table content when not collapsed */}
                {!isCollapsed && (
                  <table className="border-collapse" style={{ tableLayout: 'fixed', width: totalTableWidth, minWidth: totalTableWidth }}>
                    {/* Column widths */}
                    <colgroup>
                      {onSelectionChange && <col style={{ width: checkboxWidth }} />}
                      <col style={{ width: colorBarWidth }} />
                      <col style={{ width: firstColumnWidth }} />
                      {visibleColumns.slice(1).map((col) => (
                        <col key={col.id} style={{ width: getColumnWidth(col) }} />
                      ))}
                      <col style={{ width: addColumnWidth }} />
                    </colgroup>

                    {/* Header */}
                    <thead>
                      <tr className="bg-[#f5f6f8]">
                        {/* Sticky header cells */}
                        {onSelectionChange && (
                          <th
                            className="sticky left-0 z-20 bg-[#f5f6f8] border border-[#c3c6d4] p-0"
                            style={{ width: checkboxWidth }}
                          />
                        )}
                        <th
                          className={cn(
                            'sticky z-20 bg-[#f5f6f8] border border-[#c3c6d4] p-0',
                            onSelectionChange ? '' : 'left-0'
                          )}
                          style={{
                            width: colorBarWidth,
                            left: onSelectionChange ? checkboxWidth : 0,
                            backgroundColor: group.color,
                          }}
                        />
                        <th
                          className="sticky z-20 bg-[#f5f6f8] border border-[#c3c6d4] text-left px-3 py-2 text-xs font-semibold text-[#676879] uppercase tracking-wide cursor-pointer hover:bg-[#ecedf0]"
                          style={{
                            width: firstColumnWidth,
                            left: onSelectionChange ? checkboxWidth + colorBarWidth : colorBarWidth,
                          }}
                          onClick={(e) => {
                            // Don't sort if clicking on the input
                            if ((e.target as HTMLElement).tagName === 'INPUT') return
                            visibleColumns[0] && handleSort(visibleColumns[0].column_id)
                          }}
                          onDoubleClick={(e) => {
                            // Don't trigger if already editing
                            if (editingColumnId) return
                            if (visibleColumns[0]) handleColumnNameDoubleClick(e, visibleColumns[0])
                          }}
                        >
                          {editingColumnId === visibleColumns[0]?.id ? (
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editingColumnName}
                              onChange={(e) => setEditingColumnName(e.target.value)}
                              onBlur={handleColumnNameSave}
                              onKeyDown={handleColumnNameKeyDown}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full bg-white border border-[#0073ea] rounded px-1 py-0.5 text-xs font-semibold text-[#323338] uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
                            />
                          ) : (
                            visibleColumns[0]?.column_name
                          )}
                          <ResizeHandle columnId={visibleColumns[0]?.id} width={firstColumnWidth} />
                        </th>
                        {/* Non-sticky header cells */}
                        {visibleColumns.slice(1).map((column) => (
                          <th
                            key={column.id}
                            className="relative border border-[#c3c6d4] text-left px-3 py-2 text-xs font-semibold text-[#676879] uppercase tracking-wide cursor-pointer hover:bg-[#ecedf0]"
                            style={{ width: getColumnWidth(column) }}
                            onClick={(e) => {
                              // Don't sort if clicking on the input
                              if ((e.target as HTMLElement).tagName === 'INPUT') return
                              handleSort(column.column_id)
                            }}
                            onDoubleClick={(e) => {
                              // Don't trigger if already editing
                              if (editingColumnId) return
                              handleColumnNameDoubleClick(e, column)
                            }}
                          >
                            {editingColumnId === column.id ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingColumnName}
                                onChange={(e) => setEditingColumnName(e.target.value)}
                                onBlur={handleColumnNameSave}
                                onKeyDown={handleColumnNameKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full bg-white border border-[#0073ea] rounded px-1 py-0.5 text-xs font-semibold text-[#323338] uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
                              />
                            ) : (
                              column.column_name
                            )}
                            <ResizeHandle columnId={column.id} width={getColumnWidth(column)} />
                          </th>
                        ))}
                        {/* Add column header */}
                        <th
                          className="border border-[#c3c6d4] p-0 bg-[#f5f6f8]"
                          style={{ width: addColumnWidth }}
                        >
                          <button
                            ref={groupIndex === 0 ? addColumnButtonRef : undefined}
                            onClick={handleAddColumnClick}
                            className="w-full h-full flex items-center justify-center hover:bg-[#ecedf0] transition-colors py-2"
                            title="Add column"
                          >
                            <Plus className="w-4 h-4 text-[#676879]" />
                          </button>
                        </th>
                      </tr>
                    </thead>

                    {/* Body */}
                    <tbody>
                      {items.map((item, itemIndex) => {
                        const isSelected = selection.has(item.id)
                        const isLast = itemIndex === items.length - 1 && !onAddItem

                        return (
                          <tr
                            key={item.id}
                            className={cn(
                              'hover:bg-[#f0f3ff] transition-colors cursor-pointer',
                              isSelected && 'bg-[#e5e9ff]'
                            )}
                            onClick={() => onRowClick?.(item)}
                          >
                            {/* Sticky cells */}
                            {onSelectionChange && (
                              <td
                                className={cn(
                                  'sticky left-0 z-10 border border-[#c3c6d4] p-0 align-middle',
                                  isSelected ? 'bg-[#e5e9ff]' : 'bg-white'
                                )}
                                style={{ width: checkboxWidth, height: 36 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center h-full">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-monday-primary focus:ring-monday-primary"
                                  />
                                </div>
                              </td>
                            )}
                            <td
                              className={cn(
                                'sticky z-10 border border-[#c3c6d4] p-0',
                                isLast && 'rounded-bl',
                                onSelectionChange ? '' : 'left-0'
                              )}
                              style={{
                                width: colorBarWidth,
                                left: onSelectionChange ? checkboxWidth : 0,
                                backgroundColor: group.color,
                              }}
                            />
                            <td
                              className={cn(
                                'sticky z-10 border border-[#c3c6d4] p-0 align-middle',
                                isSelected ? 'bg-[#e5e9ff]' : 'bg-white'
                              )}
                              style={{
                                width: firstColumnWidth,
                                left: onSelectionChange ? checkboxWidth + colorBarWidth : colorBarWidth,
                                height: 36,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center h-full px-3">
                                <span className="text-sm text-[#323338] truncate">
                                  {item.data?.[visibleColumns[0]?.column_id] ?? item.name ?? 'Unnamed'}
                                </span>
                              </div>
                            </td>
                            {/* Non-sticky cells */}
                            {visibleColumns.slice(1).map((column) => {
                              const value = item.data?.[column.column_id] ?? item[column.column_id as keyof BoardItem]
                              return (
                                <td
                                  key={`${item.id}-${column.id}`}
                                  className={cn(
                                    'border border-[#c3c6d4] p-0 align-middle',
                                    isSelected ? 'bg-[#e5e9ff]' : 'bg-white'
                                  )}
                                  style={{ width: getColumnWidth(column), height: 36 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <CellRenderer
                                    row={item}
                                    column={column}
                                    value={value}
                                    onEdit={(newValue) => onCellEdit?.(item.id, column.column_id, newValue)}
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
                      })}

                      {/* Add item row */}
                      {onAddItem && (
                        <tr
                          className="hover:bg-[#f0f3ff] cursor-pointer h-9"
                          onClick={() => onAddItem(group.id)}
                        >
                          {onSelectionChange && (
                            <td
                              className="sticky left-0 z-10 bg-white border border-[#c3c6d4] h-9"
                              style={{ width: checkboxWidth }}
                            />
                          )}
                          <td
                            className={cn(
                              'sticky z-10 border border-[#c3c6d4] p-0 rounded-bl h-9',
                              onSelectionChange ? '' : 'left-0'
                            )}
                            style={{
                              width: colorBarWidth,
                              left: onSelectionChange ? checkboxWidth : 0,
                              backgroundColor: group.color,
                              opacity: 0.3,
                            }}
                          />
                          <td
                            className="sticky z-10 bg-white border border-[#c3c6d4] px-3 h-9 text-sm text-[#676879]"
                            style={{
                              width: firstColumnWidth,
                              left: onSelectionChange ? checkboxWidth + colorBarWidth : colorBarWidth,
                            }}
                          >
                            <div className="flex items-center gap-2 h-full">
                              <Plus className="w-4 h-4" />
                              <span>Add Item</span>
                            </div>
                          </td>
                          {/* Empty cells for remaining columns */}
                          {visibleColumns.slice(1).map((col) => (
                            <td
                              key={`add-${col.id}`}
                              className="border border-[#c3c6d4] bg-white h-9"
                              style={{ width: getColumnWidth(col) }}
                            />
                          ))}
                          {/* Empty cell for add column */}
                          <td
                            className="border border-[#c3c6d4] bg-white h-9"
                            style={{ width: addColumnWidth }}
                          />
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}

          {/* Add Group Button */}
          {onAddGroup && (
            <button
              onClick={onAddGroup}
              className="flex items-center h-10 px-4 mt-4 text-sm text-[#676879] hover:text-monday-primary hover:bg-monday-primary/5 transition-colors rounded-md border border-dashed border-[#e6e9ef]"
              style={{ width: totalTableWidth, minWidth: totalTableWidth }}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>Add new group</span>
            </button>
          )}
        </div>
      </div>

      {/* Fixed Horizontal Scrollbar - stays at viewport bottom */}
      {hasHorizontalScroll && (
        <div
          ref={scrollbarRef}
          className="fixed h-4 bg-gray-100 border-t border-gray-200 cursor-pointer z-[100]"
          style={{
            left: scrollbarPosition.left,
            width: scrollbarPosition.width,
            bottom: scrollbarPosition.bottom,
          }}
          onClick={handleTrackClick}
        >
          <div
            ref={scrollbarThumbRef}
            className={cn(
              'absolute top-1 h-2 bg-gray-400 rounded-full cursor-grab transition-colors',
              isDraggingScrollbar ? 'bg-gray-500 cursor-grabbing' : 'hover:bg-gray-500'
            )}
            style={{
              width: `${Math.max(thumbWidthPercent, 5)}%`,
              left: `${thumbLeftPercent}%`,
            }}
            onMouseDown={handleScrollbarMouseDown}
          />
        </div>
      )}

      {/* Empty State */}
      {data.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
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

      {/* Resize overlay to prevent text selection during resize */}
      {(resizingColumn || isDraggingScrollbar) && (
        <div className="fixed inset-0 z-50" style={{ cursor: resizingColumn ? 'col-resize' : 'grabbing' }} />
      )}

      {/* Quick Add Column Popup */}
      {showAddColumnPopup && typeof document !== 'undefined' && createPortal(
        <div
          ref={addColumnPopupRef}
          className="fixed z-[9999] bg-white rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200 py-2 min-w-[200px]"
          style={{
            top: addColumnPopupPosition.top,
            left: addColumnPopupPosition.left,
          }}
        >
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Essential Columns
          </div>
          {ESSENTIAL_COLUMNS.map((col) => {
            const Icon = col.icon
            return (
              <button
                key={col.type}
                onClick={() => handleQuickAddColumn(col.type)}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <Icon className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-700">{col.label}</span>
              </button>
            )
          })}
          <div className="border-t border-gray-200 my-2" />
          <button
            onClick={handleOpenMoreColumns}
            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-[#0073ea] font-medium">More columns</span>
          </button>
        </div>,
        document.body
      )}

      {/* All Columns Modal */}
      {showAllColumnsModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAllColumnsModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Column</h2>
              <button
                onClick={() => setShowAllColumnsModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3">
                {ALL_COLUMN_TYPES.map((col) => {
                  const Icon = col.icon
                  return (
                    <button
                      key={col.type}
                      onClick={() => {
                        setShowAllColumnsModal(false)
                        onQuickAddColumn?.(col.type)
                      }}
                      className="flex flex-col items-start p-4 rounded-lg border border-gray-200 hover:border-[#0073ea] hover:bg-[#0073ea]/5 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5 text-gray-500 group-hover:text-[#0073ea]" />
                        <span className="text-sm font-medium text-gray-900">{col.label}</span>
                      </div>
                      <span className="text-xs text-gray-500">{col.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// Skeleton loader
function TableSkeleton({
  columns,
  hasCheckbox,
}: {
  columns: BoardColumn[]
  hasCheckbox: boolean
}) {
  const skeletonRows = Array.from({ length: 5 })

  return (
    <div className="bg-bg-primary rounded-lg overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#f5f6f8]">
            {hasCheckbox && (
              <th className="border border-[#c3c6d4] p-2 w-10">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mx-auto" />
              </th>
            )}
            <th className="border border-[#c3c6d4] p-0 w-1.5 bg-gray-200" />
            {columns.map((column) => (
              <th
                key={column.id}
                className="border border-[#c3c6d4] px-3 py-2 text-left"
                style={{ width: column.width }}
              >
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skeletonRows.map((_, idx) => (
            <tr key={idx}>
              {hasCheckbox && (
                <td className="border border-[#c3c6d4] p-2">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mx-auto" />
                </td>
              )}
              <td className="border border-[#c3c6d4] p-0 bg-gray-200" />
              {columns.map((column) => (
                <td
                  key={column.id}
                  className="border border-[#c3c6d4] px-3 py-2"
                  style={{ width: column.width }}
                >
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MondayBoardTable
