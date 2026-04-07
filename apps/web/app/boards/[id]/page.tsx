'use client'

import { useState, useCallback } from 'react'
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
import { useBoardModals } from '@/features/boards/hooks/useBoardModals'
import { useBoardViewTabState } from '@/features/boards/hooks/useBoardViewTabState'
import { useBoardSubitemsState } from '@/features/boards/hooks/useBoardSubitemsState'
import { VirtualizedBoardTable, ErrorBoundary, BoardToolbar } from '@/features/boards/components'
import { BoardPageSkeleton } from '@/features/boards/components/BoardPageSkeleton'
import { BoardPageHeader } from '@/features/boards/components/BoardPageHeader'
import { ViewTabBar } from '@/features/boards/components/ViewTabBar'
import type { BoardItem } from '@/features/boards/types/board'
import { Button } from '@/shared/components/ui'
import { useToast } from '@/components/ui-monday/Toast'
import {
  ArrowLeft,
  Search,
  Download,
  Upload,
  Copy,
  Trash2,
  ArrowRightLeft,
  FileText,
} from 'lucide-react'

// Lazy-load heavy components that aren't needed on initial render
const ColumnConfigPanel = dynamic(
  () =>
    import('@/features/boards/components/ColumnConfig/ColumnConfigPanel').then(m => ({
      default: m.ColumnConfigPanel,
    })),
  { ssr: false }
)
const AddColumnModal = dynamic(
  () =>
    import('@/features/boards/components/ColumnConfig/AddColumnModal').then(m => ({
      default: m.AddColumnModal,
    })),
  { ssr: false }
)
const ItemDetailDrawer = dynamic(
  () =>
    import('@/features/boards/components/ItemDetail/ItemDetailDrawer').then(m => ({
      default: m.ItemDetailDrawer,
    })),
  { ssr: false }
)
const ImportBoardModal = dynamic(
  () =>
    import('@/features/boards/components/ImportBoardModal').then(m => ({
      default: m.ImportBoardModal,
    })),
  { ssr: false }
)
const SaveAsTemplateModal = dynamic(
  () =>
    import('@/features/boards/components/SaveAsTemplateModal').then(m => ({
      default: m.SaveAsTemplateModal,
    })),
  { ssr: false }
)
const ActivityLogPanel = dynamic(
  () =>
    import('@/features/boards/components/ActivityLog').then(m => ({ default: m.ActivityLogPanel })),
  { ssr: false }
)
const BoardAccessModal = dynamic(
  () =>
    import('@/features/boards/components/BoardAccessModal').then(m => ({
      default: m.BoardAccessModal,
    })),
  { ssr: false }
)
const MoveItemModal = dynamic(
  () =>
    import('@/features/boards/components/MoveItemModal').then(m => ({ default: m.MoveItemModal })),
  { ssr: false }
)
const GenerateDocumentModal = dynamic(
  () =>
    import('@/features/documents/components/GenerateDocumentModal').then(m => ({
      default: m.GenerateDocumentModal,
    })),
  { ssr: false }
)
const TemplateManagementModal = dynamic(
  () =>
    import('@/features/documents/components/TemplateManagementModal').then(m => ({
      default: m.TemplateManagementModal,
    })),
  { ssr: false }
)

export default function BoardDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // ─── Modals ───
  const { modals, openModal, closeModal, toggleModal } = useBoardModals()

  // ─── View tabs & toolbar state ───
  const viewTabState = useBoardViewTabState(params.id)

  // ─── UI state (page-local) ───
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // ─── Data ───
  const data = useBoardPageData(params.id)
  const {
    user,
    inspectorId,
    board,
    items,
    columns,
    groups,
    boardLoading,
    itemsLoading,
    itemsError,
    groupsLoading,
    createItem,
    updateItem,
    duplicateItems,
    deleteItem,
    createUpdate,
    createGroup,
    updateGroup,
    deleteGroup,
    refetchColumns,
    selectedItem,
    setSelectedItem,
    fetchLookups,
  } = data

  // ─── Activity log (deferred fetch) ───
  const {
    data: activityUpdates,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useBoardUpdates(modals.activityLog ? params.id : '')

  // ─── Undo/redo ───
  const {
    canUndo,
    canRedo,
    pushAction,
    undo: performUndo,
    redo: performRedo,
  } = useBoardUndoRedo({
    items,
    updateItem,
    updateGroup,
    showToast,
  })

  // ─── Real-time collaboration ───
  const { presence, isConnected, setEditing, publishItemChange } = useRealtimeBoard({
    boardId: params.id,
    boardType: board?.board_type || 'custom',
    userId: inspectorId || undefined,
    userName: user?.email?.split('@')[0] || 'User',
    enabled: !!board && !!inspectorId,
  })

  // ─── Filtered/sorted items ───
  const filteredItems = useFilteredItems(
    items,
    searchQuery,
    viewTabState.filters,
    viewTabState.sortConfig
  )

  // ─── Dynamic grouping ───
  const { groups: effectiveGroups, items: groupedItems } = useGroupByColumn(
    viewTabState.groupByColumn,
    groups,
    filteredItems,
    columns
  )

  // ─── Subitems ───
  const subitems = useBoardSubitemsState(params.id, items, inspectorId)

  // ─── All event handlers ───
  const handlers = useBoardHandlers({
    boardId: params.id,
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
    setShowAddColumn: (show: boolean) => (show ? openModal('addColumn') : closeModal('addColumn')),
    setShowExportMenu: (show: boolean) =>
      show ? openModal('exportMenu') : closeModal('exportMenu'),
    pushAction,
    publishItemChange,
    fetchLookups,
    showToast,
  })

  // ─── Activity rollback handler ───
  const handleActivityRollback = useCallback(
    async (update: any) => {
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
        try {
          oldValue = JSON.parse(update.old_value)
        } catch {
          /* keep as string */
        }

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
    },
    [items, updateItem, queryClient, params.id, refetchActivity, showToast]
  )

  // ─── Loading state ───
  if (boardLoading || itemsLoading) {
    return <BoardPageSkeleton />
  }

  // ─── Not found ───
  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-h3 font-semibold text-text-primary mb-2">Board not found</h2>
        <p className="text-text-secondary mb-6">
          The board you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
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
        board={{
          name: board.name,
          description: board.description ?? undefined,
          color: board.color ?? undefined,
        }}
        presence={presence}
        isConnected={isConnected}
        onShowActivityLog={() => openModal('activityLog')}
        onShowSaveAsTemplate={() => openModal('saveAsTemplate')}
        onShowAccessModal={() => openModal('accessModal')}
        onShowColumnConfig={() => openModal('columnConfig')}
        onShowDocTemplates={() => openModal('docTemplates')}
      />

      {/* View Tabs */}
      {viewTabState.viewTabs && (
        <ViewTabBar
          tabs={viewTabState.viewTabs}
          activeTabId={viewTabState.activeTabId}
          onTabChange={viewTabState.onTabChange}
          onCreateTab={viewTabState.onCreateTab}
          onDeleteTab={viewTabState.onDeleteTab}
          onRenameTab={viewTabState.onRenameTab}
          onDuplicateTab={viewTabState.onDuplicateTab}
        />
      )}

      {/* Fixed Toolbar */}
      <div className="flex-shrink-0 bg-bg-primary border-b border-border-light px-4 md:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            {selection.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary font-medium">
                  {selection.size} selected
                </span>
                <Button variant="secondary" size="sm" onClick={() => openModal('generateDoc')}>
                  <FileText className="w-4 h-4 mr-1" />
                  Generate Doc
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openModal('moveModal')}>
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
            ) : (
              columns &&
              columns.length > 0 && (
                <BoardToolbar
                  columns={columns}
                  sortConfig={viewTabState.sortConfig}
                  onSortChange={viewTabState.onSortChange}
                  groupByColumn={viewTabState.groupByColumn}
                  onGroupByChange={viewTabState.onGroupByChange}
                  filters={viewTabState.filters}
                  onFiltersChange={viewTabState.onFiltersChange}
                />
              )
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => openModal('importModal')}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>

            {/* Export Button */}
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => toggleModal('exportMenu')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {modals.exportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => closeModal('exportMenu')} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-bg-primary rounded-lg shadow-lg border border-border-light z-50 py-1">
                    <button
                      onClick={() => handlers.handleExport('csv', filteredItems)}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-bg-hover flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-color-success" />
                      Export to CSV
                    </button>
                    <button
                      onClick={() => handlers.handleExport('excel', filteredItems)}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-bg-hover flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-monday-primary" />
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
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-border-light rounded-md bg-bg-primary focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent w-48"
              />
            </div>
            <span className="text-sm text-text-secondary">{filteredItems?.length || 0} items</span>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-6 py-4">
        {itemsError ? (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-primary rounded-lg border border-border-light">
            <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-50">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Failed to load items</h3>
            <p className="text-sm text-text-secondary mb-4">
              There was an error loading the board items
            </p>
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
              onColumnReorder={cols => handlers.handleTableColumnReorder(cols.map(c => c.id))}
              onQuickAddColumn={handlers.handleQuickAddColumn}
              onOpenAddColumnModal={() => openModal('addColumn')}
              onColumnRename={handlers.handleColumnRename}
              onColumnConfigUpdate={handlers.handleColumnConfigUpdate}
              onDeleteColumn={handlers.handleDeleteColumn}
              onItemMove={handlers.handleItemMove}
              onItemReorder={handlers.handleItemReorder}
              presence={presence}
              onCellEditStart={(itemId, columnId) => setEditing(itemId, columnId)}
              onCellEditEnd={() => setEditing(null)}
              sortConfig={viewTabState.sortConfig}
              onSortChange={viewTabState.onSortChange}
              expandedItems={subitems.expandedItems}
              subitemCounts={subitems.subitemCounts}
              subitemsByParent={subitems.subitemsByParent}
              subitemColumns={subitems.subitemColumns}
              onToggleExpandItem={subitems.onToggleExpandItem}
              onSubitemCellEdit={subitems.onSubitemCellEdit}
              onAddSubitem={subitems.onAddSubitem}
              onDeleteSubitem={subitems.onDeleteSubitem}
            />
          </ErrorBoundary>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-primary rounded-lg border border-border-light">
            <p className="text-text-secondary mb-4">No columns configured for this board yet</p>
            <Button variant="secondary" onClick={() => openModal('addColumn')}>
              Configure Columns
            </Button>
          </div>
        )}
      </div>

      {/* Modals & Panels */}
      {modals.columnConfig && columns && (
        <ColumnConfigPanel
          columns={columns}
          onClose={() => closeModal('columnConfig')}
          onUpdateColumn={handlers.handleUpdateColumn}
          onReorderColumns={handlers.handleReorderColumns}
          onAddColumn={() => {
            closeModal('columnConfig')
            openModal('addColumn')
          }}
          onDeleteColumn={handlers.handleDeleteColumn}
        />
      )}

      {modals.addColumn && (
        <AddColumnModal
          onClose={() => closeModal('addColumn')}
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

      {modals.importModal && columns && (
        <ImportBoardModal
          columns={columns}
          onImport={handlers.handleImportItems}
          onClose={() => closeModal('importModal')}
          defaultGroupId={groups[0]?.id || 'default'}
        />
      )}

      {modals.saveAsTemplate && board && (
        <SaveAsTemplateModal
          isOpen={modals.saveAsTemplate}
          onClose={() => closeModal('saveAsTemplate')}
          boardId={params.id}
          boardName={board.name}
          onSuccess={() => showToast('Board saved as template', 'success')}
        />
      )}

      {modals.accessModal && board && (
        <BoardAccessModal
          isOpen={modals.accessModal}
          onClose={() => closeModal('accessModal')}
          boardId={params.id}
          boardName={board.name}
          ownerId={board.owner_id}
          workspaceId={board.workspace_id ?? undefined}
        />
      )}

      <ActivityLogPanel
        isOpen={modals.activityLog}
        onClose={() => closeModal('activityLog')}
        updates={(activityUpdates || []) as any}
        isLoading={activityLoading}
        onRefresh={() => refetchActivity()}
        showRollback={true}
        onRollback={handleActivityRollback}
      />

      {modals.generateDoc && selection.size > 0 && items && (
        <GenerateDocumentModal
          isOpen={modals.generateDoc}
          onClose={() => closeModal('generateDoc')}
          boardId={params.id}
          items={items.filter(item => selection.has(item.id))}
          onSuccess={() => showToast('Document generated successfully', 'success')}
        />
      )}

      {modals.docTemplates && board && columns && (
        <TemplateManagementModal
          isOpen={modals.docTemplates}
          onClose={() => closeModal('docTemplates')}
          boardId={params.id}
          workspaceId={board.workspace_id ?? undefined}
          columns={columns.map(c => ({
            column_id: c.column_id,
            column_name: c.column_name,
            column_type: c.column_type,
          }))}
        />
      )}

      {modals.moveModal && selection.size > 0 && (
        <MoveItemModal
          isOpen={modals.moveModal}
          onClose={() => closeModal('moveModal')}
          itemIds={Array.from(selection)}
          sourceBoardId={params.id}
          onMoveComplete={(movedCount, failedCount) => {
            if (movedCount > 0) {
              showToast(
                `Moved ${movedCount} item(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
                failedCount > 0 ? 'warning' : 'success'
              )
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
