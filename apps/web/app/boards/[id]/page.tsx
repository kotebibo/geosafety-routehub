'use client'

import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useBoard, useBoardItems, useBoardColumns, useBoardGroups, useCreateBoardGroup, useUpdateBoardGroup, useDeleteBoardGroup, useCreateBoardItem, useUpdateBoardItem, useDuplicateBoardItems, useDeleteBoardItem, useCreateUpdate, useRealtimeBoard, useUndoRedo, type UndoableAction } from '@/features/boards/hooks'
import { queryKeys } from '@/lib/react-query'
import { useInspectorId } from '@/hooks/useInspectorId'
import { VirtualizedBoardTable, ErrorBoundary, BoardPresenceIndicator, BoardToolbar, type SortConfig, type FilterConfig } from '@/features/boards/components'
import { useBoardUpdates } from '@/features/boards/hooks'
import { Button } from '@/shared/components/ui'
import { useToast } from '@/components/ui-monday/Toast'
import { ArrowLeft, Plus, Columns, Search, Download, Upload, Copy, Trash2, Undo2, Redo2, History, FileCheck, Users, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BoardItem, BoardColumn, BoardGroup, ColumnType } from '@/features/boards/types/board'
import { boardsService, userBoardsService } from '@/features/boards/services'
import type { ExportLookups } from '@/features/boards/utils/exportBoard'

// Lazy-load heavy components that aren't needed on initial render
const ColumnConfigPanel = dynamic(() => import('@/features/boards/components/ColumnConfig/ColumnConfigPanel').then(m => ({ default: m.ColumnConfigPanel })), { ssr: false })
const AddColumnModal = dynamic(() => import('@/features/boards/components/ColumnConfig/AddColumnModal').then(m => ({ default: m.AddColumnModal })), { ssr: false })
const ItemDetailDrawer = dynamic(() => import('@/features/boards/components/ItemDetail/ItemDetailDrawer').then(m => ({ default: m.ItemDetailDrawer })), { ssr: false })
const ImportBoardModal = dynamic(() => import('@/features/boards/components/ImportBoardModal').then(m => ({ default: m.ImportBoardModal })), { ssr: false })
const SaveAsTemplateModal = dynamic(() => import('@/features/boards/components/SaveAsTemplateModal').then(m => ({ default: m.SaveAsTemplateModal })), { ssr: false })
const ActivityLogPanel = dynamic(() => import('@/features/boards/components/ActivityLog').then(m => ({ default: m.ActivityLogPanel })), { ssr: false })
const BoardAccessModal = dynamic(() => import('@/features/boards/components/BoardAccessModal').then(m => ({ default: m.BoardAccessModal })), { ssr: false })
const MoveItemModal = dynamic(() => import('@/features/boards/components/MoveItemModal').then(m => ({ default: m.MoveItemModal })), { ssr: false })

// Lazy-load lookup hooks - only fetch when export is triggered
const useLookupData = () => {
  const [lookups, setLookups] = useState<ExportLookups | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchLookups = useCallback(async () => {
    if (lookups) return lookups
    setIsLoading(true)
    try {
      // Dynamic imports for lookup services and supabase
      const [companiesModule, routesModule, inspectorsModule, supabaseModule] = await Promise.all([
        import('@/services/companies.service'),
        import('@/services/routes.service'),
        import('@/services/inspectors.service'),
        import('@/lib/supabase'),
      ])

      const supabase = supabaseModule.createClient() as any

      const [companies, routes, inspectors, serviceTypesResult] = await Promise.all([
        companiesModule.companiesService.getAll(),
        routesModule.routesService.getAll(),
        inspectorsModule.inspectorsService.getActive(),
        supabase.from('service_types').select('id, name').eq('is_active', true),
      ])

      const serviceTypes = serviceTypesResult.data || []

      const newLookups: ExportLookups = {
        persons: new Map(inspectors.map((i: any) => [i.id, i.full_name])),
        companies: new Map(companies.map((c: any) => [c.id, c.name])),
        routes: new Map(routes.map((r: any) => [r.id, r.name])),
        serviceTypes: new Map(serviceTypes.map((s: any) => [s.id, s.name])),
      }
      setLookups(newLookups)
      return newLookups
    } finally {
      setIsLoading(false)
    }
  }, [lookups])

  return { lookups, fetchLookups, isLoading }
}

// Monday.com color palette for groups
const GROUP_COLORS = [
  '#579bfc', // Bright blue
  '#a25ddc', // Dark purple
  '#00c875', // Grass green
  '#fdab3d', // Egg yolk
  '#e2445c', // Berry
  '#00d2d2', // Aquamarine
  '#ffadad', // Peach
  '#784bd1', // Royal
]

// Default group color palette for auto-created groups
const DEFAULT_GROUP_COLOR = '#579bfc'

export default function BoardDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [selectedItem, setSelectedItem] = useState<BoardItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)

  const { data: inspectorId } = useInspectorId(user?.email)

  // Fetch activity log for this board
  const { data: activityUpdates, isLoading: activityLoading, refetch: refetchActivity } = useBoardUpdates(params.id)

  // Lazy lookup data for export - only fetched when user exports
  const { fetchLookups } = useLookupData()

  const { data: board, isLoading: boardLoading, error: boardError } = useBoard(params.id)
  const { data: items, isLoading: itemsLoading, error: itemsError } = useBoardItems(params.id)
  const { data: columns, refetch: refetchColumns } = useBoardColumns(board?.board_type || 'custom', params.id)
  const { data: dbGroups, isLoading: groupsLoading } = useBoardGroups(params.id)

  // Use database groups (auto-create effect below ensures at least one exists)
  const groups = useMemo(() => dbGroups || [], [dbGroups])

  const createItem = useCreateBoardItem(params.id)
  const updateItem = useUpdateBoardItem(params.id)
  const duplicateItems = useDuplicateBoardItems(params.id)
  const deleteItem = useDeleteBoardItem(params.id)
  const createUpdate = useCreateUpdate()
  const createGroup = useCreateBoardGroup(params.id)
  const updateGroup = useUpdateBoardGroup(params.id)
  const deleteGroup = useDeleteBoardGroup(params.id)

  // Auto-create a default group for boards that have none (migration for existing boards)
  const hasAutoCreatedGroup = useRef(false)
  useEffect(() => {
    if (
      board &&
      !groupsLoading &&
      dbGroups &&
      dbGroups.length === 0 &&
      !hasAutoCreatedGroup.current &&
      !createGroup.isPending
    ) {
      hasAutoCreatedGroup.current = true
      createGroup.mutate({
        name: 'Items',
        color: DEFAULT_GROUP_COLOR,
        position: 0,
      })
    }
  }, [board, groupsLoading, dbGroups, createGroup])

  // Deep-link to specific item from global search (?item=<id>)
  const deepLinkedItemRef = useRef(false)
  useEffect(() => {
    const targetItemId = searchParams.get('item')
    if (!targetItemId || !items || items.length === 0 || deepLinkedItemRef.current) return

    const targetItem = items.find((item: BoardItem) => item.id === targetItemId)
    if (targetItem) {
      deepLinkedItemRef.current = true
      setSelectedItem(targetItem)
      // Clean up the URL without triggering a navigation
      router.replace(`/boards/${params.id}`, { scroll: false })
    }
  }, [searchParams, items, params.id, router])

  // Undo/Redo system
  const handleUndoAction = useCallback(async (action: UndoableAction) => {
    try {
      switch (action.type) {
        case 'cell_edit':
          // Revert to previous value
          const currentItem = items?.find(item => item.id === action.targetId)
          if (currentItem && action.metadata?.columnId) {
            if (action.metadata.columnId === 'name') {
              await updateItem.mutateAsync({
                itemId: action.targetId,
                updates: { name: action.previousValue },
              })
            } else {
              await updateItem.mutateAsync({
                itemId: action.targetId,
                updates: {
                  data: { ...currentItem.data, [action.metadata.columnId]: action.previousValue },
                },
              })
            }
          }
          break
        case 'group_rename':
          await updateGroup.mutateAsync({
            groupId: action.targetId,
            updates: { name: action.previousValue },
          })
          break
        case 'group_color_change':
          await updateGroup.mutateAsync({
            groupId: action.targetId,
            updates: { color: action.previousValue },
          })
          break
        default:
          console.log('Undo not implemented for:', action.type)
      }
      showToast('Undone', 'success')
    } catch (error) {
      console.error('Failed to undo:', error)
      showToast('Failed to undo', 'error')
    }
  }, [items, updateItem, updateGroup, showToast])

  const handleRedoAction = useCallback(async (action: UndoableAction) => {
    try {
      switch (action.type) {
        case 'cell_edit':
          const currentItem = items?.find(item => item.id === action.targetId)
          if (currentItem && action.metadata?.columnId) {
            if (action.metadata.columnId === 'name') {
              await updateItem.mutateAsync({
                itemId: action.targetId,
                updates: { name: action.newValue },
              })
            } else {
              await updateItem.mutateAsync({
                itemId: action.targetId,
                updates: {
                  data: { ...currentItem.data, [action.metadata.columnId]: action.newValue },
                },
              })
            }
          }
          break
        case 'group_rename':
          await updateGroup.mutateAsync({
            groupId: action.targetId,
            updates: { name: action.newValue },
          })
          break
        case 'group_color_change':
          await updateGroup.mutateAsync({
            groupId: action.targetId,
            updates: { color: action.newValue },
          })
          break
        default:
          console.log('Redo not implemented for:', action.type)
      }
      showToast('Redone', 'success')
    } catch (error) {
      console.error('Failed to redo:', error)
      showToast('Failed to redo', 'error')
    }
  }, [items, updateItem, updateGroup, showToast])

  const {
    canUndo,
    canRedo,
    pushAction,
    undo: performUndo,
    redo: performRedo,
    lastAction,
  } = useUndoRedo({
    onUndo: handleUndoAction,
    onRedo: handleRedoAction,
  })

  // Real-time collaboration
  const {
    presence,
    isConnected,
    setEditing,
    isUserEditing,
    getUsersEditingItem,
    publishItemChange,
  } = useRealtimeBoard({
    boardId: params.id,
    boardType: board?.board_type || 'custom',
    userId: inspectorId || undefined,
    userName: user?.email?.split('@')[0] || 'User',
    enabled: !!board && !!inspectorId,
  })

  // Filter items based on search, filters, and sorting
  const filteredItems = useMemo(() => {
    let result = items || []

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.name?.toLowerCase().includes(searchLower) ||
        Object.values(item.data || {}).some(val =>
          String(val).toLowerCase().includes(searchLower)
        )
      )
    }

    // Apply column filters
    if (filters.length > 0) {
      result = result.filter(item => {
        return filters.every(filter => {
          const value = filter.column === 'name'
            ? item.name
            : item.data?.[filter.column]

          switch (filter.condition) {
            case 'equals':
              return String(value || '').toLowerCase() === String(filter.value || '').toLowerCase()
            case 'not_equals':
              return String(value || '').toLowerCase() !== String(filter.value || '').toLowerCase()
            case 'contains':
              return String(value || '').toLowerCase().includes(String(filter.value || '').toLowerCase())
            case 'starts_with':
              return String(value || '').toLowerCase().startsWith(String(filter.value || '').toLowerCase())
            case 'ends_with':
              return String(value || '').toLowerCase().endsWith(String(filter.value || '').toLowerCase())
            case 'greater_than':
              return Number(value) > Number(filter.value)
            case 'less_than':
              return Number(value) < Number(filter.value)
            case 'before':
              return new Date(value) < new Date(filter.value)
            case 'after':
              return new Date(value) > new Date(filter.value)
            case 'is_empty':
              return value === null || value === undefined || value === ''
            case 'is_not_empty':
              return value !== null && value !== undefined && value !== ''
            case 'is_checked':
              return value === true
            case 'is_not_checked':
              return value !== true
            default:
              return true
          }
        })
      })
    }

    // Apply sorting
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aVal = sortConfig.column === 'name'
          ? a.name
          : a.data?.[sortConfig.column]
        const bVal = sortConfig.column === 'name'
          ? b.name
          : b.data?.[sortConfig.column]

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1
        if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1

        // Compare based on type
        let comparison = 0
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal
        } else if (aVal instanceof Date || bVal instanceof Date) {
          comparison = new Date(aVal).getTime() - new Date(bVal).getTime()
        } else {
          comparison = String(aVal).localeCompare(String(bVal))
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [items, searchQuery, filters, sortConfig])


  const handleAddItem = async (groupId?: string) => {
    if (!user || !inspectorId) return

    try {
      const newItem = await createItem.mutateAsync({
        board_id: params.id,
        group_id: groupId || groups[0]?.id,
        position: (items?.length || 0) + 1,
        data: {},
        name: 'New Item',
        status: 'default',
        priority: 0,
        created_by: inspectorId,
      })

      // Notify other users about the new item via Ably
      if (newItem?.id) {
        publishItemChange('insert', newItem.id, newItem)
      }

      showToast('Item created successfully', 'success')
    } catch (error) {
      console.error('Failed to create item:', error)
      showToast('Failed to create item', 'error')
    }
  }

  const handleCellEdit = useCallback(async (rowId: string, columnId: string, value: any) => {
    try {
      // Get the FRESH current item from the query cache to avoid stale closure issues
      const cachedItems = queryClient.getQueryData<BoardItem[]>([
        ...queryKeys.routes.all,
        'board-items',
        params.id,
      ])
      const currentItem = cachedItems?.find(item => item.id === rowId)
      if (!currentItem) return

      // Get old value for activity logging
      const oldValue = columnId === 'name'
        ? currentItem.name
        : currentItem.data?.[columnId]

      // Skip if value hasn't actually changed
      if (JSON.stringify(oldValue) === JSON.stringify(value)) return

      // Get column name for description
      const column = columns?.find(c => c.column_id === columnId)
      const fieldName = column?.column_name || columnId

      // Push undoable action before making the change
      pushAction({
        type: 'cell_edit',
        description: `Edit ${fieldName}`,
        targetId: rowId,
        targetType: 'item',
        previousValue: oldValue,
        newValue: value,
        metadata: { columnId, columnName: fieldName },
      })

      // If editing the 'name' column, update the item's name field directly
      if (columnId === 'name') {
        await updateItem.mutateAsync({
          itemId: rowId,
          updates: {
            name: value,
          },
        })
      } else {
        // Update the data JSONB field with the new value
        await updateItem.mutateAsync({
          itemId: rowId,
          updates: {
            data: {
              ...currentItem.data,
              [columnId]: value,
            },
          },
        })
      }

      // Notify other users about the change via Ably (instant real-time)
      publishItemChange('update', rowId, { [columnId]: value })

      // Log the activity (fire and forget - don't block on this)
      if (inspectorId) {
        // Determine update type
        const updateType = columnId === 'status' ? 'status_changed' : 'updated'

        // Format values for display
        const formatValue = (val: any): string => {
          if (val === null || val === undefined) return ''
          if (typeof val === 'object') return JSON.stringify(val)
          return String(val)
        }

        createUpdate.mutate({
          item_type: 'board_item',
          item_id: rowId,
          user_id: inspectorId,
          update_type: updateType,
          field_name: columnId, // Use columnId for data lookup during rollback
          old_value: formatValue(oldValue),
          new_value: formatValue(value),
          metadata: { displayName: fieldName }, // Store display name for UI
        })
      }
    } catch (error) {
      console.error('Failed to update item:', error)
      showToast('Failed to update item', 'error')
    }
  }, [queryClient, params.id, columns, updateItem, publishItemChange, pushAction, createUpdate, inspectorId, showToast])

  const handleRowClick = (row: BoardItem) => {
    setSelectedItem(row)
  }

  // Handle duplicate selected items
  const handleDuplicateSelected = async () => {
    if (selection.size === 0) return

    try {
      await duplicateItems.mutateAsync({
        itemIds: Array.from(selection),
      })
      showToast(`Duplicated ${selection.size} item(s)`, 'success')
      setSelection(new Set())
    } catch (error) {
      console.error('Failed to duplicate items:', error)
      showToast('Failed to duplicate items', 'error')
    }
  }

  // Handle delete selected items
  const handleDeleteSelected = async () => {
    if (selection.size === 0) return

    const confirmMessage = selection.size === 1
      ? 'Are you sure you want to delete this item?'
      : `Are you sure you want to delete ${selection.size} items?`

    if (!confirm(confirmMessage)) return

    try {
      const itemIds = Array.from(selection)
      for (const itemId of itemIds) {
        await deleteItem.mutateAsync(itemId)
        // Notify other users about the deletion via Ably
        publishItemChange('delete', itemId)
      }
      showToast(`Deleted ${selection.size} item(s)`, 'success')
      setSelection(new Set())
    } catch (error) {
      console.error('Failed to delete items:', error)
      showToast('Failed to delete items', 'error')
    }
  }

  const handleUpdateColumn = async (columnId: string, updates: Partial<BoardColumn>) => {
    try {
      await boardsService.updateColumn(columnId, updates)
      await refetchColumns()
      showToast('Column updated', 'success')
    } catch (error) {
      console.error('Failed to update column:', error)
      showToast('Failed to update column', 'error')
    }
  }

  const handleReorderColumns = async (reorderedColumns: BoardColumn[]) => {
    try {
      const updates = reorderedColumns.map((col, index) => ({
        id: col.id,
        position: index,
      }))
      await boardsService.updateColumns(updates)
      await refetchColumns()
    } catch (error) {
      console.error('Failed to reorder columns:', error)
      showToast('Failed to reorder columns', 'error')
    }
  }

  const handleAddColumn = async (columnData: { column_name: string; column_type: any; width: number; config?: Record<string, any> }) => {
    try {
      if (!board) return

      const column_id = columnData.column_name.toLowerCase().replace(/\s+/g, '_')

      // Always include board_id for user-created boards to ensure uniqueness
      const columnPayload: any = {
        board_type: board.board_type,
        board_id: params.id,
        column_id,
        column_name: columnData.column_name,
        column_type: columnData.column_type,
        width: columnData.width,
        position: (columns?.length || 0),
        is_visible: true,
        config: columnData.config || {},
      }

      await boardsService.createColumn(columnPayload)
      await refetchColumns()
      showToast('Column added successfully', 'success')
      setShowAddColumn(false)
    } catch (error) {
      console.error('Failed to add column:', error)
      showToast('Failed to add column', 'error')
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    try {
      // Find the column to get its column_id (the key used in item data)
      const column = columns?.find(col => col.id === columnId)
      const columnKey = column?.column_id

      // Delete the column definition
      await boardsService.deleteColumn(columnId)

      // Clear the column data from all items to prevent ghost data
      // when a new column with the same name is created
      if (columnKey && items && items.length > 0) {
        const updatePromises = items
          .filter(item => item.data && columnKey in item.data)
          .map(item => {
            const newData = { ...item.data }
            delete newData[columnKey]
            return updateItem.mutateAsync({
              itemId: item.id,
              updates: { data: newData }
            })
          })

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises)
        }
      }

      await refetchColumns()
      showToast('Column deleted', 'success')
    } catch (error) {
      console.error('Failed to delete column:', error)
      showToast('Failed to delete column', 'error')
    }
  }

  const handleColumnResize = async (columnId: string, width: number) => {
    try {
      // Optimistically update the cache so the columns data stays in sync
      queryClient.setQueryData(
        ['board-columns', board?.board_type || 'custom', params.id],
        (old: BoardColumn[] | undefined) => {
          if (!old) return old
          return old.map(col => col.id === columnId ? { ...col, width } : col)
        }
      )

      await boardsService.updateColumn(columnId, { width })
    } catch (error) {
      console.error('Failed to resize column:', error)
      // Rollback on error by refetching
      await refetchColumns()
    }
  }

  // Quick add column handler - creates a column with default name based on type
  const handleQuickAddColumn = async (columnType: ColumnType) => {
    if (!board) return

    try {
      // Generate column name based on type
      const typeLabels: Record<ColumnType, string> = {
        text: 'Text',
        number: 'Numbers',
        status: 'Status',
        date: 'Date',
        date_range: 'Date Range',
        person: 'Person',
        location: 'Location',
        actions: 'Actions',
        route: 'Route',
        company: 'Company',
        company_address: 'Company Address',
        service_type: 'Service Type',
        checkbox: 'Checkbox',
        phone: 'Phone',
        files: 'Files',
        updates: 'Updates',
      }

      const baseName = typeLabels[columnType] || 'Column'
      // Find unique name by checking existing columns
      let columnName = baseName
      let counter = 1
      while (columns?.some(col => col.column_name === columnName)) {
        counter++
        columnName = `${baseName} ${counter}`
      }

      const column_id = columnName.toLowerCase().replace(/\s+/g, '_')

      // Always include board_id for user-created boards to ensure uniqueness
      const columnPayload: any = {
        board_type: board.board_type,
        board_id: params.id,
        column_id,
        column_name: columnName,
        column_type: columnType,
        width: 150,
        position: columns?.length || 0,
        is_visible: true,
      }

      await boardsService.createColumn(columnPayload)
      await refetchColumns()
      showToast(`${columnName} column added`, 'success')
    } catch (error) {
      console.error('Failed to add column:', error)
      showToast('Failed to add column', 'error')
    }
  }

  const handleAddGroup = async () => {
    try {
      // Pick a color that's not already in use (or cycle through)
      const usedColors = groups.map(g => g.color)
      const availableColor = GROUP_COLORS.find(c => !usedColors.includes(c)) || GROUP_COLORS[groups.length % GROUP_COLORS.length]

      await createGroup.mutateAsync({
        name: 'New Group',
        color: availableColor,
        position: groups.length,
      })

      showToast('Group added - click the name to rename it', 'success')
    } catch (error) {
      console.error('Failed to add group:', error)
      showToast('Failed to add group', 'error')
    }
  }

  // Handle group rename
  const handleGroupRename = async (groupId: string, newName: string) => {
    try {
      await updateGroup.mutateAsync({ groupId, updates: { name: newName } })
      showToast('Group renamed', 'success')
    } catch (error) {
      console.error('Failed to rename group:', error)
      showToast('Failed to rename group', 'error')
    }
  }

  // Handle group color change
  const handleGroupColorChange = async (groupId: string, color: string) => {
    try {
      await updateGroup.mutateAsync({ groupId, updates: { color } })
    } catch (error) {
      console.error('Failed to change group color:', error)
      showToast('Failed to change group color', 'error')
    }
  }

  // Handle group collapse toggle
  const handleGroupCollapseToggle = async (groupId: string, isCollapsed: boolean) => {
    try {
      await updateGroup.mutateAsync({ groupId, updates: { is_collapsed: isCollapsed } })
    } catch (error) {
      console.error('Failed to toggle group collapse:', error)
    }
  }

  // Handle group delete
  const handleDeleteGroup = async (groupId: string) => {
    // Don't delete if it's the only group
    if (groups.length <= 1) {
      showToast('Cannot delete the last group', 'error')
      return
    }

    try {
      // Find items in the group being deleted
      const itemsInGroup = items?.filter(item => item.data?.group_id === groupId) || []

      // Find the first remaining group to move items to
      const targetGroup = groups.find(g => g.id !== groupId)

      if (itemsInGroup.length > 0 && targetGroup) {
        // Move all items to the target group
        for (const item of itemsInGroup) {
          await updateItem.mutateAsync({
            itemId: item.id,
            updates: {
              group_id: targetGroup.id,
              data: { ...item.data, group_id: targetGroup.id }
            }
          })
        }
      }

      // Now delete the group
      await deleteGroup.mutateAsync(groupId)
      showToast('Group deleted', 'success')
    } catch (error) {
      console.error('Failed to delete group:', error)
      showToast('Failed to delete group', 'error')
    }
  }

  // Handle column rename
  const handleColumnRename = async (columnId: string, newName: string) => {
    try {
      await boardsService.updateColumn(columnId, { column_name: newName })
      await refetchColumns()
      showToast('Column renamed', 'success')
    } catch (error) {
      console.error('Failed to rename column:', error)
      showToast('Failed to rename column', 'error')
    }
  }

  // Handle column reorder from table drag-and-drop (receives column IDs in new order)
  // Uses optimistic update for instant visual feedback
  const handleTableColumnReorder = useCallback(async (columnIds: string[]) => {
    if (!columns || !board) return

    // Map column IDs to full column objects in the new order with updated positions
    const reorderedColumns = columnIds
      .map(id => columns.find(col => col.id === id))
      .filter((col): col is BoardColumn => col !== undefined)
      .map((col, index) => ({ ...col, position: index }))

    // Query key for the columns cache - must match useBoardColumns hook
    // useBoardColumns uses: [...queryKeys.boardColumns.byType(boardType), boardId]
    const columnsQueryKey = [...queryKeys.boardColumns.byType(board.board_type), params.id]

    // Optimistically update the cache immediately (instant visual feedback)
    queryClient.setQueryData(columnsQueryKey, reorderedColumns)

    try {
      // Update positions in database
      const updates = reorderedColumns.map((col, index) => ({
        id: col.id,
        position: index,
      }))

      await boardsService.updateColumns(updates)
      // No need to refetch - optimistic update already applied
    } catch (error) {
      console.error('Failed to reorder columns:', error)
      showToast('Failed to reorder columns', 'error')
      // Rollback on error by refetching
      await refetchColumns()
    }
  }, [columns, board, params.id, queryClient, refetchColumns, showToast])

  // Handle item move between groups (drag-and-drop)
  const handleItemMove = useCallback(async (itemId: string, targetGroupId: string) => {
    try {
      // Get the current item
      const currentItem = items?.find(item => item.id === itemId)
      if (!currentItem) return

      // Get current group_id (from data JSONB or column)
      const currentGroupId = currentItem.group_id || currentItem.data?.group_id

      // Skip if item is already in the target group
      if (currentGroupId === targetGroupId) return

      // Update the item's group_id column and data JSONB
      await updateItem.mutateAsync({
        itemId,
        updates: {
          group_id: targetGroupId,
          data: {
            ...currentItem.data,
            group_id: targetGroupId,
          },
        },
      })

      // Notify other users about the move via Ably
      publishItemChange('update', itemId, { group_id: targetGroupId })

      showToast('Item moved to group', 'success')
    } catch (error) {
      console.error('Failed to move item:', error)
      showToast('Failed to move item', 'error')
    }
  }, [items, updateItem, publishItemChange, showToast])

  // Handle item reorder within a group
  const handleItemReorder = useCallback(async (itemId: string, targetItemId: string, position: 'before' | 'after') => {
    try {
      if (!items) return

      // Find the dragged item and target item
      const draggedItem = items.find(item => item.id === itemId)
      const targetItem = items.find(item => item.id === targetItemId)
      if (!draggedItem || !targetItem) return

      // Get the group ID (from group_id column or data.group_id fallback)
      const firstGroupId = groups[0]?.id || 'default'
      const targetGroupId = targetItem.group_id || targetItem.data?.group_id || firstGroupId

      // Get all items in the same group, sorted by position
      const groupItems = items
        .filter(item => (item.group_id || item.data?.group_id || firstGroupId) === targetGroupId)
        .sort((a, b) => (a.position || 0) - (b.position || 0))

      // Remove the dragged item from its current position
      const filteredItems = groupItems.filter(item => item.id !== itemId)

      // Find the index where to insert
      const targetIndex = filteredItems.findIndex(item => item.id === targetItemId)
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1

      // Insert the dragged item at the new position
      filteredItems.splice(insertIndex, 0, draggedItem)

      // Calculate new positions for all items in the group
      const reorderUpdates = filteredItems.map((item, index) => ({
        id: item.id,
        position: index,
      }))

      // Update positions in database
      await userBoardsService.reorderItems(reorderUpdates)

      // Invalidate the items query to refetch
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', params.id],
      })

      // Notify other users about the reorder via Ably
      publishItemChange('update', itemId, { position: insertIndex })
    } catch (error) {
      console.error('Failed to reorder item:', error)
      showToast('Failed to reorder item', 'error')
    }
  }, [items, queryClient, params.id, publishItemChange, showToast])

  // Handle export - lazy loads lookup data and export utilities
  const handleExport = async (format: 'csv' | 'excel') => {
    if (!board || !columns || !filteredItems) return

    try {
      // Lazy load export utilities and lookup data in parallel
      const [exportModule, lookups] = await Promise.all([
        import('@/features/boards/utils/exportBoard'),
        fetchLookups(),
      ])

      const options = {
        format,
        items: filteredItems,
        columns: columns.filter(col => col.is_visible),
        boardName: board.name,
        lookups,
      }

      if (format === 'csv') {
        exportModule.exportToCSV(options)
      } else {
        exportModule.exportToExcel(options)
      }

      showToast(`Exported to ${format.toUpperCase()}`, 'success')
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export failed:', error)
      showToast('Export failed', 'error')
    }
  }

  // Handle import items
  const handleImportItems = async (
    importedItems: Array<{ name: string; data: Record<string, any>; group_id: string }>
  ) => {
    if (!user || !inspectorId) {
      showToast('You must be logged in to import items', 'error')
      return
    }

    try {
      // Create items one by one (in batches handled by the modal)
      for (const item of importedItems) {
        await createItem.mutateAsync({
          board_id: params.id,
          position: (items?.length || 0) + 1,
          data: item.data,
          name: item.name,
          status: 'default',
          priority: 0,
          created_by: inspectorId,
        })
      }

      showToast(`Imported ${importedItems.length} items`, 'success')
    } catch (error) {
      console.error('Import failed:', error)
      throw error // Re-throw to let modal handle it
    }
  }

  if (boardLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary">Loading board...</span>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-h3 font-semibold text-text-primary mb-2">
          Board not found
        </h2>
        <p className="text-text-secondary mb-6">
          The board you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button variant="primary" onClick={() => router.push('/boards')}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Boards
        </Button>
      </div>
    )
  }

  const getBoardColorClass = (color?: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-monday-primary',
      green: 'bg-status-done',
      red: 'bg-status-stuck',
      yellow: 'bg-status-working',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
    }
    return colorMap[color || 'blue'] || 'bg-monday-primary'
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-secondary">
      {/* Fixed Header - Does NOT scroll */}
      <div className="flex-shrink-0 bg-bg-primary border-b border-border-light">
        <div className="w-full mx-auto px-4 md:px-6 py-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <button
              onClick={() => router.push('/boards')}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Back to Boards</span>
            </button>

            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              {/* Real-time presence indicator */}
              <BoardPresenceIndicator
                presence={presence}
                isConnected={isConnected}
              />

              {/* Activity Log Button */}
              <Button variant="secondary" size="sm" onClick={() => setShowActivityLog(true)}>
                <History className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Activity</span>
              </Button>

              {/* Save as Template Button */}
              <Button variant="secondary" size="sm" onClick={() => setShowSaveAsTemplate(true)}>
                <FileCheck className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Save Template</span>
              </Button>

              {/* Access Button */}
              <Button variant="secondary" size="sm" onClick={() => setShowAccessModal(true)}>
                <Users className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Access</span>
              </Button>

              <Button variant="secondary" size="sm" onClick={() => setShowColumnConfig(true)}>
                <Columns className="w-4 h-4 mr-2" />
                Columns
              </Button>
            </div>
          </div>

          {/* Board Title */}
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', getBoardColorClass(board.color))}>
              <span className="text-white text-xl font-bold">
                {board.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-h2 font-bold text-text-primary">
                {board.name}
              </h1>
              {board.description && (
                <p className="text-sm text-text-tertiary mt-1">
                  {board.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Toolbar - Does NOT scroll */}
      <div className="flex-shrink-0 bg-bg-primary border-b border-border-light px-4 md:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            {selection.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary font-medium">
                  {selection.size} selected
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowMoveModal(true)}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-1" />
                  Move
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDuplicateSelected}
                  disabled={duplicateItems.isPending}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {duplicateItems.isPending ? 'Duplicating...' : 'Duplicate'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteItem.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                <button
                  onClick={() => setSelection(new Set())}
                  className="text-xs text-text-tertiary hover:text-text-secondary ml-1"
                >
                  Clear
                </button>
              </div>
            ) : columns && columns.length > 0 && (
              <BoardToolbar
                columns={columns}
                sortConfig={sortConfig}
                onSortChange={setSortConfig}
                groupByColumn={groupByColumn}
                onGroupByChange={setGroupByColumn}
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Import Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowImportModal(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>

            {/* Export Button */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-border-light z-50 py-1">
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-bg-hover flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-[#00c875]" />
                      Export to CSV
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-bg-hover flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-[#579bfc]" />
                      Export to Excel
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-border-light rounded-md bg-bg-primary focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent w-48"
              />
            </div>
            <span className="text-sm text-text-secondary">
              {filteredItems?.length || 0} items
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Table Area - vertical scroll only, horizontal scroll handled by table */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4">
        {itemsError ? (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-primary rounded-lg border border-border-light">
            <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-50">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Failed to load items</h3>
            <p className="text-sm text-text-secondary mb-4">There was an error loading the board items</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : columns && columns.length > 0 ? (
          <ErrorBoundary>
            <VirtualizedBoardTable
              boardType={board.board_type}
              columns={columns.filter(col => col.is_visible)}
              data={filteredItems || []}
              groups={groups}
              isLoading={itemsLoading || groupsLoading}
              onRowClick={handleRowClick}
              onCellEdit={handleCellEdit}
              selection={selection}
              onSelectionChange={setSelection}
              onAddItem={handleAddItem}
              onAddGroup={handleAddGroup}
              onGroupRename={handleGroupRename}
              onGroupColorChange={handleGroupColorChange}
              onGroupCollapseToggle={handleGroupCollapseToggle}
              onDeleteGroup={handleDeleteGroup}
              onColumnResize={handleColumnResize}
              onColumnReorder={(cols) => handleTableColumnReorder(cols.map(c => c.id))}
              onQuickAddColumn={handleQuickAddColumn}
              onOpenAddColumnModal={() => setShowAddColumn(true)}
              onColumnRename={handleColumnRename}
              onDeleteColumn={handleDeleteColumn}
              onItemMove={handleItemMove}
              onItemReorder={handleItemReorder}
              presence={presence}
              onCellEditStart={(itemId, columnId) => setEditing(itemId, columnId)}
              onCellEditEnd={() => setEditing(null)}
              sortConfig={sortConfig}
              onSortChange={setSortConfig}
            />
          </ErrorBoundary>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-primary rounded-lg border border-border-light">
            <p className="text-text-secondary mb-4">
              No columns configured for this board yet
            </p>
            <Button variant="secondary" onClick={() => setShowAddColumn(true)}>
              Configure Columns
            </Button>
          </div>
        )}
      </div>

      {/* Column Configuration Panel */}
      {showColumnConfig && columns && (
        <ColumnConfigPanel
          columns={columns}
          onClose={() => setShowColumnConfig(false)}
          onUpdateColumn={handleUpdateColumn}
          onReorderColumns={handleReorderColumns}
          onAddColumn={() => {
            setShowColumnConfig(false)
            setShowAddColumn(true)
          }}
          onDeleteColumn={handleDeleteColumn}
        />
      )}

      {/* Add Column Modal */}
      {showAddColumn && (
        <AddColumnModal
          onClose={() => setShowAddColumn(false)}
          onAdd={handleAddColumn}
          existingColumns={columns || []}
        />
      )}

      {/* Item Detail Drawer */}
      {selectedItem && columns && (
        <ItemDetailDrawer
          item={selectedItem}
          columns={columns}
          onClose={() => setSelectedItem(null)}
          onUpdate={async (itemId, updates) => {
            await updateItem.mutateAsync({ itemId, updates })
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && columns && (
        <ImportBoardModal
          columns={columns}
          onImport={handleImportItems}
          onClose={() => setShowImportModal(false)}
          defaultGroupId={groups[0]?.id || 'default'}
        />
      )}

      {/* Save as Template Modal */}
      {showSaveAsTemplate && board && (
        <SaveAsTemplateModal
          isOpen={showSaveAsTemplate}
          onClose={() => setShowSaveAsTemplate(false)}
          boardId={params.id}
          boardName={board.name}
          onSuccess={() => {
            showToast('Board saved as template', 'success')
          }}
        />
      )}

      {/* Board Access Modal */}
      {showAccessModal && board && (
        <BoardAccessModal
          isOpen={showAccessModal}
          onClose={() => setShowAccessModal(false)}
          boardId={params.id}
          boardName={board.name}
          ownerId={board.owner_id}
        />
      )}

      {/* Activity Log Panel */}
      <ActivityLogPanel
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        updates={activityUpdates || []}
        isLoading={activityLoading}
        onRefresh={() => refetchActivity()}
        showRollback={true}
        onRollback={async (update) => {
          // Rollback implementation - restore old value
          if (!update.field_name) {
            showToast('Cannot rollback: no field name', 'error')
            return
          }

          // old_value can be empty string (which is valid), so check for undefined/null
          if (update.old_value === undefined || update.old_value === null) {
            showToast('Cannot rollback: no previous value', 'error')
            return
          }

          try {
            const item = items?.find(i => i.id === update.item_id)
            if (!item) {
              showToast('Cannot rollback: item not found', 'error')
              return
            }

            // Parse old value if it's JSON
            let oldValue: any = update.old_value
            try {
              oldValue = JSON.parse(update.old_value)
            } catch {
              // Keep as string
            }

            // Apply the rollback - field_name contains the columnId (not display name)
            if (update.field_name === 'name') {
              await updateItem.mutateAsync({
                itemId: update.item_id,
                updates: { name: oldValue },
              })
            } else {
              await updateItem.mutateAsync({
                itemId: update.item_id,
                updates: {
                  data: { ...item.data, [update.field_name]: oldValue },
                },
              })
            }

            showToast('Change rolled back successfully', 'success')

            // Force refetch to ensure UI is in sync
            await queryClient.refetchQueries({
              queryKey: [...queryKeys.routes.all, 'board-items', params.id],
              type: 'active',
            })

            // Also refetch activity log
            refetchActivity()
          } catch (error) {
            console.error('Failed to rollback:', error)
            showToast('Failed to rollback change', 'error')
          }
        }}
      />

      {/* Move Item Modal */}
      {showMoveModal && selection.size > 0 && (
        <MoveItemModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          itemIds={Array.from(selection)}
          sourceBoardId={params.id}
          onMoveComplete={(movedCount, failedCount) => {
            if (movedCount > 0) {
              showToast(`Moved ${movedCount} item(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`, failedCount > 0 ? 'warning' : 'success')
              setSelection(new Set())
            } else {
              showToast('Failed to move items', 'error')
            }
          }}
        />
      )}
    </div>
  )
}
