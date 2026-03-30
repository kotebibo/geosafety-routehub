'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import {
  VirtualizedBoardTable,
  ErrorBoundary,
  BoardToolbar,
  type SortConfig,
  type FilterConfig,
} from '@/features/boards/components'
import { BoardPageSkeleton } from '@/features/boards/components/BoardPageSkeleton'
import { BoardPageHeader } from '@/features/boards/components/BoardPageHeader'
import { ViewTabBar } from '@/features/boards/components/ViewTabBar'
import {
  useBoardViewTabs,
  useCreateViewTab,
  useUpdateViewTab,
  useDeleteViewTab,
  useDuplicateViewTab,
} from '@/features/boards/hooks/useBoardViewTabs'
import {
  useBoardSubitems,
  useBoardSubitemCounts,
  useBoardSubitemColumns,
  useCreateSubitem,
  useUpdateSubitem,
  useDeleteSubitem,
  useEnsureSubitemColumns,
} from '@/features/boards/hooks/useBoardSubitems'
import type { ViewType, BoardViewTab, BoardSubitem } from '@/features/boards/types/board'
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
import type { BoardItem } from '@/features/boards/types/board'

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
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // View tabs
  const { data: viewTabs, error: viewTabsError } = useBoardViewTabs(params.id)
  if (viewTabsError) console.error('View tabs fetch error:', viewTabsError)
  const createViewTab = useCreateViewTab(params.id)
  const updateViewTab = useUpdateViewTab(params.id)
  const deleteViewTab = useDeleteViewTab(params.id)
  const duplicateViewTab = useDuplicateViewTab(params.id)

  // Determine active tab from URL or default
  const viewParam = searchParams.get('view')
  const activeTab =
    viewTabs?.find(t => t.id === viewParam) ?? viewTabs?.find(t => t.is_default) ?? viewTabs?.[0]
  const activeTabId = activeTab?.id ?? null

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
  const [showGenerateDoc, setShowGenerateDoc] = useState(false)
  const [showDocTemplates, setShowDocTemplates] = useState(false)

  // Sync local toolbar state from active tab
  const prevTabIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeTab && activeTab.id !== prevTabIdRef.current) {
      setSortConfig(activeTab.sort_config ?? null)
      setFilters(activeTab.filters ?? [])
      setGroupByColumn(activeTab.group_by_column ?? null)
      prevTabIdRef.current = activeTab.id
    }
  }, [activeTab])

  // Debounced save-back: persist toolbar state changes to active tab
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveTabState = useCallback(
    (updates: Partial<Pick<BoardViewTab, 'sort_config' | 'filters' | 'group_by_column'>>) => {
      if (!activeTabId) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        updateViewTab.mutate({ tabId: activeTabId, updates })
      }, 1000)
    },
    [activeTabId, updateViewTab]
  )

  // Wrap toolbar setters to also persist
  const handleSortChange = useCallback(
    (config: SortConfig | null) => {
      setSortConfig(config)
      saveTabState({ sort_config: config })
    },
    [saveTabState]
  )

  const handleFiltersChange = useCallback(
    (newFilters: FilterConfig[]) => {
      setFilters(newFilters)
      saveTabState({ filters: newFilters })
    },
    [saveTabState]
  )

  const handleGroupByChange = useCallback(
    (columnId: string | null) => {
      setGroupByColumn(columnId)
      saveTabState({ group_by_column: columnId })
    },
    [saveTabState]
  )

  // Tab actions
  const handleTabChange = useCallback(
    (tabId: string) => {
      router.replace(`/boards/${params.id}?view=${tabId}`, { scroll: false })
    },
    [router, params.id]
  )

  const handleCreateTab = useCallback(
    (viewType: ViewType, name: string) => {
      const nextPosition = viewTabs?.length ?? 0
      createViewTab.mutate(
        { view_name: name, view_type: viewType, position: nextPosition },
        {
          onSuccess: newTab => {
            router.replace(`/boards/${params.id}?view=${newTab.id}`, { scroll: false })
          },
          onError: err => {
            console.error('Failed to create view tab:', err)
            showToast('Failed to create view tab', 'error')
          },
        }
      )
    },
    [viewTabs, createViewTab, router, params.id, showToast]
  )

  const handleDeleteTab = useCallback(
    (tabId: string) => {
      const tab = viewTabs?.find(t => t.id === tabId)
      if (tab?.is_default) return
      deleteViewTab.mutate(tabId, {
        onSuccess: () => {
          // Switch to default tab after deletion
          const defaultTab = viewTabs?.find(t => t.is_default)
          if (defaultTab && tabId === activeTabId) {
            router.replace(`/boards/${params.id}?view=${defaultTab.id}`, { scroll: false })
          }
        },
      })
    },
    [viewTabs, deleteViewTab, activeTabId, router, params.id]
  )

  const handleRenameTab = useCallback(
    (tabId: string, name: string) => {
      updateViewTab.mutate({ tabId, updates: { view_name: name } })
    },
    [updateViewTab]
  )

  const handleDuplicateTab = useCallback(
    (tabId: string) => {
      const tab = viewTabs?.find(t => t.id === tabId)
      if (!tab) return
      duplicateViewTab.mutate(
        { tabId, newName: `${tab.view_name} (copy)` },
        {
          onSuccess: newTab => {
            router.replace(`/boards/${params.id}?view=${newTab.id}`, { scroll: false })
          },
        }
      )
    },
    [viewTabs, duplicateViewTab, router, params.id]
  )

  // Data
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

  // Activity log (deferred fetch)
  const {
    data: activityUpdates,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useBoardUpdates(showActivityLog ? params.id : '')

  // Undo/redo
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

  // Real-time collaboration
  const { presence, isConnected, setEditing, publishItemChange } = useRealtimeBoard({
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
    columns
  )

  // ─── Subitems state ───
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Subitem columns for this board
  const { data: subitemColumns } = useBoardSubitemColumns(params.id)
  const ensureSubitemColumns = useEnsureSubitemColumns(params.id)

  // Get all item IDs for batch subitem count fetch
  const allItemIds = (items || []).map(i => i.id)
  const { data: subitemCounts } = useBoardSubitemCounts(
    params.id,
    allItemIds,
    allItemIds.length > 0
  )

  // Track loaded subitems per expanded parent
  const [subitemsByParent, setSubitemsByParent] = useState<Map<string, BoardSubitem[]>>(new Map())

  // Subitem mutations (we create per-parent hooks on demand)
  const createSubitem = useCreateSubitem(params.id)

  const handleToggleExpandItem = useCallback(
    (itemId: string) => {
      setExpandedItems(prev => {
        const next = new Set(prev)
        if (next.has(itemId)) {
          next.delete(itemId)
        } else {
          next.add(itemId)
          // Ensure subitem columns exist when first expanding
          if (!subitemColumns || subitemColumns.length === 0) {
            ensureSubitemColumns.mutate()
          }
        }
        return next
      })
    },
    [subitemColumns, ensureSubitemColumns]
  )

  // Lazy-load subitems for expanded items
  useEffect(() => {
    if (expandedItems.size === 0) return

    const loadSubitems = async () => {
      const { boardSubitemsService } =
        await import('@/features/boards/services/board-subitems.service')
      const newMap = new Map(subitemsByParent)

      for (const itemId of expandedItems) {
        if (!newMap.has(itemId)) {
          try {
            const subs = await boardSubitemsService.getSubitems(itemId)
            newMap.set(itemId, subs)
          } catch {
            newMap.set(itemId, [])
          }
        }
      }

      // Remove collapsed items from map
      for (const key of newMap.keys()) {
        if (!expandedItems.has(key)) {
          newMap.delete(key)
        }
      }

      setSubitemsByParent(newMap)
    }

    loadSubitems()
  }, [expandedItems]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSubitem = useCallback(
    (parentItemId: string) => {
      const currentSubs = subitemsByParent.get(parentItemId) || []
      const nextPosition = currentSubs.length

      createSubitem.mutate(
        {
          parent_item_id: parentItemId,
          name: '',
          position: nextPosition,
          created_by: inspectorId || undefined,
        },
        {
          onSuccess: newSubitem => {
            setSubitemsByParent(prev => {
              const next = new Map(prev)
              const existing = next.get(parentItemId) || []
              next.set(parentItemId, [...existing, newSubitem])
              return next
            })
          },
        }
      )
    },
    [subitemsByParent, createSubitem, inspectorId]
  )

  const handleSubitemCellEdit = useCallback(
    async (subitemId: string, field: string, value: any) => {
      const { boardSubitemsService } =
        await import('@/features/boards/services/board-subitems.service')
      const updates = field === 'data' ? { data: value } : { [field]: value }
      try {
        const updated = await boardSubitemsService.updateSubitem(subitemId, updates as any)
        // Update local state
        setSubitemsByParent(prev => {
          const next = new Map(prev)
          for (const [parentId, subs] of next) {
            const idx = subs.findIndex(s => s.id === subitemId)
            if (idx >= 0) {
              const newSubs = [...subs]
              newSubs[idx] = updated
              next.set(parentId, newSubs)
              break
            }
          }
          return next
        })
      } catch (err) {
        console.error('Failed to update subitem:', err)
      }
    },
    []
  )

  const handleDeleteSubitem = useCallback(async (subitemId: string, parentItemId: string) => {
    const { boardSubitemsService } =
      await import('@/features/boards/services/board-subitems.service')
    try {
      await boardSubitemsService.deleteSubitem(subitemId)
      setSubitemsByParent(prev => {
        const next = new Map(prev)
        const subs = next.get(parentItemId) || []
        next.set(
          parentItemId,
          subs.filter(s => s.id !== subitemId)
        )
        return next
      })
    } catch (err) {
      console.error('Failed to delete subitem:', err)
    }
  }, [])

  // All event handlers
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
        board={board}
        presence={presence}
        isConnected={isConnected}
        onShowActivityLog={() => setShowActivityLog(true)}
        onShowSaveAsTemplate={() => setShowSaveAsTemplate(true)}
        onShowAccessModal={() => setShowAccessModal(true)}
        onShowColumnConfig={() => setShowColumnConfig(true)}
        onShowDocTemplates={() => setShowDocTemplates(true)}
      />

      {/* View Tabs */}
      {viewTabs && (
        <ViewTabBar
          tabs={viewTabs}
          activeTabId={activeTabId}
          onTabChange={handleTabChange}
          onCreateTab={handleCreateTab}
          onDeleteTab={handleDeleteTab}
          onRenameTab={handleRenameTab}
          onDuplicateTab={handleDuplicateTab}
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
                <Button variant="secondary" size="sm" onClick={() => setShowGenerateDoc(true)}>
                  <FileText className="w-4 h-4 mr-1" />
                  Generate Doc
                </Button>
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
            ) : (
              columns &&
              columns.length > 0 && (
                <BoardToolbar
                  columns={columns}
                  sortConfig={sortConfig}
                  onSortChange={handleSortChange}
                  groupByColumn={groupByColumn}
                  onGroupByChange={handleGroupByChange}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
              )
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
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
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
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

      {/* Table Area - no page scroll, table handles its own scrolling */}
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
              onSortChange={handleSortChange}
              expandedItems={expandedItems}
              subitemCounts={subitemCounts}
              subitemsByParent={subitemsByParent}
              subitemColumns={subitemColumns}
              onToggleExpandItem={handleToggleExpandItem}
              onSubitemCellEdit={handleSubitemCellEdit}
              onAddSubitem={handleAddSubitem}
              onDeleteSubitem={handleDeleteSubitem}
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
          onAddColumn={() => {
            setShowColumnConfig(false)
            setShowAddColumn(true)
          }}
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
          workspaceId={board.workspace_id}
        />
      )}

      <ActivityLogPanel
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        updates={activityUpdates || []}
        isLoading={activityLoading}
        onRefresh={() => refetchActivity()}
        showRollback={true}
        onRollback={async update => {
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
        }}
      />

      {showGenerateDoc && selection.size > 0 && items && (
        <GenerateDocumentModal
          isOpen={showGenerateDoc}
          onClose={() => setShowGenerateDoc(false)}
          boardId={params.id}
          items={items.filter(item => selection.has(item.id))}
          onSuccess={() => showToast('Document generated successfully', 'success')}
        />
      )}

      {showDocTemplates && board && columns && (
        <TemplateManagementModal
          isOpen={showDocTemplates}
          onClose={() => setShowDocTemplates(false)}
          boardId={params.id}
          workspaceId={board.workspace_id}
          columns={columns.map(c => ({
            column_id: c.column_id,
            column_name: c.column_name,
            column_type: c.column_type,
          }))}
        />
      )}

      {showMoveModal && selection.size > 0 && (
        <MoveItemModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
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
