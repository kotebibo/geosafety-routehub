'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useBoard, useBoardItems, useBoardColumns, useCreateBoardItem, useUpdateBoardItem, useDuplicateBoardItems, useDeleteBoardItem, useCreateUpdate, useRealtimeBoard } from '@/features/boards/hooks'
import { useInspectorId } from '@/hooks/useInspectorId'
import { MondayBoardTable, ErrorBoundary, ColumnConfigPanel, AddColumnModal, ItemDetailDrawer, BoardPresenceIndicator } from '@/features/boards/components'
import { Button } from '@/shared/components/ui'
import { useToast } from '@/components/ui-monday/Toast'
import { ArrowLeft, Plus, Users, Settings, MoreHorizontal, Columns, Search, Download, Copy, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BoardItem, BoardColumn, BoardGroup, ColumnType } from '@/features/boards/types/board'
import { boardsService } from '@/features/boards/services'
import { exportToCSV, exportToExcel } from '@/features/boards/utils/exportBoard'

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

// Initial groups - will be managed in state (later from DB after migration)
const INITIAL_GROUPS: BoardGroup[] = [
  { id: 'default', board_id: '', name: 'New', color: '#579bfc', position: 0 },
  { id: 'in-progress', board_id: '', name: 'In Progress', color: '#fdab3d', position: 1 },
  { id: 'done', board_id: '', name: 'Done', color: '#00c875', position: 2 },
]

export default function BoardDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [selectedItem, setSelectedItem] = useState<BoardItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [groups, setGroups] = useState<BoardGroup[]>(INITIAL_GROUPS)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const { data: inspectorId } = useInspectorId(user?.email)

  const { data: board, isLoading: boardLoading, error: boardError } = useBoard(params.id)
  const { data: items, isLoading: itemsLoading, error: itemsError } = useBoardItems(params.id)
  const { data: columns, refetch: refetchColumns } = useBoardColumns(board?.board_type || 'custom', params.id)

  const createItem = useCreateBoardItem(params.id)
  const updateItem = useUpdateBoardItem(params.id)
  const duplicateItems = useDuplicateBoardItems(params.id)
  const deleteItem = useDeleteBoardItem(params.id)
  const createUpdate = useCreateUpdate()

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

  // Filter items based on search
  const filteredItems = items?.filter(item => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      Object.values(item.data || {}).some(val =>
        String(val).toLowerCase().includes(searchLower)
      )
    )
  })


  const handleAddItem = async (groupId?: string) => {
    if (!user || !inspectorId) return

    try {
      // Store group_id in data JSONB until migration 016 is run
      // After migration, we can use the proper group_id column
      const newItem = await createItem.mutateAsync({
        board_id: params.id,
        position: (items?.length || 0) + 1,
        data: {
          group_id: groupId || 'default',
        },
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

  const handleCellEdit = async (rowId: string, columnId: string, value: any) => {
    try {
      // Get the current item to merge with existing data
      const currentItem = items?.find(item => item.id === rowId)
      if (!currentItem) return

      // Get old value for activity logging
      const oldValue = columnId === 'name'
        ? currentItem.name
        : currentItem.data?.[columnId]

      // Skip if value hasn't actually changed
      if (JSON.stringify(oldValue) === JSON.stringify(value)) return

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
        const column = columns?.find(c => c.column_id === columnId)
        const fieldName = column?.column_name || columnId

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
          field_name: fieldName,
          old_value: formatValue(oldValue),
          new_value: formatValue(value),
        })
      }
    } catch (error) {
      console.error('Failed to update item:', error)
      showToast('Failed to update item', 'error')
    }
  }

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

  const handleAddColumn = async (columnData: { column_name: string; column_type: any; width: number }) => {
    try {
      if (!board) return

      const column_id = columnData.column_name.toLowerCase().replace(/\s+/g, '_')

      // Create column data - only include board_id if the column exists in the schema
      const columnPayload: any = {
        board_type: board.board_type,
        column_id,
        column_name: columnData.column_name,
        column_type: columnData.column_type,
        width: columnData.width,
        position: (columns?.length || 0),
        is_visible: true,
      }

      // Check if we have existing columns with board_id field
      if (columns && columns.length > 0 && 'board_id' in columns[0]) {
        columnPayload.board_id = params.id
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
      await boardsService.deleteColumn(columnId)
      await refetchColumns()
      showToast('Column deleted', 'success')
    } catch (error) {
      console.error('Failed to delete column:', error)
      showToast('Failed to delete column', 'error')
    }
  }

  const handleColumnResize = async (columnId: string, width: number) => {
    try {
      await boardsService.updateColumn(columnId, { width })
      // Don't refetch immediately to avoid UI flicker - the local state in MondayBoardTable handles it
    } catch (error) {
      console.error('Failed to resize column:', error)
      // Silently fail - the column will reset on next page load
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
        person: 'Person',
        location: 'Location',
        actions: 'Actions',
        route: 'Route',
        company: 'Company',
        service_type: 'Service Type',
        checkbox: 'Checkbox',
        phone: 'Phone',
        files: 'Files',
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

      const columnPayload: any = {
        board_type: board.board_type,
        column_id,
        column_name: columnName,
        column_type: columnType,
        width: 150,
        position: columns?.length || 0,
        is_visible: true,
      }

      // Check if we have existing columns with board_id field
      if (columns && columns.length > 0 && 'board_id' in columns[0]) {
        columnPayload.board_id = params.id
      }

      await boardsService.createColumn(columnPayload)
      await refetchColumns()
      showToast(`${columnName} column added`, 'success')
    } catch (error) {
      console.error('Failed to add column:', error)
      showToast('Failed to add column', 'error')
    }
  }

  const handleAddGroup = () => {
    // Generate a unique ID for the new group
    const newId = `group-${Date.now()}`
    // Pick a color that's not already in use (or cycle through)
    const usedColors = groups.map(g => g.color)
    const availableColor = GROUP_COLORS.find(c => !usedColors.includes(c)) || GROUP_COLORS[groups.length % GROUP_COLORS.length]

    const newGroup: BoardGroup = {
      id: newId,
      board_id: params.id,
      name: 'New Group',
      color: availableColor,
      position: groups.length,
    }

    setGroups([...groups, newGroup])
    showToast('Group added - click the name to rename it', 'success')
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

  // Handle export
  const handleExport = (format: 'csv' | 'excel') => {
    if (!board || !columns || !filteredItems) return

    try {
      const options = {
        format,
        items: filteredItems,
        columns: columns.filter(col => col.is_visible),
        boardName: board.name,
      }

      if (format === 'csv') {
        exportToCSV(options)
      } else {
        exportToExcel(options)
      }

      showToast(`Exported to ${format.toUpperCase()}`, 'success')
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export failed:', error)
      showToast('Export failed', 'error')
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

              <Button variant="secondary" size="sm" onClick={() => setShowColumnConfig(true)}>
                <Columns className="w-4 h-4 mr-2" />
                Columns
              </Button>
              <Button variant="secondary" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="secondary" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <button className="p-2 rounded-md hover:bg-bg-hover transition-colors">
                <MoreHorizontal className="w-5 h-5 text-text-secondary" />
              </button>
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
            <Button variant="primary" onClick={() => handleAddItem()} disabled={createItem.isPending || !inspectorId}>
              <Plus className="w-5 h-5 mr-2" />
              {createItem.isPending ? 'Adding...' : 'New Item'}
            </Button>

            {selection.size > 0 && (
              <div className="flex items-center gap-2 pl-3 ml-3 border-l border-border-light">
                <span className="text-sm text-text-secondary font-medium">
                  {selection.size} selected
                </span>
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
            )}
          </div>

          <div className="flex items-center gap-3">
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

      {/* Scrollable Table Area - ONLY this scrolls */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
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
            <MondayBoardTable
              boardType={board.board_type}
              columns={columns.filter(col => col.is_visible)}
              data={filteredItems || []}
              groups={groups}
              onCellEdit={handleCellEdit}
              onRowClick={handleRowClick}
              selection={selection}
              onSelectionChange={setSelection}
              onAddItem={handleAddItem}
              onAddGroup={handleAddGroup}
              onColumnResize={handleColumnResize}
              onQuickAddColumn={handleQuickAddColumn}
              onOpenAddColumnModal={() => setShowAddColumn(true)}
              onColumnRename={handleColumnRename}
              isLoading={itemsLoading}
              presence={presence}
              onCellEditStart={(itemId, columnId) => setEditing(itemId, columnId)}
              onCellEditEnd={() => setEditing(null)}
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
    </div>
  )
}
