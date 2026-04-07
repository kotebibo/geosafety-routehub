import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui-monday/Toast'
import {
  useBoardViewTabs,
  useCreateViewTab,
  useUpdateViewTab,
  useDeleteViewTab,
  useDuplicateViewTab,
} from './useBoardViewTabs'
import type { SortConfig, FilterConfig } from '../components/BoardToolbar'
import type { ViewType, BoardViewTab } from '../types/board'

export function useBoardViewTabState(boardId: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  // View tabs query + mutations
  const { data: viewTabs, error: viewTabsError } = useBoardViewTabs(boardId)
  if (viewTabsError) console.error('View tabs fetch error:', viewTabsError)
  const createViewTab = useCreateViewTab(boardId)
  const updateViewTab = useUpdateViewTab(boardId)
  const deleteViewTab = useDeleteViewTab(boardId)
  const duplicateViewTab = useDuplicateViewTab(boardId)

  // Resolve active tab from URL or default
  const viewParam = searchParams.get('view')
  const activeTab =
    viewTabs?.find(t => t.id === viewParam) ?? viewTabs?.find(t => t.is_default) ?? viewTabs?.[0]
  const activeTabId = activeTab?.id ?? null

  // Toolbar state
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null)

  // Sync toolbar state FROM active tab when tab changes
  const prevTabIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeTab && activeTab.id !== prevTabIdRef.current) {
      setSortConfig((activeTab.sort_config as SortConfig | null) ?? null)
      setFilters((activeTab.filters as FilterConfig[] | null) ?? [])
      setGroupByColumn(activeTab.group_by_column ?? null)
      prevTabIdRef.current = activeTab.id
    }
  }, [activeTab])

  // Debounced save-back: persist toolbar state TO active tab
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

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

  // Wrapped setters that also persist
  const handleSortChange = useCallback(
    (config: SortConfig | null) => {
      setSortConfig(config)
      saveTabState({ sort_config: config as any })
    },
    [saveTabState]
  )

  const handleFiltersChange = useCallback(
    (newFilters: FilterConfig[]) => {
      setFilters(newFilters)
      saveTabState({ filters: newFilters as any })
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
      router.replace(`/boards/${boardId}?view=${tabId}`, { scroll: false })
    },
    [router, boardId]
  )

  const handleCreateTab = useCallback(
    (viewType: ViewType, name: string) => {
      const nextPosition = viewTabs?.length ?? 0
      createViewTab.mutate(
        { view_name: name, view_type: viewType, position: nextPosition },
        {
          onSuccess: newTab => {
            router.replace(`/boards/${boardId}?view=${newTab.id}`, { scroll: false })
          },
          onError: err => {
            console.error('Failed to create view tab:', err)
            showToast('Failed to create view tab', 'error')
          },
        }
      )
    },
    [viewTabs, createViewTab, router, boardId, showToast]
  )

  const handleDeleteTab = useCallback(
    (tabId: string) => {
      const tab = viewTabs?.find(t => t.id === tabId)
      if (tab?.is_default) return
      deleteViewTab.mutate(tabId, {
        onSuccess: () => {
          const defaultTab = viewTabs?.find(t => t.is_default)
          if (defaultTab && tabId === activeTabId) {
            router.replace(`/boards/${boardId}?view=${defaultTab.id}`, { scroll: false })
          }
        },
      })
    },
    [viewTabs, deleteViewTab, activeTabId, router, boardId]
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
            router.replace(`/boards/${boardId}?view=${newTab.id}`, { scroll: false })
          },
        }
      )
    },
    [viewTabs, duplicateViewTab, router, boardId]
  )

  return {
    viewTabs,
    activeTab,
    activeTabId,

    sortConfig,
    filters,
    groupByColumn,
    onSortChange: handleSortChange,
    onFiltersChange: handleFiltersChange,
    onGroupByChange: handleGroupByChange,

    onTabChange: handleTabChange,
    onCreateTab: handleCreateTab,
    onDeleteTab: handleDeleteTab,
    onRenameTab: handleRenameTab,
    onDuplicateTab: handleDuplicateTab,
  }
}
