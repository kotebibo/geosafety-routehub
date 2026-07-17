'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { CheckinSummaryProvider } from '@/features/boards/contexts/CheckinSummaryContext'
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
  FolderInput,
  FileText,
  Undo2,
  Redo2,
  MoreHorizontal,
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
const MoveToGroupModal = dynamic(
  () =>
    import('@/features/boards/components/MoveToGroupModal').then(m => ({
      default: m.MoveToGroupModal,
    })),
  { ssr: false }
)
const UpdatesPanel = dynamic(
  () =>
    import('@/features/boards/components/BoardTable/cells/UpdatesPanel').then(m => ({
      default: m.UpdatesPanel,
    })),
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
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // ─── Modals ───
  const { modals, openModal, closeModal, toggleModal } = useBoardModals()

  // ─── View tabs & toolbar state ───
  const viewTabState = useBoardViewTabState(params.id)

  // ─── UI state (page-local) ───
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileToolbarOpen, setMobileToolbarOpen] = useState(false)
  const toolbarMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileToolbarOpen) return
    const handleClick = (e: MouseEvent) => {
      if (toolbarMenuRef.current && !toolbarMenuRef.current.contains(e.target as Node)) {
        setMobileToolbarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileToolbarOpen])

  // ─── Data ───
  const data = useBoardPageData(params.id)
  const {
    user,
    userId,
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
    commentCounts,
  } = data

  // ─── Deep-link: open item from URL ?item=...&tab=... or ?updates=... ───
  const [initialTab, setInitialTab] = useState<string | null>(null)
  const [updatesItem, setUpdatesItem] = useState<BoardItem | null>(null)
  const deepLinkHandled = useRef(false)

  useEffect(() => {
    if (deepLinkHandled.current || !items || items.length === 0) return

    const updatesItemId = searchParams.get('updates')
    if (updatesItemId) {
      const found = items.find(i => i.id === updatesItemId)
      if (found) {
        setUpdatesItem(found)
        deepLinkHandled.current = true
        window.history.replaceState(null, '', `/boards/${params.id}`)
      }
      return
    }

    const itemId = searchParams.get('item')
    const tab = searchParams.get('tab')
    if (!itemId) return

    const found = items.find(i => i.id === itemId)
    if (found) {
      setSelectedItem(found)
      if (tab) setInitialTab(tab)
      deepLinkHandled.current = true
      window.history.replaceState(null, '', `/boards/${params.id}`)
    }
  }, [items, searchParams, setSelectedItem, params.id])

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
    userId: userId || undefined,
    userName: user?.email?.split('@')[0] || 'User',
    enabled: !!board && !!userId,
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
  const subitems = useBoardSubitemsState(params.id, items, userId)

  // ─── All event handlers ───
  const handlers = useBoardHandlers({
    boardId: params.id,
    board,
    items,
    columns,
    groups,
    userId,
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
        showToast(t('boards.detail.rollback.noFieldName'), 'error')
        return
      }
      if (update.old_value === undefined || update.old_value === null) {
        showToast(t('boards.detail.rollback.noPreviousValue'), 'error')
        return
      }

      try {
        const item = items?.find(i => i.id === update.item_id)
        if (!item) {
          showToast(t('boards.detail.rollback.itemNotFound'), 'error')
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

        showToast(t('boards.detail.rollback.success'), 'success')
        await queryClient.refetchQueries({
          queryKey: [...queryKeys.routes.all, 'board-items', params.id],
          type: 'active',
        })
        refetchActivity()
      } catch (error) {
        console.error('Failed to rollback:', error)
        showToast(t('boards.detail.rollback.failed'), 'error')
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
        <h2 className="text-h3 font-semibold text-text-primary mb-2">
          {t('boards.detail.notFoundTitle')}
        </h2>
        <p className="text-text-secondary mb-6">{t('boards.detail.notFoundDescription')}</p>
        <Button variant="primary" onClick={() => router.push('/boards')}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('boards.detail.backToBoards')}
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
                  {t('boards.detail.toolbar.selected', { count: selection.size })}
                </span>
                <Button variant="secondary" size="sm" onClick={() => openModal('generateDoc')}>
                  <FileText className="w-4 h-4 mr-1" />
                  {t('boards.detail.toolbar.generateDoc')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openModal('moveModal')}>
                  <ArrowRightLeft className="w-4 h-4 mr-1" />
                  {t('boards.detail.toolbar.move')}
                </Button>
                {groups && groups.length > 1 && (
                  <Button variant="secondary" size="sm" onClick={() => openModal('moveToGroup')}>
                    <FolderInput className="w-4 h-4 mr-1" />
                    {t('boards.detail.toolbar.moveToGroup')}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlers.handleDuplicateSelected(selection)}
                  disabled={duplicateItems.isPending}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {duplicateItems.isPending
                    ? t('boards.detail.toolbar.duplicating')
                    : t('boards.detail.toolbar.duplicate')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlers.handleDeleteSelected(selection)}
                  disabled={deleteItem.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('boards.detail.toolbar.delete')}
                </Button>
                <button
                  onClick={() => setSelection(new Set())}
                  className="text-xs text-text-tertiary hover:text-text-secondary ml-1"
                >
                  {t('boards.detail.toolbar.clear')}
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

          <div className="flex items-center gap-2 md:gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder={t('boards.detail.toolbar.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-border-light rounded-md bg-bg-primary focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent w-32 md:w-48"
              />
            </div>
            <span className="hidden md:inline text-sm text-text-secondary">
              {t('boards.detail.toolbar.itemsCount', { count: filteredItems?.length || 0 })}
            </span>

            {/* Desktop: Undo/Redo, Import, Export */}
            <div className="hidden md:flex items-center gap-3">
              <div className="w-px h-5 bg-border-light" />
              <div className="flex items-center gap-1">
                <button
                  onClick={performUndo}
                  disabled={!canUndo}
                  className="p-1.5 rounded hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
                  title={t('boards.detail.toolbar.undoTitle')}
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={performRedo}
                  disabled={!canRedo}
                  className="p-1.5 rounded hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
                  title={t('boards.detail.toolbar.redoTitle')}
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-5 bg-border-light" />

              <Button variant="secondary" size="sm" onClick={() => openModal('importModal')}>
                <Upload className="w-4 h-4 mr-2" />
                {t('boards.detail.toolbar.import')}
              </Button>

              {/* Export Button */}
              <div className="relative">
                <Button variant="secondary" size="sm" onClick={() => toggleModal('exportMenu')}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('boards.detail.toolbar.export')}
                </Button>
                {modals.exportMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => closeModal('exportMenu')} />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-bg-primary rounded-lg shadow-lg border border-border-light z-50 py-1">
                      <button
                        onClick={() =>
                          handlers.handleExport(
                            'csv',
                            groupedItems,
                            effectiveGroups,
                            !!viewTabState.sortConfig
                          )
                        }
                        className="w-full px-4 py-2 text-sm text-left hover:bg-bg-hover flex items-center gap-2"
                      >
                        <Download className="w-4 h-4 text-color-success" />
                        {t('boards.detail.toolbar.exportToCsv')}
                      </button>
                      <button
                        onClick={() =>
                          handlers.handleExport(
                            'excel',
                            groupedItems,
                            effectiveGroups,
                            !!viewTabState.sortConfig
                          )
                        }
                        className="w-full px-4 py-2 text-sm text-left hover:bg-bg-hover flex items-center gap-2"
                      >
                        <Download className="w-4 h-4 text-monday-primary" />
                        {t('boards.detail.toolbar.exportToExcel')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile: overflow menu for undo/redo, import, export */}
            <div className="flex md:hidden relative" ref={toolbarMenuRef}>
              <button
                onClick={() => setMobileToolbarOpen(!mobileToolbarOpen)}
                className="p-2 rounded-md hover:bg-bg-hover text-text-secondary"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {mobileToolbarOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-bg-primary rounded-lg shadow-lg border border-border-light z-50 py-1">
                  <button
                    onClick={() => {
                      performUndo()
                      setMobileToolbarOpen(false)
                    }}
                    disabled={!canUndo}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-bg-hover flex items-center gap-3 text-text-primary disabled:opacity-30"
                  >
                    <Undo2 className="w-4 h-4 text-text-secondary" />
                    {t('boards.detail.toolbar.undo')}
                  </button>
                  <button
                    onClick={() => {
                      performRedo()
                      setMobileToolbarOpen(false)
                    }}
                    disabled={!canRedo}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-bg-hover flex items-center gap-3 text-text-primary disabled:opacity-30"
                  >
                    <Redo2 className="w-4 h-4 text-text-secondary" />
                    {t('boards.detail.toolbar.redo')}
                  </button>
                  <div className="my-1 border-t border-border-light" />
                  <button
                    onClick={() => {
                      openModal('importModal')
                      setMobileToolbarOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-bg-hover flex items-center gap-3 text-text-primary"
                  >
                    <Upload className="w-4 h-4 text-text-secondary" />
                    {t('boards.detail.toolbar.import')}
                  </button>
                  <button
                    onClick={() => {
                      handlers.handleExport(
                        'csv',
                        groupedItems,
                        effectiveGroups,
                        !!viewTabState.sortConfig
                      )
                      setMobileToolbarOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-bg-hover flex items-center gap-3 text-text-primary"
                  >
                    <Download className="w-4 h-4 text-color-success" />
                    {t('boards.detail.toolbar.exportCsv')}
                  </button>
                  <button
                    onClick={() => {
                      handlers.handleExport(
                        'excel',
                        groupedItems,
                        effectiveGroups,
                        !!viewTabState.sortConfig
                      )
                      setMobileToolbarOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-bg-hover flex items-center gap-3 text-text-primary"
                  >
                    <Download className="w-4 h-4 text-monday-primary" />
                    {t('boards.detail.toolbar.exportExcel')}
                  </button>
                  <div className="my-1 border-t border-border-light" />
                  <span className="px-4 py-2 text-xs text-text-tertiary">
                    {t('boards.detail.toolbar.itemsCount', { count: filteredItems?.length || 0 })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 min-h-0 overflow-auto px-2 md:px-6 py-4">
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
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {t('boards.detail.itemsError.title')}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {t('boards.detail.itemsError.description')}
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              {t('boards.detail.itemsError.retry')}
            </Button>
          </div>
        ) : columns && columns.length > 0 ? (
          <ErrorBoundary>
            <CheckinSummaryProvider boardId={board.id}>
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
                commentCounts={commentCounts}
              />
            </CheckinSummaryProvider>
          </ErrorBoundary>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-primary rounded-lg border border-border-light">
            <p className="text-text-secondary mb-4">{t('boards.detail.noColumns')}</p>
            <Button variant="secondary" onClick={() => openModal('addColumn')}>
              {t('boards.detail.configureColumns')}
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
          initialTab={initialTab as any}
          onClose={() => {
            setSelectedItem(null)
            setInitialTab(null)
          }}
          onUpdate={async (itemId, updates) => {
            await updateItem.mutateAsync({ itemId, updates })
          }}
        />
      )}

      {updatesItem && (
        <UpdatesPanel
          isOpen={true}
          onClose={() => setUpdatesItem(null)}
          itemId={updatesItem.id}
          itemName={updatesItem.name}
          itemType="board_item"
          allColumns={columns}
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
          onSuccess={() => showToast(t('boards.detail.toast.savedAsTemplate'), 'success')}
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
          onSuccess={() => showToast(t('boards.detail.toast.documentGenerated'), 'success')}
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
                failedCount > 0
                  ? t('boards.detail.toast.movedWithFailures', {
                      moved: movedCount,
                      failed: failedCount,
                    })
                  : t('boards.detail.toast.moved', { count: movedCount }),
                failedCount > 0 ? 'warning' : 'success'
              )
              setSelection(new Set())
            } else {
              showToast(t('boards.detail.toast.moveFailed'), 'error')
            }
          }}
        />
      )}

      {modals.moveToGroup && selection.size > 0 && groups && items && (
        <MoveToGroupModal
          isOpen={modals.moveToGroup}
          onClose={() => closeModal('moveToGroup')}
          groups={groups}
          items={items.filter(item => selection.has(item.id))}
          onMove={handlers.handleItemMove}
          onComplete={() => setSelection(new Set())}
        />
      )}
    </div>
  )
}
