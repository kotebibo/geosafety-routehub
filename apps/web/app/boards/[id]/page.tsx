'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { useRealtimeBoard } from '@/features/boards/hooks'
import { useBoardUpdates } from '@/features/boards/hooks'
import { useBoardPageData } from '@/features/boards/hooks/useBoardPageData'
import { useBoardHandlers } from '@/features/boards/hooks/useBoardHandlers'
import { useBoardUndoRedo } from '@/features/boards/hooks/useBoardUndoRedo'
import { useFilteredItems } from '@/features/boards/hooks/useFilteredItems'
import { useGroupByColumn } from '@/features/boards/hooks/useGroupByColumn'
import { VirtualizedBoardTable, ErrorBoundary, BoardToolbar, type SortConfig, type FilterConfig } from '@/features/boards/components'
import { BoardPageSkeleton } from '@/features/boards/components/BoardPageSkeleton'
import { BoardPageHeader } from '@/features/boards/components/BoardPageHeader'
import { Button } from '@/shared/components/ui'
import { useToast } from '@/components/ui-monday/Toast'
import { ArrowLeft, Search, Download, Upload, Copy, Trash2, ArrowRightLeft } from 'lucide-react'
import type { BoardItem } from '@/features/boards/types/board'

// Lazy-load heavy components that aren't needed on initial render
const ColumnConfigPanel = dynamic(() => import('@/features/boards/components/ColumnConfig/ColumnConfigPanel').then(m => ({ default: m.ColumnConfigPanel })), { ssr: false })
const AddColumnModal = dynamic(() => import('@/features/boards/components/ColumnConfig/AddColumnModal').then(m => ({ default: m.AddColumnModal })), { ssr: false })
const ItemDetailDrawer = dynamic(() => import('@/features/boards/components/ItemDetail/ItemDetailDrawer').then(m => ({ default: m.ItemDetailDrawer })), { ssr: false })
const ImportBoardModal = dynamic(() => import('@/features/boards/components/ImportBoardModal').then(m => ({ default: m.ImportBoardModal })), { ssr: false })
const SaveAsTemplateModal = dynamic(() => import('@/features/boards/components/SaveAsTemplateModal').then(m => ({ default: m.SaveAsTemplateModal })), { ssr: false })
const ActivityLogPanel = dynamic(() => import('@/features/boards/components/ActivityLog').then(m => ({ default: m.ActivityLogPanel })), { ssr: false })
const BoardAccessModal = dynamic(() => import('@/features/boards/components/BoardAccessModal').then(m => ({ default: m.BoardAccessModal })), { ssr: false })
const MoveItemModal = dynamic(() => import('@/features/boards/components/MoveItemModal').then(m => ({ default: m.MoveItemModal })), { ssr: false })

export default function BoardDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // UI state
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)
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

  // Data
  const data = useBoardPageData(params.id)
  const {
    user, inspectorId, board, items, columns, groups,
    boardLoading, itemsLoading, itemsError, groupsLoading,
    createItem, updateItem, duplicateItems, deleteItem, createUpdate,
    createGroup, updateGroup, deleteGroup,
    refetchColumns, selectedItem, setSelectedItem, fetchLookups,
  } = data

  // Activity log (deferred fetch)
  const { data: activityUpdates, isLoading: activityLoading, refetch: refetchActivity } = useBoardUpdates(showActivityLog ? params.id : '')

  // Undo/redo
  const { canUndo, canRedo, pushAction, undo: performUndo, redo: performRedo } = useBoardUndoRedo({
    items,
    updateItem,
    updateGroup,
    showToast,
  })

  // Real-time collaboration
  const {
    presence, isConnected, setEditing, publishItemChange,
  } = useRealtimeBoard({
    boardId: params.id,
    boardType: board?.board_type || 'custom',
    userId: inspectorId || undefined,
    userName: user?.email?.split('@')[0] || 'User',
    enabled: !!board && !!inspectorId,
  })

  // Filtered/sorted items
  const filteredItems = useFilteredItems(items, searchQuery, filters, sortConfig)

  // Dynamic grouping by column (when toolbar "Group by" is active)
  const { groups: effectiveGroups, items: groupedItems } = useGroupByColumn(
    groupByColumn,
    groups,
    filteredItems,
    columns,
  )

  // All event handlers
  const handlers = useBoardHandlers({
    boardId: params.id,
    board,
    items,
    columns,
    groups,
    inspectorId,
    createItem, updateItem, duplicateItems, deleteItem, createUpdate,
    createGroup, updateGroup, deleteGroup,
    refetchColumns,
    setSelection,
    setShowAddColumn,
    setShowExportMenu,
    pushAction,
    publishItemChange,
    fetchLookups,
    showToast,
  })

  // Loading state
  if (boardLoading || itemsLoading) {
    return <BoardPageSkeleton />
  }

  // Not found
  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-h3 font-semibold text-text-primary mb-2">Board not found</h2>
        <p className="text-text-secondary mb-6">The board you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Button variant="primary" onClick={() => router.push('/boards')}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Boards
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-secondary">
      {/* Fixed Header */}
      <BoardPageHeader
        board={board}
        presence={presence}
        isConnected={isConnected}
        onShowActivityLog={() => setShowActivityLog(true)}
        onShowSaveAsTemplate={() => setShowSaveAsTemplate(true)}
        onShowAccessModal={() => setShowAccessModal(true)}
        onShowColumnConfig={() => setShowColumnConfig(true)}
      />

      {/* Fixed Toolbar */}
      <div className="flex-shrink-0 bg-bg-primary border-b border-border-light px-4 md:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            {selection.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary font-medium">
                  {selection.size} selected
                </span>
                <Button variant="secondary" size="sm" onClick={() => setShowMoveModal(true)}>
                  <ArrowRightLeft className="w-4 h-4 mr-1" />
                  Move
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlers.handleDuplicateSelected(selection)}
                  disabled={duplicateItems.isPending}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {duplicateItems.isPending ? 'Duplicating...' : 'Duplicate'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlers.handleDeleteSelected(selection)}
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
            <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>

            {/* Export Button */}
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setShowExportMenu(!showExportMenu)}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-border-light z-50 py-1">
                    <button
                      onClick={() => handlers.handleExport('csv', filteredItems)}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-bg-hover flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-[#00c875]" />
                      Export to CSV
                    </button>
                    <button
                      onClick={() => handlers.handleExport('excel', filteredItems)}
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

      {/* Scrollable Table Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
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
              data={groupedItems || []}
              groups={effectiveGroups}
              isLoading={itemsLoading || groupsLoading}
              onRowClick={(row: BoardItem) => setSelectedItem(row)}
              onCellEdit={handlers.handleCellEdit}
              selection={selection}
              onSelectionChange={setSelection}
              onAddItem={handlers.handleAddItem}
              onAddGroup={handlers.handleAddGroup}
              onGroupRename={handlers.handleGroupRename}
              onGroupColorChange={handlers.handleGroupColorChange}
              onGroupCollapseToggle={handlers.handleGroupCollapseToggle}
              onDeleteGroup={handlers.handleDeleteGroup}
              onColumnResize={handlers.handleColumnResize}
              onColumnReorder={(cols) => handlers.handleTableColumnReorder(cols.map(c => c.id))}
              onQuickAddColumn={handlers.handleQuickAddColumn}
              onOpenAddColumnModal={() => setShowAddColumn(true)}
              onColumnRename={handlers.handleColumnRename}
              onColumnConfigUpdate={handlers.handleColumnConfigUpdate}
              onDeleteColumn={handlers.handleDeleteColumn}
              onItemMove={handlers.handleItemMove}
              onItemReorder={handlers.handleItemReorder}
              presence={presence}
              onCellEditStart={(itemId, columnId) => setEditing(itemId, columnId)}
              onCellEditEnd={() => setEditing(null)}
              sortConfig={sortConfig}
              onSortChange={setSortConfig}
            />
          </ErrorBoundary>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-primary rounded-lg border border-border-light">
            <p className="text-text-secondary mb-4">No columns configured for this board yet</p>
            <Button variant="secondary" onClick={() => setShowAddColumn(true)}>
              Configure Columns
            </Button>
          </div>
        )}
      </div>

      {/* Modals & Panels */}
      {showColumnConfig && columns && (
        <ColumnConfigPanel
          columns={columns}
          onClose={() => setShowColumnConfig(false)}
          onUpdateColumn={handlers.handleUpdateColumn}
          onReorderColumns={handlers.handleReorderColumns}
          onAddColumn={() => { setShowColumnConfig(false); setShowAddColumn(true) }}
          onDeleteColumn={handlers.handleDeleteColumn}
        />
      )}

      {showAddColumn && (
        <AddColumnModal
          onClose={() => setShowAddColumn(false)}
          onAdd={handlers.handleAddColumn}
          existingColumns={columns || []}
        />
      )}

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

      {showImportModal && columns && (
        <ImportBoardModal
          columns={columns}
          onImport={handlers.handleImportItems}
          onClose={() => setShowImportModal(false)}
          defaultGroupId={groups[0]?.id || 'default'}
        />
      )}

      {showSaveAsTemplate && board && (
        <SaveAsTemplateModal
          isOpen={showSaveAsTemplate}
          onClose={() => setShowSaveAsTemplate(false)}
          boardId={params.id}
          boardName={board.name}
          onSuccess={() => showToast('Board saved as template', 'success')}
        />
      )}

      {showAccessModal && board && (
        <BoardAccessModal
          isOpen={showAccessModal}
          onClose={() => setShowAccessModal(false)}
          boardId={params.id}
          boardName={board.name}
          ownerId={board.owner_id}
        />
      )}

      <ActivityLogPanel
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        updates={activityUpdates || []}
        isLoading={activityLoading}
        onRefresh={() => refetchActivity()}
        showRollback={true}
        onRollback={async (update) => {
          if (!update.field_name) {
            showToast('Cannot rollback: no field name', 'error')
            return
          }
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

            let oldValue: any = update.old_value
            try { oldValue = JSON.parse(update.old_value) } catch { /* keep as string */ }

            if (update.field_name === 'name') {
              await updateItem.mutateAsync({ itemId: update.item_id, updates: { name: oldValue } })
            } else {
              await updateItem.mutateAsync({
                itemId: update.item_id,
                updates: { data: { ...item.data, [update.field_name]: oldValue } },
              })
            }

            showToast('Change rolled back successfully', 'success')
            await queryClient.refetchQueries({
              queryKey: [...queryKeys.routes.all, 'board-items', params.id],
              type: 'active',
            })
            refetchActivity()
          } catch (error) {
            console.error('Failed to rollback:', error)
            showToast('Failed to rollback change', 'error')
          }
        }}
      />

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
