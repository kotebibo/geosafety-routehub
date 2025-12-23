'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Keyboard, GripVertical, Trash2, Palette, Type } from 'lucide-react'
import { CellRenderer } from './CellRenderer'
import { useKeyboardNavigation, KeyboardShortcutsHelp } from '../../hooks/useKeyboardNavigation'
import type { BoardColumn, BoardItem, BoardGroup, BoardType, BoardPresence, ColumnType } from '../../types/board'
import { ESSENTIAL_COLUMNS, ALL_COLUMN_TYPES, MONDAY_GROUP_COLORS, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH, DEFAULT_GROUP } from './constants'

// @dnd-kit imports for smooth drag-and-drop
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { calculatePopupPosition } from './cells/usePopupPosition'

// Sortable column header component for @dnd-kit
interface SortableColumnHeaderProps {
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
  menuRef: React.RefObject<HTMLDivElement>
}

const SortableColumnHeader = memo(function SortableColumnHeader({
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
  menuRef,
}: SortableColumnHeaderProps) {
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
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative border text-left px-3 py-2 text-xs font-semibold text-[#676879] uppercase tracking-wide cursor-pointer hover:bg-[#ecedf0] transition-colors group',
        isDragging && 'bg-blue-50 shadow-lg',
        'border-[#c3c6d4]'
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        if ((e.target as HTMLElement).closest('.drag-handle')) return
        onSort(column.column_id)
      }}
      onDoubleClick={(e) => {
        if (isEditing) return
        if ((e.target as HTMLElement).closest('.drag-handle')) return
        onColumnNameDoubleClick(e, column)
      }}
    >
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
            column.column_name
          )}
        </span>
        {/* Column menu button */}
        {!isEditing && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMenuToggle(isMenuOpen ? null : column.id)
              }}
              className="column-menu-btn opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#c3c6d4] rounded transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-[#676879]" />
            </button>
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-border-light z-50 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Rename option */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMenuToggle(null)
                    // Trigger double-click handler to enter edit mode
                    onColumnNameDoubleClick(e as any, column)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <Type className="w-4 h-4" />
                  <span>Rename column</span>
                </button>

                {/* Divider */}
                <div className="border-t border-border-light my-1" />

                {/* Delete option */}
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
            )}
          </div>
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
  onGroupRename?: (groupId: string, newName: string) => void
  onGroupColorChange?: (groupId: string, color: string) => void
  onGroupCollapseToggle?: (groupId: string, isCollapsed: boolean) => void
  onDeleteGroup?: (groupId: string) => void
  onColumnResize?: (columnId: string, width: number) => void
  onColumnReorder?: (columnIds: string[]) => void
  onQuickAddColumn?: (columnType: ColumnType) => void
  onOpenAddColumnModal?: () => void
  onColumnRename?: (columnId: string, newName: string) => void
  onDeleteColumn?: (columnId: string) => void
  // Item drag-and-drop between groups
  onItemMove?: (itemId: string, targetGroupId: string) => void
  // Item reorder within group
  onItemReorder?: (itemId: string, targetItemId: string, position: 'before' | 'after') => void
  // Real-time collaboration props
  presence?: BoardPresence[]
  onCellEditStart?: (itemId: string, columnId: string) => void
  onCellEditEnd?: () => void
  // Dynamic grouping by column (from toolbar)
  groupByColumn?: string | null
}

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
  groupByColumn,
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

  // Keyboard shortcuts toggle
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // Row drag-and-drop state (for moving items between groups and reordering within groups)
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null)

  // @dnd-kit column drag state (replaces native HTML5 drag-and-drop)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  // Group menu state
  const [groupMenuOpen, setGroupMenuOpen] = useState<string | null>(null)
  const [groupColorPickerOpen, setGroupColorPickerOpen] = useState<string | null>(null)
  const groupMenuRef = useRef<HTMLDivElement>(null)

  // Column menu state
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null)
  const columnMenuRef = useRef<HTMLDivElement>(null)

  // @dnd-kit sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activating
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Keyboard navigation - flatten items for navigation
  const flattenedItems = useMemo(() => {
    return data.sort((a, b) => a.position - b.position)
  }, [data])

  // Keyboard navigation hook
  const {
    tableRef: keyboardTableRef,
    focusedCell,
    isEditing: isKeyboardEditing,
    isCellFocused,
    isCellEditing,
    setFocusedCell,
  } = useKeyboardNavigation({
    items: flattenedItems,
    columns,
    onCellEdit,
    onRowClick,
    onSelectionChange,
    selection,
    enabled: !resizingColumn && !isDraggingScrollbar,
  })

  // Pre-compute editing users Map for O(1) lookups (instead of O(n) filtering for each cell)
  // This is a critical performance optimization - called for every cell in the table
  const editingUsersMap = useMemo(() => {
    const map = new Map<string, BoardPresence[]>()
    for (const p of presence) {
      if (p.editing_item_id && p.editing_column_id) {
        const key = `${p.editing_item_id}:${p.editing_column_id}`
        const existing = map.get(key) || []
        existing.push(p)
        map.set(key, existing)
      }
    }
    return map
  }, [presence])

  // O(1) lookup instead of O(n) filter
  const getUsersEditingCell = useCallback((itemId: string, columnId: string) => {
    return editingUsersMap.get(`${itemId}:${columnId}`) || []
  }, [editingUsersMap])

  // Helper to check if item is being edited (any cell) - keep filter for this rare use case
  const getUsersEditingItem = useCallback((itemId: string) => {
    return presence.filter(p => p.editing_item_id === itemId)
  }, [presence])

  // Close group menu when clicking outside
  useEffect(() => {
    if (!groupMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
        setGroupMenuOpen(null)
        setGroupColorPickerOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [groupMenuOpen])

  // Close column menu when clicking outside
  useEffect(() => {
    if (!columnMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setColumnMenuOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [columnMenuOpen])

  // Initialize column widths from props - only for new columns, preserve local state
  useEffect(() => {
    setColumnWidths(prev => {
      const newWidths = { ...prev }
      let hasChanges = false

      columns.forEach(col => {
        // Only set width if this column doesn't exist in local state yet
        // OR if we're not actively resizing and the DB value is newer (different)
        if (!(col.id in prev)) {
          newWidths[col.id] = col.width || 150
          hasChanges = true
        }
      })

      // Remove widths for columns that no longer exist
      Object.keys(prev).forEach(colId => {
        if (!columns.find(c => c.id === colId)) {
          delete newWidths[colId]
          hasChanges = true
        }
      })

      return hasChanges ? newWidths : prev
    })
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
      const position = calculatePopupPosition({
        triggerRect: addColumnButtonRef.current.getBoundingClientRect(),
        popupWidth: 220,
        popupHeight: 350,
      })
      setAddColumnPopupPosition(position)
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

  // @dnd-kit drag handlers (much smoother than native HTML5 drag-and-drop)
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    setActiveColumnId(active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveColumnId(null)

    if (!over || !onColumnReorder) return
    if (active.id === over.id) return

    // Get sortable column IDs (excluding first column which stays fixed)
    const sortableColumnIds = visibleColumns.slice(1).map(col => col.id)
    const oldIndex = sortableColumnIds.indexOf(active.id as string)
    const newIndex = sortableColumnIds.indexOf(over.id as string)

    if (oldIndex === -1 || newIndex === -1) return

    // Reorder the sortable columns
    const reorderedSortable = arrayMove(sortableColumnIds, oldIndex, newIndex)

    // Prepend the first column (always stays first)
    const newColumnIds = [visibleColumns[0].id, ...reorderedSortable]

    onColumnReorder(newColumnIds)
  }, [visibleColumns, onColumnReorder])

  const handleDragCancel = useCallback(() => {
    setActiveColumnId(null)
  }, [])

  // Helper to get group_id from item (checks both column and data JSONB)
  const getItemGroupId = useCallback((item: BoardItem): string => {
    if (item.group_id) return item.group_id
    if (item.data?.group_id) return item.data.group_id as string
    return 'default'
  }, [])

  // Item drag-and-drop handlers (for moving items between groups and reordering within groups)
  const handleItemDragStart = useCallback((e: React.DragEvent, itemId: string, groupId: string) => {
    e.dataTransfer.setData('text/plain', itemId)
    e.dataTransfer.setData('application/x-group-id', groupId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingItemId(itemId)
  }, [])

  const handleItemDragEnd = useCallback(() => {
    setDraggingItemId(null)
    setDragOverGroupId(null)
    setDragOverItemId(null)
    setDragOverPosition(null)
  }, [])

  const handleGroupDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
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

  // Row drag-over handler for within-group reordering
  const handleRowDragOver = useCallback((e: React.DragEvent, targetItemId: string, targetGroupId: string) => {
    e.preventDefault()
    e.stopPropagation()

    const sourceGroupId = e.dataTransfer.types.includes('application/x-group-id')
      ? e.dataTransfer.getData('application/x-group-id')
      : null

    // Only show row indicator if in same group and reordering is enabled
    if (onItemReorder && draggingItemId && draggingItemId !== targetItemId) {
      const rect = e.currentTarget.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const position = e.clientY < midY ? 'before' : 'after'

      setDragOverItemId(targetItemId)
      setDragOverPosition(position)
      setDragOverGroupId(targetGroupId)
    }
  }, [onItemReorder, draggingItemId])

  const handleRowDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving the row (not entering a child)
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
      return
    }

    // Get source item's group
    const sourceItem = data.find(item => item.id === sourceItemId)
    const sourceGroupId = sourceItem ? getItemGroupId(sourceItem) : null

    // If same group and reorder is enabled, reorder within group
    if (sourceGroupId === targetGroupId && onItemReorder && dragOverPosition) {
      onItemReorder(sourceItemId, targetItemId, dragOverPosition)
    }
    // If different group, move to group
    else if (sourceGroupId !== targetGroupId && onItemMove) {
      onItemMove(sourceItemId, targetGroupId)
    }

    setDraggingItemId(null)
    setDragOverGroupId(null)
    setDragOverItemId(null)
    setDragOverPosition(null)
  }, [data, onItemMove, onItemReorder, dragOverPosition, getItemGroupId])

  // Group items by group_id or by column value (dynamic grouping)
  const groupedItems = useMemo(() => {
    // If groupByColumn is set, create dynamic groups based on column values
    if (groupByColumn) {
      const column = columns.find(c => c.column_id === groupByColumn)
      const columnName = column?.column_name || groupByColumn

      // Group items by the column value
      const groupsMap = new Map<string, BoardItem[]>()

      data.forEach(item => {
        const value = groupByColumn === 'name'
          ? item.name
          : item.data?.[groupByColumn]

        // Handle different value types
        let groupKey: string
        if (value === null || value === undefined || value === '') {
          groupKey = '(Empty)'
        } else if (typeof value === 'boolean') {
          groupKey = value ? 'Yes' : 'No'
        } else if (typeof value === 'object') {
          // For status objects, use the label
          groupKey = value.label || value.text || JSON.stringify(value)
        } else {
          groupKey = String(value)
        }

        const existing = groupsMap.get(groupKey) || []
        existing.push(item)
        groupsMap.set(groupKey, existing)
      })

      // Convert to array and sort groups alphabetically
      const dynamicGroups = Array.from(groupsMap.entries())
        .sort((a, b) => {
          // Keep (Empty) at the end
          if (a[0] === '(Empty)') return 1
          if (b[0] === '(Empty)') return -1
          return a[0].localeCompare(b[0])
        })
        .map(([groupName, items], index) => ({
          group: {
            id: `dynamic-${groupName}`,
            board_id: '',
            name: groupName,
            color: MONDAY_GROUP_COLORS[index % MONDAY_GROUP_COLORS.length].value,
            position: index,
          } as BoardGroup,
          items: items.sort((a, b) => {
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

      return dynamicGroups
    }

    // Default grouping by group_id
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
  }, [data, groups, columns, sortConfig, groupByColumn])

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      const isCollapsed = next.has(groupId)
      if (isCollapsed) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      // Notify parent if handler provided (for database persistence)
      onGroupCollapseToggle?.(groupId, !isCollapsed)
      return next
    })
  }

  // Group name editing state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const groupNameInputRef = useRef<HTMLInputElement>(null)

  const handleGroupNameDoubleClick = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId)
    setEditingGroupName(currentName)
    setTimeout(() => {
      groupNameInputRef.current?.focus()
      groupNameInputRef.current?.select()
    }, 0)
  }

  const handleGroupNameSave = () => {
    if (editingGroupId && editingGroupName.trim() && onGroupRename) {
      onGroupRename(editingGroupId, editingGroupName.trim())
    }
    setEditingGroupId(null)
    setEditingGroupName('')
  }

  const handleGroupNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGroupNameSave()
    } else if (e.key === 'Escape') {
      setEditingGroupId(null)
      setEditingGroupName('')
    }
  }

  const handleDeleteGroup = (groupId: string, groupName: string, itemCount: number) => {
    // Don't allow deleting if it's the only group
    if (groups.length <= 1) {
      alert('Cannot delete the only group. Create another group first.')
      return
    }

    // Confirm deletion
    const message = itemCount > 0
      ? `Are you sure you want to delete "${groupName}"? ${itemCount} item(s) will be moved to the first group.`
      : `Are you sure you want to delete "${groupName}"?`

    if (confirm(message)) {
      onDeleteGroup?.(groupId)
      setGroupMenuOpen(null)
    }
  }

  const handleDeleteColumn = (column: BoardColumn) => {
    // Confirm deletion
    const message = `Are you sure you want to delete the "${column.column_name}" column? This will remove the column and its data from all items.`

    if (confirm(message)) {
      onDeleteColumn?.(column.id)
      setColumnMenuOpen(null)
    }
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

  // Add column header width
  const addColumnWidth = 44

  // Calculate total table width based on all column widths
  // NOTE: This hook must be called before any early returns to satisfy React's rules of hooks
  const totalTableWidth = useMemo(() => {
    const columnsWidth = visibleColumns.reduce((sum, col) => sum + getColumnWidth(col), 0)
    return checkboxWidth + colorBarWidth + columnsWidth + addColumnWidth
  }, [visibleColumns, getColumnWidth, checkboxWidth, colorBarWidth])

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
              <div
                key={group.id}
                className={cn(
                  groupIndex > 0 && 'mt-6',
                  // Highlight when dragging an item over this group
                  dragOverGroupId === group.id && 'ring-2 ring-[#0073ea] ring-inset rounded-lg'
                )}
                onDragOver={(e) => handleGroupDragOver(e, group.id)}
                onDragLeave={handleGroupDragLeave}
                onDrop={(e) => handleGroupDrop(e, group.id)}
              >
                {/* Group Header Row */}
                <div className="group flex items-center h-9 bg-white" style={{ width: totalTableWidth, minWidth: totalTableWidth }}>
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
                    <div className="flex items-center gap-2 px-3 h-full flex-1">
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="hover:bg-bg-hover rounded p-0.5 transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" style={{ color: group.color }} />
                        ) : (
                          <ChevronDown className="w-4 h-4" style={{ color: group.color }} />
                        )}
                      </button>
                      {editingGroupId === group.id ? (
                        <input
                          ref={groupNameInputRef}
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onBlur={handleGroupNameSave}
                          onKeyDown={handleGroupNameKeyDown}
                          className="font-semibold text-sm bg-white border border-monday-primary rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-monday-primary"
                          style={{ color: group.color, minWidth: '80px' }}
                        />
                      ) : (
                        <span
                          className="font-semibold text-sm cursor-pointer hover:underline"
                          style={{ color: group.color }}
                          onDoubleClick={() => handleGroupNameDoubleClick(group.id, group.name)}
                          title="Double-click to rename"
                        >
                          {group.name}
                        </span>
                      )}
                      <span className="text-xs text-text-tertiary">
                        {groupItemCount} {groupItemCount === 1 ? 'item' : 'items'}
                      </span>

                      {/* Group menu button */}
                      <div className="relative ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setGroupMenuOpen(groupMenuOpen === group.id ? null : group.id)
                          }}
                          className="p-1 rounded hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100"
                          title="Group options"
                        >
                          <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                        </button>

                        {/* Group dropdown menu */}
                        {groupMenuOpen === group.id && (
                          <div
                            ref={groupMenuRef}
                            className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-border-light z-50 py-1"
                          >
                            {/* Rename option */}
                            <button
                              onClick={() => {
                                setGroupMenuOpen(null)
                                handleGroupNameDoubleClick(group.id, group.name)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-hover transition-colors"
                            >
                              <Type className="w-4 h-4 text-text-tertiary" />
                              <span>Rename group</span>
                            </button>

                            {/* Color picker */}
                            <div className="relative">
                              <button
                                onClick={() => setGroupColorPickerOpen(groupColorPickerOpen === group.id ? null : group.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-hover transition-colors"
                              >
                                <Palette className="w-4 h-4 text-text-tertiary" />
                                <span>Change color</span>
                                <div
                                  className="w-4 h-4 rounded ml-auto"
                                  style={{ backgroundColor: group.color }}
                                />
                              </button>

                              {/* Color picker dropdown */}
                              {groupColorPickerOpen === group.id && (
                                <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-lg border border-border-light p-2 grid grid-cols-4 gap-1 w-36">
                                  {MONDAY_GROUP_COLORS.map((colorOption) => (
                                    <button
                                      key={colorOption.value}
                                      onClick={() => {
                                        onGroupColorChange?.(group.id, colorOption.value)
                                        setGroupColorPickerOpen(null)
                                        setGroupMenuOpen(null)
                                      }}
                                      className={cn(
                                        'w-7 h-7 rounded-full hover:scale-110 transition-transform',
                                        group.color === colorOption.value && 'ring-2 ring-offset-1 ring-gray-400'
                                      )}
                                      style={{ backgroundColor: colorOption.value }}
                                      title={colorOption.name}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Divider */}
                            <div className="border-t border-border-light my-1" />

                            {/* Delete option */}
                            <button
                              onClick={() => handleDeleteGroup(group.id, group.name, groupItemCount)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                                groups.length <= 1
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "text-red-600 hover:bg-red-50"
                              )}
                              disabled={groups.length <= 1}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete group</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table content when not collapsed */}
                {!isCollapsed && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={visibleColumns.slice(1).map(col => col.id)}
                      strategy={horizontalListSortingStrategy}
                    >
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
                          className="sticky z-20 bg-[#f5f6f8] border border-[#c3c6d4] text-left px-3 py-2 text-xs font-semibold text-[#676879] uppercase tracking-wide cursor-pointer hover:bg-[#ecedf0] group"
                          style={{
                            width: firstColumnWidth,
                            left: onSelectionChange ? checkboxWidth + colorBarWidth : colorBarWidth,
                          }}
                          onClick={(e) => {
                            // Don't sort if clicking on the input or menu
                            if ((e.target as HTMLElement).tagName === 'INPUT') return
                            if ((e.target as HTMLElement).closest('.column-menu-btn')) return
                            visibleColumns[0] && handleSort(visibleColumns[0].column_id)
                          }}
                          onDoubleClick={(e) => {
                            // Don't trigger if already editing or clicking menu
                            if (editingColumnId) return
                            if ((e.target as HTMLElement).closest('.column-menu-btn')) return
                            if (visibleColumns[0]) handleColumnNameDoubleClick(e, visibleColumns[0])
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span className="flex-1 truncate">
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
                            </span>
                            {/* Column menu button for first column */}
                            {editingColumnId !== visibleColumns[0]?.id && visibleColumns[0] && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setColumnMenuOpen(columnMenuOpen === visibleColumns[0].id ? null : visibleColumns[0].id)
                                  }}
                                  className="column-menu-btn opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#c3c6d4] rounded transition-colors"
                                >
                                  <MoreHorizontal className="w-4 h-4 text-[#676879]" />
                                </button>
                                {columnMenuOpen === visibleColumns[0].id && (
                                  <div
                                    ref={columnMenuRef}
                                    className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-border-light z-50 py-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Rename option */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setColumnMenuOpen(null)
                                        handleColumnNameDoubleClick(e as any, visibleColumns[0])
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text-primary hover:bg-bg-hover transition-colors"
                                    >
                                      <Type className="w-4 h-4" />
                                      <span>Rename column</span>
                                    </button>

                                    {/* Divider */}
                                    <div className="border-t border-border-light my-1" />

                                    {/* Delete option */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteColumn(visibleColumns[0])
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Delete column</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <ResizeHandle columnId={visibleColumns[0]?.id} width={firstColumnWidth} />
                        </th>
                        {/* Non-sticky header cells with @dnd-kit */}
                        {visibleColumns.slice(1).map((column) => (
                          <SortableColumnHeader
                            key={column.id}
                            column={column}
                            width={getColumnWidth(column)}
                            isEditing={editingColumnId === column.id}
                            editingColumnName={editingColumnName}
                            onColumnNameChange={setEditingColumnName}
                            onColumnNameSave={handleColumnNameSave}
                            onColumnNameKeyDown={handleColumnNameKeyDown}
                            onColumnNameDoubleClick={handleColumnNameDoubleClick}
                            onSort={handleSort}
                            onResizeStart={handleResizeStart}
                            canReorder={!editingColumnId && onColumnReorder !== undefined}
                            editInputRef={editInputRef}
                            isMenuOpen={columnMenuOpen === column.id}
                            onMenuToggle={setColumnMenuOpen}
                            onDeleteColumn={handleDeleteColumn}
                            menuRef={columnMenuRef}
                          />
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
                        // Find the global row index for keyboard navigation
                        const globalRowIndex = flattenedItems.findIndex(i => i.id === item.id)

                        const isDragOver = dragOverItemId === item.id
                        const showDropIndicatorBefore = isDragOver && dragOverPosition === 'before'
                        const showDropIndicatorAfter = isDragOver && dragOverPosition === 'after'

                        return (
                          <tr
                            key={item.id}
                            className={cn(
                              'hover:bg-[#f0f3ff] transition-colors cursor-pointer group/row relative',
                              isSelected && 'bg-[#e5e9ff]',
                              draggingItemId === item.id && 'opacity-50',
                              showDropIndicatorBefore && 'before:absolute before:left-0 before:right-0 before:top-0 before:h-[2px] before:bg-[#0073ea] before:z-20',
                              showDropIndicatorAfter && 'after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-[#0073ea] after:z-20'
                            )}
                            onClick={() => onRowClick?.(item)}
                            draggable={!!(onItemMove || onItemReorder)}
                            onDragStart={(e) => handleItemDragStart(e, item.id, group.id)}
                            onDragEnd={handleItemDragEnd}
                            onDragOver={(e) => handleRowDragOver(e, item.id, group.id)}
                            onDragLeave={handleRowDragLeave}
                            onDrop={(e) => handleRowDrop(e, item.id, group.id)}
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
                                  {onItemMove && (
                                    <div className="absolute left-0.5 opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-3 h-3 text-gray-400" />
                                    </div>
                                  )}
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
                                'sticky z-10 border p-0 align-middle',
                                isSelected ? 'bg-[#e5e9ff]' : 'bg-white',
                                isCellFocused(globalRowIndex, 0)
                                  ? 'border-2 border-[#0073ea] z-20'
                                  : 'border-[#c3c6d4]'
                              )}
                              style={{
                                width: firstColumnWidth,
                                left: onSelectionChange ? checkboxWidth + colorBarWidth : colorBarWidth,
                                height: 36,
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setFocusedCell({ rowIndex: globalRowIndex, columnIndex: 0 })
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
                                  isEditing={isCellEditing(globalRowIndex, 0)}
                                  onEdit={(newValue) => onCellEdit?.(item.id, visibleColumns[0].column_id, newValue)}
                                />
                              )}
                            </td>
                            {/* Non-sticky cells */}
                            {visibleColumns.slice(1).map((column, colIndex) => {
                              const value = item.data?.[column.column_id] ?? item[column.column_id as keyof BoardItem]
                              const columnIndex = colIndex + 1 // +1 because we skip the first column
                              const isFocused = isCellFocused(globalRowIndex, columnIndex)
                              const isCellInEditMode = isCellEditing(globalRowIndex, columnIndex)
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
                                    setFocusedCell({ rowIndex: globalRowIndex, columnIndex })
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation()
                                    onRowClick?.(item)
                                  }}
                                  title={isBeingEditedByOther ? `${editingUsers[0].user_name} is editing` : undefined}
                                >
                                  {/* Editing indicator */}
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
                      {/* Drag overlay for visual feedback - rendered via portal */}
                      <DragOverlay>
                        {activeColumnId ? (
                          <div className="bg-white border-2 border-[#0073ea] rounded px-3 py-2 text-xs font-semibold text-[#676879] uppercase tracking-wide shadow-lg">
                            {visibleColumns.find(c => c.id === activeColumnId)?.column_name}
                          </div>
                        ) : null}
                      </DragOverlay>
                    </SortableContext>
                  </DndContext>
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

      {/* Keyboard shortcuts help button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
          className={cn(
            'p-2.5 rounded-full shadow-lg transition-all',
            showKeyboardHelp
              ? 'bg-monday-primary text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          )}
          title="Keyboard shortcuts"
        >
          <Keyboard className="w-5 h-5" />
        </button>
        {showKeyboardHelp && (
          <div className="absolute bottom-12 right-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <KeyboardShortcutsHelp />
          </div>
        )}
      </div>

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
