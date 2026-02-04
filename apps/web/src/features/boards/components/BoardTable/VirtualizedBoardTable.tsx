'use client'

import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Trash2, Palette, Type, GripVertical } from 'lucide-react'
import { SortableColumnHeader } from './SortableColumnHeader'
import { CellRenderer } from './CellRenderer'
import { MONDAY_GROUP_COLORS, DEFAULT_GROUP } from './constants'
import { flattenGroupsForVirtualization, type VirtualRow } from '../../utils/flattenGroupsForVirtualization'
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation'
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

interface VirtualizedBoardTableProps {
  boardType: BoardType
  columns: BoardColumn[]
  data: BoardItem[]
  groups?: BoardGroup[]
  isLoading?: boolean
  onRowClick?: (row: BoardItem) => void
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
  onDeleteColumn?: (columnId: string) => void
  presence?: BoardPresence[]
  onCellEditStart?: (itemId: string, columnId: string) => void
  onCellEditEnd?: () => void
}

export function VirtualizedBoardTable({
  boardType,
  columns,
  data,
  groups = [],
  isLoading = false,
  onRowClick,
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
  onDeleteColumn,
  presence = [],
  onCellEditStart,
  onCellEditEnd,
}: VirtualizedBoardTableProps) {
  // Scroll container ref - THIS is the key difference from the non-virtualized version
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
    })
  }, [effectiveGroups, data, collapsedGroups])

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

  // Placeholder sort handler (no-op for now)
  const handleSort = useCallback((_columnId: string) => {
    // Sorting not implemented yet
  }, [])

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
          style={style}
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
                  <td className="w-10 h-9 text-center align-middle">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-[#0073ea] focus:ring-[#0073ea]"
                    />
                  </td>
                )}
                {/* Color bar */}
                <td
                  className="p-0 h-9 rounded-tl"
                  style={{ width: 6, backgroundColor: group.color || '#579bfc' }}
                />
                {/* Group info - spans all data columns */}
                <td
                  colSpan={visibleColumns.length + 1}
                  className="h-9 px-3 align-middle"
                >
                  <div className="flex items-center gap-2">
                    {/* Collapse toggle */}
                    <button
                      onClick={() => handleGroupCollapseToggle(group.id)}
                      className="p-0.5 hover:bg-[#e6e9ef] rounded transition-colors"
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
                    <span className="text-xs text-[#676879]">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>

                    {/* Group menu */}
                    <div className="relative ml-2">
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
              </tr>
            </tbody>
          </table>
        </div>
      )
    }

    if (virtualRow.type === 'column-header') {
      // Column header row - render column names with drag-and-drop support
      const headerGroup = virtualRow.data as BoardGroup
      return (
        <div key={virtualRow.id} style={style}>
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: totalTableWidth }}>
            <thead>
              <tr className="bg-[#f5f6f8]">
                {onSelectionChange && (
                  <th className="bg-[#f5f6f8] border border-[#c3c6d4] p-0 w-10" />
                )}
                <th
                  className="bg-[#f5f6f8] border border-[#c3c6d4] p-0"
                  style={{ width: 6, backgroundColor: headerGroup.color || '#579bfc' }}
                />
                <SortableContext
                  items={visibleColumns.map(col => col.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {visibleColumns.map((col) => (
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
                      menuRef={menuRef as React.RefObject<HTMLDivElement>}
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
                  <td className="bg-white border border-[#c3c6d4] w-10 h-9" />
                )}
                <td
                  className="border border-[#c3c6d4] p-0 rounded-bl h-9"
                  style={{ width: 6, backgroundColor: footerGroup.color || '#579bfc', opacity: 0.3 }}
                />
                <td
                  className="bg-white border border-[#c3c6d4] px-3 h-9 text-sm text-[#676879]"
                  style={{ width: getColumnWidth(visibleColumns[0]) }}
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
            >
              {/* Checkbox column */}
              {onSelectionChange && (
                <td className="bg-white border border-[#c3c6d4] w-10 h-9 text-center">
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
                style={{ width: 6, backgroundColor: group?.color || '#579bfc' }}
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
                    style={{ width: getColumnWidth(col) }}
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
    onOpenAddColumnModal,
    onRowClick,
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
    // Column editing
    editingColumnId,
    editingColumnName,
    setEditingColumnName,
    handleColumnNameDoubleClick,
    handleColumnNameSave,
    handleColumnNameKeyDown,
    openMenuColumnId,
    handleMenuToggle,
    handleDeleteColumnClick,
    handleSort,
    handleResizeStart,
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
          className="h-[calc(100vh-200px)] overflow-auto border border-[#e6e9ef] rounded-lg bg-white"
        >
        {/* Horizontal scroll wrapper */}
        <div style={{ minWidth: totalTableWidth }}>
          {/* Virtualized rows - includes group headers, column headers, items, and footers */}
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
