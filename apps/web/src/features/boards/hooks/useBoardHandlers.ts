import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { boardsService, userBoardsService } from '../services'
import type { BoardItem, BoardColumn, BoardGroup, ColumnType } from '../types/board'
import type { ExportLookups } from '../utils/exportBoard'

// Monday.com color palette for groups
const GROUP_COLORS = [
  '#579bfc', '#a25ddc', '#00c875', '#fdab3d',
  '#e2445c', '#00d2d2', '#ffadad', '#784bd1',
]

interface UseBoardHandlersParams {
  boardId: string
  board: any
  items: BoardItem[] | undefined
  columns: BoardColumn[] | undefined
  groups: BoardGroup[]
  inspectorId: string | null | undefined
  // Mutations
  createItem: { mutateAsync: (args: any) => Promise<any> }
  updateItem: { mutateAsync: (args: { itemId: string; updates: any }) => Promise<any> }
  duplicateItems: { mutateAsync: (args: { itemIds: string[] }) => Promise<any>; isPending: boolean }
  deleteItem: { mutateAsync: (id: string) => Promise<any>; isPending: boolean }
  createUpdate: { mutate: (args: any) => void }
  createGroup: { mutateAsync: (args: any) => Promise<any> }
  updateGroup: { mutateAsync: (args: { groupId: string; updates: any }) => Promise<any> }
  deleteGroup: { mutateAsync: (id: string) => Promise<any> }
  refetchColumns: () => Promise<any>
  // State setters
  setSelection: (s: Set<string>) => void
  setShowAddColumn: (v: boolean) => void
  setShowExportMenu: (v: boolean) => void
  // Undo/redo
  pushAction: (action: any) => void
  // Realtime
  publishItemChange: (type: 'insert' | 'update' | 'delete', itemId: string, data?: Record<string, any>) => Promise<void>
  // Lookups
  fetchLookups: () => Promise<ExportLookups | undefined>
  // Toast
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void
}

export function useBoardHandlers({
  boardId,
  board,
  items,
  columns,
  groups,
  inspectorId,
  createItem,
  updateItem,
  duplicateItems,
  deleteItem,
  createUpdate,
  createGroup,
  updateGroup,
  deleteGroup,
  refetchColumns,
  setSelection,
  setShowAddColumn,
  setShowExportMenu,
  pushAction,
  publishItemChange,
  fetchLookups,
  showToast,
}: UseBoardHandlersParams) {
  const queryClient = useQueryClient()

  // ==================== ITEM HANDLERS ====================

  const handleAddItem = useCallback(async (groupId?: string) => {
    if (!inspectorId) return

    try {
      const newItem = await createItem.mutateAsync({
        board_id: boardId,
        group_id: groupId || groups[0]?.id,
        position: (items?.length || 0) + 1,
        data: {},
        name: 'New Item',
        status: 'default',
        priority: 0,
        created_by: inspectorId,
      })

      if (newItem?.id) {
        publishItemChange('insert', newItem.id, newItem)
      }

      showToast('Item created successfully', 'success')
    } catch (error) {
      console.error('Failed to create item:', error)
      showToast('Failed to create item', 'error')
    }
  }, [boardId, groups, items, inspectorId, createItem, publishItemChange, showToast])

  const handleCellEdit = useCallback(async (rowId: string, columnId: string, value: any) => {
    try {
      const cachedItems = queryClient.getQueryData<BoardItem[]>([
        ...queryKeys.routes.all,
        'board-items',
        boardId,
      ])
      const currentItem = cachedItems?.find(item => item.id === rowId)
      if (!currentItem) return

      const oldValue = columnId === 'name'
        ? currentItem.name
        : currentItem.data?.[columnId]

      if (JSON.stringify(oldValue) === JSON.stringify(value)) return

      const column = columns?.find(c => c.column_id === columnId)
      const fieldName = column?.column_name || columnId

      pushAction({
        type: 'cell_edit',
        description: `Edit ${fieldName}`,
        targetId: rowId,
        targetType: 'item',
        previousValue: oldValue,
        newValue: value,
        metadata: { columnId, columnName: fieldName },
      })

      if (columnId === 'name') {
        await updateItem.mutateAsync({
          itemId: rowId,
          updates: { name: value },
        })
      } else {
        await updateItem.mutateAsync({
          itemId: rowId,
          updates: {
            data: { ...currentItem.data, [columnId]: value },
          },
        })
      }

      publishItemChange('update', rowId, { [columnId]: value })

      if (inspectorId) {
        const updateType = columnId === 'status' ? 'status_changed' : 'updated'
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
          field_name: columnId,
          old_value: formatValue(oldValue),
          new_value: formatValue(value),
          metadata: { displayName: fieldName },
        })
      }
    } catch (error) {
      console.error('Failed to update item:', error)
      showToast('Failed to update item', 'error')
    }
  }, [queryClient, boardId, columns, updateItem, publishItemChange, pushAction, createUpdate, inspectorId, showToast])

  const handleDuplicateSelected = useCallback(async (selection: Set<string>) => {
    if (selection.size === 0) return

    try {
      await duplicateItems.mutateAsync({ itemIds: Array.from(selection) })
      showToast(`Duplicated ${selection.size} item(s)`, 'success')
      setSelection(new Set())
    } catch (error) {
      console.error('Failed to duplicate items:', error)
      showToast('Failed to duplicate items', 'error')
    }
  }, [duplicateItems, showToast, setSelection])

  const handleDeleteSelected = useCallback(async (selection: Set<string>) => {
    if (selection.size === 0) return

    const confirmMessage = selection.size === 1
      ? 'Are you sure you want to delete this item?'
      : `Are you sure you want to delete ${selection.size} items?`

    if (!confirm(confirmMessage)) return

    try {
      const itemIds = Array.from(selection)
      for (const itemId of itemIds) {
        await deleteItem.mutateAsync(itemId)
        publishItemChange('delete', itemId)
      }
      showToast(`Deleted ${selection.size} item(s)`, 'success')
      setSelection(new Set())
    } catch (error) {
      console.error('Failed to delete items:', error)
      showToast('Failed to delete items', 'error')
    }
  }, [deleteItem, publishItemChange, showToast, setSelection])

  // ==================== COLUMN HANDLERS ====================

  const handleUpdateColumn = useCallback(async (columnId: string, updates: Partial<BoardColumn>) => {
    try {
      await boardsService.updateColumn(columnId, updates)
      await refetchColumns()
      showToast('Column updated', 'success')
    } catch (error) {
      console.error('Failed to update column:', error)
      showToast('Failed to update column', 'error')
    }
  }, [refetchColumns, showToast])

  const handleReorderColumns = useCallback(async (reorderedColumns: BoardColumn[]) => {
    try {
      const updates = reorderedColumns.map((col, index) => ({ id: col.id, position: index }))
      await boardsService.updateColumns(updates)
      await refetchColumns()
    } catch (error) {
      console.error('Failed to reorder columns:', error)
      showToast('Failed to reorder columns', 'error')
    }
  }, [refetchColumns, showToast])

  const handleAddColumn = useCallback(async (columnData: { column_name: string; column_type: any; width: number; config?: Record<string, any> }) => {
    if (!board) return

    try {
      const column_id = columnData.column_name.toLowerCase().replace(/\s+/g, '_')

      await boardsService.createColumn({
        board_type: board.board_type,
        board_id: boardId,
        column_id,
        column_name: columnData.column_name,
        column_type: columnData.column_type,
        width: columnData.width,
        position: (columns?.length || 0),
        is_visible: true,
      } as any)
      await refetchColumns()
      showToast('Column added successfully', 'success')
      setShowAddColumn(false)
    } catch (error) {
      console.error('Failed to add column:', error)
      showToast('Failed to add column', 'error')
    }
  }, [board, boardId, columns, refetchColumns, showToast, setShowAddColumn])

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    try {
      const column = columns?.find(col => col.id === columnId)
      const columnKey = column?.column_id

      await boardsService.deleteColumn(columnId)

      if (columnKey && items && items.length > 0) {
        const updatePromises = items
          .filter(item => item.data && columnKey in item.data)
          .map(item => {
            const newData = { ...item.data }
            delete newData[columnKey]
            return updateItem.mutateAsync({ itemId: item.id, updates: { data: newData } })
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
  }, [columns, items, updateItem, refetchColumns, showToast])

  const handleColumnResize = useCallback(async (columnId: string, width: number) => {
    try {
      queryClient.setQueryData(
        ['board-columns', board?.board_type || 'custom', boardId],
        (old: BoardColumn[] | undefined) => {
          if (!old) return old
          return old.map(col => col.id === columnId ? { ...col, width } : col)
        }
      )
      await boardsService.updateColumn(columnId, { width })
    } catch (error) {
      console.error('Failed to resize column:', error)
      await refetchColumns()
    }
  }, [board, boardId, queryClient, refetchColumns])

  const handleQuickAddColumn = useCallback(async (columnType: ColumnType) => {
    if (!board) return

    try {
      const typeLabels: Record<ColumnType, string> = {
        text: 'Text', number: 'Numbers', status: 'Status', date: 'Date',
        date_range: 'Date Range', person: 'Person', location: 'Location',
        actions: 'Actions', route: 'Route', company: 'Company',
        company_address: 'Company Address', service_type: 'Service Type',
        checkbox: 'Checkbox', phone: 'Phone', files: 'Files', updates: 'Updates',
      }

      const baseName = typeLabels[columnType] || 'Column'
      let columnName = baseName
      let counter = 1
      while (columns?.some(col => col.column_name === columnName)) {
        counter++
        columnName = `${baseName} ${counter}`
      }

      const column_id = columnName.toLowerCase().replace(/\s+/g, '_')

      await boardsService.createColumn({
        board_type: board.board_type,
        board_id: boardId,
        column_id,
        column_name: columnName,
        column_type: columnType,
        width: 150,
        position: columns?.length || 0,
        is_visible: true,
      })
      await refetchColumns()
      showToast(`${columnName} column added`, 'success')
    } catch (error) {
      console.error('Failed to add column:', error)
      showToast('Failed to add column', 'error')
    }
  }, [board, boardId, columns, refetchColumns, showToast])

  const handleColumnRename = useCallback(async (columnId: string, newName: string) => {
    try {
      await boardsService.updateColumn(columnId, { column_name: newName })
      await refetchColumns()
      showToast('Column renamed', 'success')
    } catch (error) {
      console.error('Failed to rename column:', error)
      showToast('Failed to rename column', 'error')
    }
  }, [refetchColumns, showToast])

  const handleColumnConfigUpdate = useCallback(async (columnId: string, config: Record<string, any>) => {
    // Optimistic update — apply immediately to cache
    const columnsQueryKey = [...queryKeys.boardColumns.all, 'by-board', boardId]
    const previous = queryClient.getQueryData<BoardColumn[]>(columnsQueryKey)
    if (previous) {
      queryClient.setQueryData(columnsQueryKey, previous.map(col =>
        col.id === columnId ? { ...col, config } : col
      ))
    }

    try {
      await boardsService.updateColumn(columnId, { config })
    } catch (error) {
      // Rollback on failure
      if (previous) queryClient.setQueryData(columnsQueryKey, previous)
      console.error('Failed to update column config:', error)
      showToast('Failed to update column', 'error')
    }
  }, [boardId, queryClient, showToast])

  const handleTableColumnReorder = useCallback(async (columnIds: string[]) => {
    if (!columns || !board) return

    const reorderedColumns = columnIds
      .map(id => columns.find(col => col.id === id))
      .filter((col): col is BoardColumn => col !== undefined)
      .map((col, index) => ({ ...col, position: index }))

    // Must match the query key used in useBoardColumns when boardId is provided
    const columnsQueryKey = [...queryKeys.boardColumns.all, 'by-board', boardId]
    queryClient.setQueryData(columnsQueryKey, reorderedColumns)

    try {
      const updates = reorderedColumns.map((col, index) => ({ id: col.id, position: index }))
      await boardsService.updateColumns(updates)
    } catch (error) {
      console.error('Failed to reorder columns:', error)
      showToast('Failed to reorder columns', 'error')
      await refetchColumns()
    }
  }, [columns, board, boardId, queryClient, refetchColumns, showToast])

  // ==================== GROUP HANDLERS ====================

  const handleAddGroup = useCallback(async () => {
    try {
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
  }, [groups, createGroup, showToast])

  const handleGroupRename = useCallback(async (groupId: string, newName: string) => {
    try {
      await updateGroup.mutateAsync({ groupId, updates: { name: newName } })
      showToast('Group renamed', 'success')
    } catch (error) {
      console.error('Failed to rename group:', error)
      showToast('Failed to rename group', 'error')
    }
  }, [updateGroup, showToast])

  const handleGroupColorChange = useCallback(async (groupId: string, color: string) => {
    try {
      await updateGroup.mutateAsync({ groupId, updates: { color } })
    } catch (error) {
      console.error('Failed to change group color:', error)
      showToast('Failed to change group color', 'error')
    }
  }, [updateGroup, showToast])

  const handleGroupCollapseToggle = useCallback(async (groupId: string, isCollapsed: boolean) => {
    try {
      await updateGroup.mutateAsync({ groupId, updates: { is_collapsed: isCollapsed } })
    } catch (error) {
      console.error('Failed to toggle group collapse:', error)
    }
  }, [updateGroup])

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    if (groups.length <= 1) {
      showToast('Cannot delete the last group', 'error')
      return
    }

    try {
      const itemsInGroup = items?.filter(item => item.data?.group_id === groupId) || []
      const targetGroup = groups.find(g => g.id !== groupId)

      if (itemsInGroup.length > 0 && targetGroup) {
        for (const item of itemsInGroup) {
          await updateItem.mutateAsync({
            itemId: item.id,
            updates: { group_id: targetGroup.id, data: { ...item.data, group_id: targetGroup.id } }
          })
        }
      }

      await deleteGroup.mutateAsync(groupId)
      showToast('Group deleted', 'success')
    } catch (error) {
      console.error('Failed to delete group:', error)
      showToast('Failed to delete group', 'error')
    }
  }, [groups, items, updateItem, deleteGroup, showToast])

  // ==================== MOVEMENT HANDLERS ====================

  const handleItemMove = useCallback(async (itemId: string, targetGroupId: string) => {
    try {
      const currentItem = items?.find(item => item.id === itemId)
      if (!currentItem) return

      const currentGroupId = currentItem.group_id || currentItem.data?.group_id
      if (currentGroupId === targetGroupId) return

      await updateItem.mutateAsync({
        itemId,
        updates: {
          group_id: targetGroupId,
          data: { ...currentItem.data, group_id: targetGroupId },
        },
      })

      publishItemChange('update', itemId, { group_id: targetGroupId })
      showToast('Item moved to group', 'success')
    } catch (error) {
      console.error('Failed to move item:', error)
      showToast('Failed to move item', 'error')
    }
  }, [items, updateItem, publishItemChange, showToast])

  const handleItemReorder = useCallback(async (itemId: string, targetItemId: string, position: 'before' | 'after') => {
    try {
      if (!items) return

      const draggedItem = items.find(item => item.id === itemId)
      const targetItem = items.find(item => item.id === targetItemId)
      if (!draggedItem || !targetItem) return

      const firstGroupId = groups[0]?.id || 'default'
      const targetGroupId = targetItem.group_id || targetItem.data?.group_id || firstGroupId

      const groupItems = items
        .filter(item => (item.group_id || item.data?.group_id || firstGroupId) === targetGroupId)
        .sort((a, b) => (a.position || 0) - (b.position || 0))

      const filteredItems = groupItems.filter(item => item.id !== itemId)
      const targetIndex = filteredItems.findIndex(item => item.id === targetItemId)
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
      filteredItems.splice(insertIndex, 0, draggedItem)

      const reorderUpdates = filteredItems.map((item, index) => ({
        id: item.id,
        position: index,
      }))

      await userBoardsService.reorderItems(reorderUpdates)

      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })

      publishItemChange('update', itemId, { position: insertIndex })
    } catch (error) {
      console.error('Failed to reorder item:', error)
      showToast('Failed to reorder item', 'error')
    }
  }, [items, groups, boardId, queryClient, publishItemChange, showToast])

  // ==================== EXPORT/IMPORT HANDLERS ====================

  const handleExport = useCallback(async (format: 'csv' | 'excel', filteredItems: BoardItem[]) => {
    if (!board || !columns || !filteredItems) return

    try {
      const [exportModule, lookups] = await Promise.all([
        import('../utils/exportBoard'),
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
  }, [board, columns, fetchLookups, showToast, setShowExportMenu])

  const handleImportItems = useCallback(async (
    importedItems: Array<{ name: string; data: Record<string, any>; group_id: string }>
  ) => {
    if (!inspectorId) {
      showToast('You must be logged in to import items', 'error')
      return
    }

    try {
      for (const item of importedItems) {
        await createItem.mutateAsync({
          board_id: boardId,
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
      throw error
    }
  }, [boardId, items, inspectorId, createItem, showToast])

  return {
    // Item
    handleAddItem,
    handleCellEdit,
    handleDuplicateSelected,
    handleDeleteSelected,
    // Column
    handleUpdateColumn,
    handleReorderColumns,
    handleAddColumn,
    handleDeleteColumn,
    handleColumnResize,
    handleQuickAddColumn,
    handleColumnRename,
    handleColumnConfigUpdate,
    handleTableColumnReorder,
    // Group
    handleAddGroup,
    handleGroupRename,
    handleGroupColorChange,
    handleGroupCollapseToggle,
    handleDeleteGroup,
    // Movement
    handleItemMove,
    handleItemReorder,
    // Export/Import
    handleExport,
    handleImportItems,
  }
}
