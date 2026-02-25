'use client'

import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Trash2, Palette, Type, GripVertical } from 'lucide-react'
import { SortableColumnHeader, type SortConfig } from './SortableColumnHeader'
import { CellRenderer } from './CellRenderer'
import { SummaryCell } from './cells/SummaryCell'
import { MONDAY_GROUP_COLORS, DEFAULT_GROUP } from './constants'
import { flattenGroupsForVirtualization, type VirtualRow } from '../../utils/flattenGroupsForVirtualization'
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation'
import { useToast } from '@/components/ui-monday/Toast'
import type { BoardColumn, BoardItem, BoardGroup, BoardType, BoardPresence, ColumnType } from '../../types/board'

// @dnd-kit imports
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 48
const FOOTER_HEIGHT = 36
const SUMMARY_HEIGHT = 28

interface VirtualizedBoardTableProps {
  boardType: BoardType
  columns: BoardColumn[]
  data: BoardItem[]
  groups?: BoardGroup[]
  isLoading?: boolean
  onRowClick?: (row: BoardItem) => void
  onRowDoubleClick?: (row: BoardItem) => void
  onCellEdit?: (rowId: string, columnId: string, value: any) => void
  selection?: Set<string>
  onSelectionChange?: (selection: Set<string>) => void
  onItemMove?: (itemId: string, targetGroupId: string) => void
  onItemReorder?: (itemId: string, targetItemId: string, position: 'before' | 'after') => void
  onAddItem?: (groupId: string) => void
  onAddGroup?: () => void
  onGroupRename?: (groupId: string, name: string) => void
  onGroupColorChange?: (groupId: string, color: string) => void
  onGroupCollapseToggle?: (groupId: string, collapsed: boolean) => void
  onDeleteGroup?: (groupId: string) => void
  onColumnResize?: (columnId: string, width: number) => void
  onColumnReorder?: (columns: BoardColumn[]) => void
  onQuickAddColumn?: (columnType: ColumnType, afterColumnId?: string) => void
  onOpenAddColumnModal?: () => void
  onColumnRename?: (columnId: string, newName: string) => void
  onColumnConfigUpdate?: (columnId: string, config: Record<string, any>) => void
  onDeleteColumn?: (columnId: string) => void
  presence?: BoardPresence[]
  onCellEditStart?: (itemId: string, columnId: string) => void
  onCellEditEnd?: () => void
  sortConfig?: SortConfig | null
  onSortChange?: (config: SortConfig | null) => void
  /** Override the scroll container class. Default uses fixed viewport height for full boards. */
  scrollContainerClassName?: string
  /** Search query for match highlighting in global search results */
  highlightQuery?: string
}

export function VirtualizedBoardTable({
  boardType,
  columns,
  data,
  groups = [],
  isLoading = false,
  onRowClick,
  onRowDoubleClick,
  onCellEdit,
  selection = new Set(),
  onSelectionChange,
  onItemMove,
  onItemReorder,
  onAddItem,
  onAddGroup,
  onGroupRename,
  onGroupColorChange,
  onGroupCollapseToggle,
  onDeleteGroup,
  onColumnResize,
  onColumnReorder,
  onQuickAddColumn,
  onOpenAddColumnModal,
  onColumnRename,
  onColumnConfigUpdate,
  onDeleteColumn,
  presence = [],
  onCellEditStart,
  onCellEditEnd,
  sortConfig,
  onSortChange,
  scrollContainerClassName,
  highlightQuery,
}: VirtualizedBoardTableProps) {
  // Scroll container ref - THIS is the key difference from the non-virtualized version
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Ref for sticky header group color bar (updated via scroll handler, no re-render)
  const stickyColorBarRef = useRef<HTMLTableCellElement>(null)

  // Collapsed groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

  // Column drag state
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  // Column header editing state (for SortableColumnHeader)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Toast for copy feedback
  const { showToast } = useToast()
  const handleCopy = useCallback(() => {
    showToast('Copied to clipboard', 'success', 1500)
  }, [showToast])

  // Column resize tracking
  const [isResizing, setIsResizing] = useState(false)
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  // Cell editing state
  const [editingCellId, setEditingCellId] = useState<string | null>(null) // Format: "rowId:columnId"

  // Group menu state
  const [openGroupMenuId, setOpenGroupMenuId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const groupMenuRef = useRef<HTMLDivElement>(null)
  const groupNameInputRef = useRef<HTMLInputElement>(null)

  // Item drag-and-drop state
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null)
  const lastDragStateRef = useRef<{ itemId: string | null; position: 'before' | 'after' | null }>({ itemId: null, position: null })

  // Ensure we have at least one default group
  const effectiveGroups = useMemo(() => {
    if (groups.length === 0) {
      return [DEFAULT_GROUP]
    }
    return groups
  }, [groups])

  // Flatten groups and items for virtualization
  const virtualRows = useMemo(() => {
    return flattenGroupsForVirtualization({
      groups: effectiveGroups,
      items: data,
      collapsedGroups,
      rowHeight: ROW_HEIGHT,
      headerHeight: HEADER_HEIGHT,
      columnHeaderHeight: ROW_HEIGHT,
      footerHeight: FOOTER_HEIGHT,
      summaryHeight: SUMMARY_HEIGHT,
      preserveItemOrder: !!sortConfig,
      skipColumnHeaders: true,
    })
  }, [effectiveGroups, data, collapsedGroups, sortConfig])

  // Pre-compute items by group for summary rows
  const itemsByGroup = useMemo(() => {
    const map = new Map<string, BoardItem[]>()
    const firstGroupId = effectiveGroups[0]?.id || 'default'
    for (const item of data) {
      const groupId = item.group_id || (item.data as any)?.group_id || firstGroupId
      if (!map.has(groupId)) {
        map.set(groupId, [])
      }
      map.get(groupId)!.push(item)
    }
    return map
  }, [data, effectiveGroups])

  // TanStack Virtual setup
  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => virtualRows[index]?.height || ROW_HEIGHT,
    getItemKey: (index) => virtualRows[index]?.id || index,
    overscan: 15, // Render extra rows for smooth scrolling
  })


  // Memoize visible columns
  const visibleColumns = useMemo(() => columns, [columns])

  // Keyboard navigation
  const {
    tableRef,
    focusedCell,
    isEditing: isKeyboardEditing,
    isCellFocused,
    isCellEditing,
    setFocusedCell,
  } = useKeyboardNavigation({
    items: data,
    columns: visibleColumns,
    onCellEdit,
    onRowClick,
    onSelectionChange,
    selection,
    enabled: true,
    onCopy: handleCopy,
  })

  // Get column width
  const getColumnWidth = useCallback((col: BoardColumn) => {
    return columnWidths[col.id] ?? col.width ?? 150
  }, [columnWidths])

  // Calculate total table width
  const totalTableWidth = useMemo(() => {
    const checkboxWidth = onSelectionChange ? 40 : 0
    const colorBarWidth = 6
    const addColumnWidth = 40
    const columnsWidth = visibleColumns.reduce((sum, col) => sum + getColumnWidth(col), 0)
    return checkboxWidth + colorBarWidth + columnsWidth + addColumnWidth
  }, [visibleColumns, getColumnWidth, onSelectionChange])

  // Sticky column offsets for horizontal scroll
  const stickyOffsets = useMemo(() => {
    const checkboxWidth = onSelectionChange ? 40 : 0
    const colorBarWidth = 6
    return {
      checkbox: 0,
      colorBar: checkboxWidth,
      firstCol: checkboxWidth + colorBarWidth,
    }
  }, [onSelectionChange])

  // Handle group collapse toggle
  const handleGroupCollapseToggle = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
    onGroupCollapseToggle?.(groupId, !collapsedGroups.has(groupId))
  }, [collapsedGroups, onGroupCollapseToggle])

  // Cell editing handlers
  const handleCellEditStart = useCallback((rowId: string, columnId: string) => {
    setEditingCellId(`${rowId}:${columnId}`)
    onCellEditStart?.(rowId, columnId)
  }, [onCellEditStart])

  const handleCellEditEnd = useCallback(() => {
    setEditingCellId(null)
    onCellEditEnd?.()
  }, [onCellEditEnd])

  const handleCellEdit = useCallback((rowId: string, columnId: string, value: any) => {
    onCellEdit?.(rowId, columnId, value)
    handleCellEditEnd()
  }, [onCellEdit, handleCellEditEnd])

  // Group menu handlers
  const handleGroupMenuToggle = useCallback((groupId: string | null) => {
    setOpenGroupMenuId(groupId)
  }, [])

  const handleGroupNameDoubleClick = useCallback((e: React.MouseEvent, group: BoardGroup) => {
    e.stopPropagation()
    setEditingGroupId(group.id)
    setEditingGroupName(group.name)
    setOpenGroupMenuId(null)
    setTimeout(() => groupNameInputRef.current?.focus(), 0)
  }, [])

  const handleGroupNameSave = useCallback(() => {
    if (editingGroupId && editingGroupName.trim() && onGroupRename) {
      onGroupRename(editingGroupId, editingGroupName.trim())
    }
    setEditingGroupId(null)
    setEditingGroupName('')
  }, [editingGroupId, editingGroupName, onGroupRename])

  const handleGroupNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGroupNameSave()
    } else if (e.key === 'Escape') {
      setEditingGroupId(null)
      setEditingGroupName('')
    }
  }, [handleGroupNameSave])

  const handleGroupColorChange = useCallback((groupId: string, color: string) => {
    onGroupColorChange?.(groupId, color)
    setOpenGroupMenuId(null)
  }, [onGroupColorChange])

  const handleDeleteGroup = useCallback((groupId: string) => {
    onDeleteGroup?.(groupId)
    setOpenGroupMenuId(null)
  }, [onDeleteGroup])

  // Column header editing handlers
  const handleColumnNameDoubleClick = useCallback((e: React.MouseEvent, column: BoardColumn) => {
    e.stopPropagation()
    setEditingColumnId(column.id)
    setEditingColumnName(column.column_name)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }, [])

  const handleColumnNameSave = useCallback(() => {
    if (editingColumnId && editingColumnName.trim() && onColumnRename) {
      onColumnRename(editingColumnId, editingColumnName.trim())
    }
    setEditingColumnId(null)
    setEditingColumnName('')
  }, [editingColumnId, editingColumnName, onColumnRename])

  const handleColumnNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleColumnNameSave()
    } else if (e.key === 'Escape') {
      setEditingColumnId(null)
      setEditingColumnName('')
    }
  }, [handleColumnNameSave])

  const handleMenuToggle = useCallback((columnId: string | null) => {
    setOpenMenuColumnId(columnId)
  }, [])

  const handleDeleteColumnClick = useCallback((column: BoardColumn) => {
    if (onDeleteColumn) {
      onDeleteColumn(column.id)
    }
    setOpenMenuColumnId(null)
  }, [onDeleteColumn])

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string, width: number) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizingColumnId(columnId)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = width
  }, [])

  // Handle resize mouse move
  useEffect(() => {
    if (!isResizing || !resizingColumnId) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current
      const newWidth = Math.max(60, resizeStartWidth.current + delta)
      setColumnWidths(prev => ({ ...prev, [resizingColumnId]: newWidth }))
    }

    const handleMouseUp = () => {
      if (resizingColumnId && onColumnResize) {
        const newWidth = columnWidths[resizingColumnId] ?? resizeStartWidth.current
        onColumnResize(resizingColumnId, newWidth)
      }
      setIsResizing(false)
      setResizingColumnId(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizingColumnId, columnWidths, onColumnResize])

  // Update sticky header color bar to match the current group on scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const updateStickyColor = () => {
      const st = container.scrollTop
      let currentColor = '#c3c6d4'
      let accHeight = 0

      for (const vr of virtualRows) {
        if (vr.type === 'group-header') {
          currentColor = (vr.data as BoardGroup).color || '#579bfc'
        }
        accHeight += vr.height
        if (accHeight > st + HEADER_HEIGHT) break
      }

      if (stickyColorBarRef.current) {
        stickyColorBarRef.current.style.backgroundColor = currentColor
      }
    }

    container.addEventListener('scroll', updateStickyColor, { passive: true })
    updateStickyColor()
    return () => container.removeEventListener('scroll', updateStickyColor)
  }, [virtualRows])

  // Sort handler: cycles asc → desc → clear
  const handleSort = useCallback((columnId: string) => {
    if (!onSortChange) return
    if (sortConfig?.column === columnId) {
      if (sortConfig.direction === 'asc') {
        onSortChange({ column: columnId, direction: 'desc' })
      } else {
        onSortChange(null)
      }
    } else {
      onSortChange({ column: columnId, direction: 'asc' })
    }
  }, [sortConfig, onSortChange])

  // DnD sensors for column dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  )

  // Column drag handlers
  const handleColumnDragStart = useCallback((event: DragStartEvent) => {
    setActiveColumnId(event.active.id as string)
  }, [])

  const handleColumnDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveColumnId(null)

    if (over && active.id !== over.id && onColumnReorder) {
      const oldIndex = visibleColumns.findIndex(col => col.id === active.id)
      const newIndex = visibleColumns.findIndex(col => col.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newColumns = arrayMove([...visibleColumns], oldIndex, newIndex)
        onColumnReorder(newColumns)
      }
    }
  }, [visibleColumns, onColumnReorder])

  // Item drag-and-drop handlers
  const getItemGroupId = useCallback((item: BoardItem) => {
    return item.group_id || (item.data as any)?.group_id || effectiveGroups[0]?.id
  }, [effectiveGroups])

  const handleRowDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingItemId(itemId)
  }, [])

  const handleRowDragOver = useCallback((e: React.DragEvent, targetItemId: string, targetGroupId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (onItemReorder && draggingItemId && draggingItemId !== targetItemId) {
      const rect = e.currentTarget.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const position = e.clientY < midY ? 'before' : 'after'

      if (lastDragStateRef.current.itemId === targetItemId && lastDragStateRef.current.position === position) {
        return
      }

      lastDragStateRef.current = { itemId: targetItemId, position }
      setDragOverItemId(targetItemId)
      setDragOverPosition(position)
      setDragOverGroupId(targetGroupId)
    }
  }, [onItemReorder, draggingItemId])

  const handleRowDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverItemId(null)
      setDragOverPosition(null)
    }
  }, [])

  const handleRowDrop = useCallback((e: React.DragEvent, targetItemId: string, targetGroupId: string) => {
    e.preventDefault()
    e.stopPropagation()

    const sourceItemId = e.dataTransfer.getData('text/plain')
    if (!sourceItemId || sourceItemId === targetItemId) {
      setDraggingItemId(null)
      setDragOverGroupId(null)
      setDragOverItemId(null)
      setDragOverPosition(null)
      lastDragStateRef.current = { itemId: null, position: null }
      return
    }

    const sourceItem = data.find(item => item.id === sourceItemId)
    const sourceGroupId = sourceItem ? getItemGroupId(sourceItem) : null

    if (sourceGroupId === targetGroupId && onItemReorder && dragOverPosition) {
      onItemReorder(sourceItemId, targetItemId, dragOverPosition)
    } else if (sourceGroupId !== targetGroupId && onItemMove) {
      onItemMove(sourceItemId, targetGroupId)
    }

    setDraggingItemId(null)
    setDragOverGroupId(null)
    setDragOverItemId(null)
    setDragOverPosition(null)
    lastDragStateRef.current = { itemId: null, position: null }
  }, [data, onItemMove, onItemReorder, dragOverPosition, getItemGroupId])

  const handleGroupDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    setDragOverGroupId(groupId)
  }, [])

  const handleGroupDragLeave = useCallback(() => {
    setDragOverGroupId(null)
  }, [])

  const handleGroupDrop = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    const itemId = e.dataTransfer.getData('text/plain')
    if (itemId && onItemMove) {
      onItemMove(itemId, groupId)
    }
    setDraggingItemId(null)
    setDragOverGroupId(null)
    setDragOverItemId(null)
    setDragOverPosition(null)
  }, [onItemMove])

  // Render a virtual row based on its type
  const renderVirtualRow = useCallback((virtualRow: VirtualRow, virtualItem: any) => {
    if (!virtualRow) return null

    const style: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: `${virtualItem.size}px`,
      transform: `translateY(${virtualItem.start}px)`,
    }

    if (virtualRow.type === 'group-header') {
      const group = virtualRow.data as BoardGroup
      const isCollapsed = collapsedGroups.has(group.id)
      const itemCount = data.filter(item => {
        const itemGroupId = item.group_id || (item.data as any)?.group_id || effectiveGroups[0]?.id
        return itemGroupId === group.id
      }).length
      const isEditingName = editingGroupId === group.id
      const isMenuOpen = openGroupMenuId === group.id

      // Use table layout to match column alignment
      const isGroupDragOver = dragOverGroupId === group.id && !dragOverItemId
      return (
        <div
          key={virtualRow.id}
          style={{ ...style, zIndex: 25 }}
          className={cn(
            "group",
            isGroupDragOver && "ring-2 ring-[#0073ea] ring-inset rounded"
          )}
          onDragOver={(e) => handleGroupDragOver(e, group.id)}
          onDragLeave={handleGroupDragLeave}
          onDrop={(e) => handleGroupDrop(e, group.id)}
        >
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: totalTableWidth }}>
            <tbody>
              <tr className="h-9 bg-white">
                {/* Checkbox column */}
                {onSelectionChange && (
                  <td
                    className="w-10 h-9 text-center align-middle bg-white"
                    style={{ position: 'sticky', left: stickyOffsets.checkbox, zIndex: 2 }}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-[#0073ea] focus:ring-[#0073ea]"
                    />
                  </td>
                )}
                {/* Color bar */}
                <td
                  className="p-0 h-9 rounded-tl"
                  style={{ width: 6, backgroundColor: group.color || '#579bfc', position: 'sticky', left: stickyOffsets.colorBar, zIndex: 2 }}
                />
                {/* Group info - sticky first col */}
                <td
                  className="h-9 px-3 align-middle bg-white"
                  style={{ width: getColumnWidth(visibleColumns[0]), position: 'sticky', left: stickyOffsets.firstCol, zIndex: 2 }}
                >
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    {/* Collapse toggle */}
                    <button
                      onClick={() => handleGroupCollapseToggle(group.id)}
                      className="p-0.5 hover:bg-[#e6e9ef] rounded transition-colors flex-shrink-0"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" style={{ color: group.color || '#579bfc' }} />
                      ) : (
                        <ChevronDown className="w-4 h-4" style={{ color: group.color || '#579bfc' }} />
                      )}
                    </button>
                    {/* Group name */}
                    {isEditingName ? (
                      <input
                        ref={groupNameInputRef}
                        type="text"
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onBlur={handleGroupNameSave}
                        onKeyDown={handleGroupNameKeyDown}
                        className="font-semibold text-sm bg-white border border-[#0073ea] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#0073ea]"
                        style={{ color: group.color || '#579bfc', minWidth: '80px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="font-semibold text-sm cursor-pointer hover:underline"
                        style={{ color: group.color || '#579bfc' }}
                        onDoubleClick={(e) => handleGroupNameDoubleClick(e, group)}
                        title="Double-click to rename"
                      >
                        {group.name}
                      </span>
                    )}
                    <span className="text-xs text-[#676879] flex-shrink-0">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>

                    {/* Group menu */}
                    <div className="relative ml-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGroupMenuToggle(isMenuOpen ? null : group.id)
                        }}
                        className="p-1 rounded hover:bg-[#e6e9ef] transition-colors opacity-0 group-hover:opacity-100"
                        title="Group options"
                      >
                        <MoreHorizontal className="w-4 h-4 text-[#676879]" />
                      </button>
                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => handleGroupMenuToggle(null)}
                          />
                          <div
                            ref={groupMenuRef}
                            className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleGroupNameDoubleClick(e, group)
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Type className="w-4 h-4" />
                              Rename group
                            </button>
                            <div className="px-3 py-2">
                              <div className="text-xs text-gray-500 mb-2">Change color</div>
                              <div className="flex flex-wrap gap-1">
                                {MONDAY_GROUP_COLORS.map((color) => (
                                  <button
                                    key={color.value}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleGroupColorChange(group.id, color.value)
                                    }}
                                    className={cn(
                                      'w-5 h-5 rounded-full border-2',
                                      group.color === color.value ? 'border-gray-800' : 'border-transparent'
                                    )}
                                    style={{ backgroundColor: color.value }}
                                  />
                                ))}
                              </div>
                            </div>
                            {onDeleteGroup && effectiveGroups.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteGroup(group.id)
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete group
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
                {/* Empty cells for remaining columns */}
                {visibleColumns.slice(1).map((col) => (
                  <td
                    key={`group-${group.id}-${col.id}`}
                    className="h-9 bg-white"
                    style={{ width: getColumnWidth(col) }}
                  />
                ))}
                {/* Empty cell for add column */}
                <td className="h-9 bg-white w-10" />
              </tr>
            </tbody>
          </table>
        </div>
      )
    }

    if (virtualRow.type === 'column-header') {
      const colHeaderGroup = virtualRow.data as BoardGroup
      return (
        <div key={virtualRow.id} style={style}>
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: totalTableWidth }}>
            <thead>
              <tr className="bg-[#f5f6f8]">
                {onSelectionChange && (
                  <th
                    className="bg-[#f5f6f8] border border-[#c3c6d4] p-0 w-10"
                    style={{ position: 'sticky', left: stickyOffsets.checkbox, zIndex: 2 }}
                  />
                )}
                <th
                  className="bg-[#f5f6f8] border border-[#c3c6d4] p-0"
                  style={{ width: 6, backgroundColor: colHeaderGroup.color || '#579bfc', position: 'sticky', left: stickyOffsets.colorBar, zIndex: 2 }}
                />
                {visibleColumns.map((col, idx) => (
                  <th
                    key={col.id}
                    className="bg-[#f5f6f8] border border-[#c3c6d4] text-left px-3 py-2 text-xs font-semibold text-[#676879] uppercase tracking-wide cursor-pointer hover:bg-[#ecedf0] transition-colors"
                    style={{
                      width: getColumnWidth(col),
                      ...(idx === 0 ? { position: 'sticky' as const, left: stickyOffsets.firstCol, zIndex: 2, backgroundColor: '#f5f6f8' } : {}),
                    }}
                    onClick={() => handleSort(col.column_id)}
                  >
                    {col.column_name}
                  </th>
                ))}
                <th className="bg-[#f5f6f8] border border-[#c3c6d4] w-10 px-2 py-2">
                  {onOpenAddColumnModal && (
                    <button
                      onClick={onOpenAddColumnModal}
                      className="p-1 rounded hover:bg-[#c3c6d4] transition-colors"
                      title="Add column"
                    >
                      <Plus className="w-4 h-4 text-[#676879]" />
                    </button>
                  )}
                </th>
              </tr>
            </thead>
          </table>
        </div>
      )
    }

    if (virtualRow.type === 'group-summary') {
      const summaryGroup = virtualRow.data as BoardGroup
      const groupItems = itemsByGroup.get(summaryGroup.id) || []

      return (
        <div key={virtualRow.id} style={style}>
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: totalTableWidth }}>
            <tbody>
              <tr className="h-7">
                {onSelectionChange && (
                  <td
                    className="bg-[#f5f6f8] border border-[#c3c6d4] w-10 h-7"
                    style={{ position: 'sticky', left: stickyOffsets.checkbox, zIndex: 2 }}
                  />
                )}
                <td
                  className="border border-[#c3c6d4] p-0 h-7"
                  style={{ width: 6, backgroundColor: summaryGroup.color || '#579bfc', opacity: 0.3, position: 'sticky', left: stickyOffsets.colorBar, zIndex: 2 }}
                />
                {visibleColumns.map((col, colIndex) => (
                  <td
                    key={`summary-${col.id}`}
                    className="border border-[#c3c6d4] bg-[#f5f6f8] h-7 p-0"
                    style={{
                      width: getColumnWidth(col),
                      ...(colIndex === 0 ? { position: 'sticky' as const, left: stickyOffsets.firstCol, zIndex: 2 } : {}),
                    }}
                  >
                    <SummaryCell column={col} items={groupItems} />
                  </td>
                ))}
                <td className="border border-[#c3c6d4] bg-[#f5f6f8] w-10 h-7" />
              </tr>
            </tbody>
          </table>
        </div>
      )
    }

    if (virtualRow.type === 'group-footer') {
      const footerGroup = virtualRow.data as BoardGroup

      return (
        <div key={virtualRow.id} style={style}>
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: totalTableWidth }}>
            <tbody>
              <tr
                className="hover:bg-[#f0f3ff] cursor-pointer h-9"
                onClick={() => onAddItem?.(footerGroup.id)}
              >
                {onSelectionChange && (
                  <td
                    className="bg-white border border-[#c3c6d4] w-10 h-9"
                    style={{ position: 'sticky', left: stickyOffsets.checkbox, zIndex: 2 }}
                  />
                )}
                <td
                  className="border border-[#c3c6d4] p-0 rounded-bl h-9"
                  style={{ width: 6, backgroundColor: footerGroup.color || '#579bfc', opacity: 0.3, position: 'sticky', left: stickyOffsets.colorBar, zIndex: 2 }}
                />
                <td
                  className="bg-white border border-[#c3c6d4] px-3 h-9 text-sm text-[#676879]"
                  style={{ width: getColumnWidth(visibleColumns[0]), position: 'sticky', left: stickyOffsets.firstCol, zIndex: 2 }}
                >
                  {onAddItem && (
                    <div className="flex items-center gap-2 h-full">
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </div>
                  )}
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
                <td className="border border-[#c3c6d4] bg-white w-10 h-9" />
              </tr>
            </tbody>
          </table>
        </div>
      )
    }

    // Item row
    const item = virtualRow.data as BoardItem
    const group = effectiveGroups.find(g => g.id === virtualRow.groupId)
    const itemGroupId = virtualRow.groupId
    const isDragging = draggingItemId === item.id
    const isDragOver = dragOverItemId === item.id
    const canDrag = !!(onItemMove || onItemReorder)

    return (
      <div key={virtualRow.id} style={style}>
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: totalTableWidth }}>
          <tbody>
            <tr
              draggable={canDrag}
              onDragStart={(e) => handleRowDragStart(e, item.id)}
              onDragOver={(e) => handleRowDragOver(e, item.id, itemGroupId)}
              onDragLeave={handleRowDragLeave}
              onDrop={(e) => handleRowDrop(e, item.id, itemGroupId)}
              className={cn(
                'h-9 hover:bg-[#f5f6f8] cursor-pointer relative',
                selection.has(item.id) && 'bg-[#cce5ff]',
                isDragging && 'opacity-50',
                isDragOver && dragOverPosition === 'before' && 'before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-[#0073ea]',
                isDragOver && dragOverPosition === 'after' && 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0073ea]'
              )}
              onClick={() => onRowClick?.(item)}
              onDoubleClick={() => onRowDoubleClick?.(item)}
            >
              {/* Checkbox column */}
              {onSelectionChange && (
                <td
                  className="bg-white border border-[#c3c6d4] w-10 h-9 text-center"
                  style={{ position: 'sticky', left: stickyOffsets.checkbox, zIndex: 2 }}
                >
                  <input
                    type="checkbox"
                    checked={selection.has(item.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      const newSelection = new Set(selection)
                      if (e.target.checked) {
                        newSelection.add(item.id)
                      } else {
                        newSelection.delete(item.id)
                      }
                      onSelectionChange(newSelection)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-[#0073ea] focus:ring-[#0073ea]"
                  />
                </td>
              )}
              {/* Color bar */}
              <td
                className="border border-[#c3c6d4] p-0 h-9"
                style={{ width: 6, backgroundColor: group?.color || '#579bfc', position: 'sticky', left: stickyOffsets.colorBar, zIndex: 2 }}
              />
              {/* Data columns */}
              {visibleColumns.map((col, colIndex) => {
                const cellId = `${item.id}:${col.column_id}`
                const rowIndex = data.findIndex(d => d.id === item.id)
                const isEditing = editingCellId === cellId || isCellEditing(rowIndex, colIndex)
                const isFocused = isCellFocused(rowIndex, colIndex)
                const value = col.column_id === 'name' ? item.name : (item.data?.[col.column_id] ?? '')

                return (
                  <td
                    key={col.id}
                    className={cn(
                      "bg-white border border-[#c3c6d4] px-0 py-0 text-sm h-9 relative",
                      isFocused && !isEditing && "ring-2 ring-inset ring-[#0073ea]"
                    )}
                    style={{
                      width: getColumnWidth(col),
                      ...(colIndex === 0 ? { position: 'sticky' as const, left: stickyOffsets.firstCol, zIndex: 2 } : {}),
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setFocusedCell({ rowIndex, columnIndex: colIndex })
                    }}
                  >
                    <CellRenderer
                      row={item}
                      column={col}
                      value={value}
                      isEditing={isEditing}
                      onEdit={(newValue) => handleCellEdit(item.id, col.column_id, newValue)}
                      onEditStart={() => handleCellEditStart(item.id, col.column_id)}
                      highlightQuery={highlightQuery}
                    />
                  </td>
                )
              })}
              {/* Empty cell for add column alignment */}
              <td className="bg-white border border-[#c3c6d4] w-10 h-9" />
            </tr>
          </tbody>
        </table>
      </div>
    )
  }, [
    collapsedGroups,
    data,
    effectiveGroups,
    handleGroupCollapseToggle,
    onAddItem,
    onRowClick,
    onRowDoubleClick,
    onSelectionChange,
    onDeleteGroup,
    selection,
    visibleColumns,
    getColumnWidth,
    totalTableWidth,
    // Cell editing
    editingCellId,
    handleCellEdit,
    handleCellEditStart,
    // Column header (inline uses handleSort only)
    handleSort,
    // Keyboard navigation
    isCellFocused,
    isCellEditing,
    setFocusedCell,
    // Group editing
    editingGroupId,
    editingGroupName,
    setEditingGroupName,
    handleGroupNameDoubleClick,
    handleGroupNameSave,
    handleGroupNameKeyDown,
    openGroupMenuId,
    handleGroupMenuToggle,
    handleGroupColorChange,
    handleDeleteGroup,
    // Sticky positioning
    stickyOffsets,
    // Item drag-and-drop
    draggingItemId,
    dragOverGroupId,
    dragOverItemId,
    dragOverPosition,
    onItemMove,
    onItemReorder,
    handleRowDragStart,
    handleRowDragOver,
    handleRowDragLeave,
    handleRowDrop,
    handleGroupDragOver,
    handleGroupDragLeave,
    handleGroupDrop,
    itemsByGroup,
    highlightQuery,
  ])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div ref={tableRef} tabIndex={0} className="outline-none">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleColumnDragStart}
        onDragEnd={handleColumnDragEnd}
      >
        {/* Fixed height scroll container - CRITICAL for virtualization */}
        <div
          ref={scrollContainerRef}
          className={scrollContainerClassName || "h-[calc(100vh-200px)] overflow-auto border border-[#e6e9ef] rounded-lg bg-white"}
        >
        {/* Horizontal scroll wrapper */}
        <div style={{ minWidth: totalTableWidth }}>
          {/* Sticky column header overlay - stays above group headers (z:30 > group z:25) */}
          <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: totalTableWidth }}>
              <thead>
                <tr className="bg-[#f5f6f8]">
                  {onSelectionChange && (
                    <th
                      className="bg-[#f5f6f8] border border-[#c3c6d4] p-0 w-10"
                      style={{ position: 'sticky', left: stickyOffsets.checkbox, zIndex: 12 }}
                    />
                  )}
                  <th
                    ref={stickyColorBarRef}
                    className="bg-[#f5f6f8] border border-[#c3c6d4] p-0"
                    style={{ width: 6, backgroundColor: '#c3c6d4', position: 'sticky', left: stickyOffsets.colorBar, zIndex: 12 }}
                  />
                  <SortableContext
                    items={visibleColumns.map(col => col.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {visibleColumns.map((col, idx) => (
                      <SortableColumnHeader
                        key={col.id}
                        column={col}
                        width={getColumnWidth(col)}
                        isEditing={editingColumnId === col.id}
                        editingColumnName={editingColumnName}
                        onColumnNameChange={setEditingColumnName}
                        onColumnNameSave={handleColumnNameSave}
                        onColumnNameKeyDown={handleColumnNameKeyDown}
                        onColumnNameDoubleClick={handleColumnNameDoubleClick}
                        onSort={handleSort}
                        onResizeStart={handleResizeStart}
                        canReorder={true}
                        editInputRef={editInputRef as React.RefObject<HTMLInputElement>}
                        isMenuOpen={openMenuColumnId === col.id}
                        onMenuToggle={handleMenuToggle}
                        onDeleteColumn={handleDeleteColumnClick}
                        onColumnConfigUpdate={onColumnConfigUpdate}
                        menuRef={menuRef as React.RefObject<HTMLDivElement>}
                        sortConfig={sortConfig}
                        stickyStyle={idx === 0 ? {
                          position: 'sticky',
                          left: stickyOffsets.firstCol,
                          zIndex: 12,
                        } : undefined}
                      />
                    ))}
                  </SortableContext>
                  <th className="bg-[#f5f6f8] border border-[#c3c6d4] w-10 px-2 py-2">
                    {onOpenAddColumnModal && (
                      <button
                        onClick={onOpenAddColumnModal}
                        className="p-1 rounded hover:bg-[#c3c6d4] transition-colors"
                        title="Add column"
                      >
                        <Plus className="w-4 h-4 text-[#676879]" />
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
            </table>
          </div>

          {/* Virtualized rows - includes group headers, column headers, items, summaries, and footers */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const virtualRow = virtualRows[virtualItem.index]
              if (!virtualRow) return null
              return renderVirtualRow(virtualRow, virtualItem)
            })}
          </div>

          {/* Add Group Button */}
          {onAddGroup && (
            <button
              onClick={onAddGroup}
              className="flex items-center h-10 px-4 mt-4 text-sm text-[#676879] hover:text-[#0073ea] hover:bg-[#0073ea]/5 transition-colors rounded-md border border-dashed border-[#e6e9ef]"
              style={{ width: totalTableWidth, minWidth: totalTableWidth }}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>Add new group</span>
            </button>
          )}
        </div>
      </div>

        {/* Column drag overlay */}
        <DragOverlay>
          {activeColumnId && (
            <div className="bg-white border-2 border-[#0073ea] rounded px-3 py-2 text-xs font-semibold text-[#676879] uppercase tracking-wide shadow-lg">
              {visibleColumns.find(c => c.id === activeColumnId)?.column_name || activeColumnId}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
