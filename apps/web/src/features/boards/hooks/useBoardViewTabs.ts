import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardViewTabsService } from '../services/board-view-tabs.service'
import { queryKeys } from '@/lib/react-query'
import type { BoardViewTab, ViewType } from '../types/board'

/**
 * Hook to fetch all view tabs for a board
 */
export function useBoardViewTabs(boardId: string) {
  return useQuery({
    queryKey: queryKeys.boardViewTabs.byBoard(boardId),
    queryFn: () => boardViewTabsService.getViewTabs(boardId),
    enabled: !!boardId,
    staleTime: 60 * 1000, // tabs don't change often
  })
}

/**
 * Hook to create a new view tab
 */
export function useCreateViewTab(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tab: {
      view_name: string
      view_name_ka?: string
      view_type: ViewType
      icon?: string
      position: number
      is_default?: boolean
      created_by?: string
    }) => boardViewTabsService.createViewTab({ ...tab, board_id: boardId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardViewTabs.byBoard(boardId),
      })
    },
  })
}

/**
 * Hook to update a view tab (with optimistic update for filter/sort/group changes)
 */
export function useUpdateViewTab(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      tabId,
      updates,
    }: {
      tabId: string
      updates: Partial<
        Pick<
          BoardViewTab,
          | 'view_name'
          | 'view_name_ka'
          | 'icon'
          | 'position'
          | 'filters'
          | 'sort_config'
          | 'group_by_column'
        >
      >
    }) => boardViewTabsService.updateViewTab(tabId, updates),
    onMutate: async ({ tabId, updates }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.boardViewTabs.byBoard(boardId),
      })

      const previousTabs = queryClient.getQueryData<BoardViewTab[]>(
        queryKeys.boardViewTabs.byBoard(boardId)
      )

      // Optimistic update
      queryClient.setQueryData<BoardViewTab[]>(queryKeys.boardViewTabs.byBoard(boardId), old =>
        old?.map(tab => (tab.id === tabId ? { ...tab, ...updates } : tab))
      )

      return { previousTabs }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTabs) {
        queryClient.setQueryData(queryKeys.boardViewTabs.byBoard(boardId), context.previousTabs)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardViewTabs.byBoard(boardId),
      })
    },
  })
}

/**
 * Hook to delete a view tab
 */
export function useDeleteViewTab(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tabId: string) => boardViewTabsService.deleteViewTab(tabId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardViewTabs.byBoard(boardId),
      })
    },
  })
}

/**
 * Hook to reorder view tabs
 */
export function useReorderViewTabs(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: { id: string; position: number }[]) =>
      boardViewTabsService.reorderViewTabs(updates),
    onMutate: async updates => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.boardViewTabs.byBoard(boardId),
      })

      const previousTabs = queryClient.getQueryData<BoardViewTab[]>(
        queryKeys.boardViewTabs.byBoard(boardId)
      )

      // Optimistic reorder
      queryClient.setQueryData<BoardViewTab[]>(queryKeys.boardViewTabs.byBoard(boardId), old => {
        if (!old) return old
        const positionMap = new Map(updates.map(u => [u.id, u.position]))
        return [...old]
          .map(tab => ({
            ...tab,
            position: positionMap.get(tab.id) ?? tab.position,
          }))
          .sort((a, b) => a.position - b.position)
      })

      return { previousTabs }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTabs) {
        queryClient.setQueryData(queryKeys.boardViewTabs.byBoard(boardId), context.previousTabs)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardViewTabs.byBoard(boardId),
      })
    },
  })
}

/**
 * Hook to duplicate a view tab
 */
export function useDuplicateViewTab(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tabId, newName }: { tabId: string; newName: string }) =>
      boardViewTabsService.duplicateViewTab(tabId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardViewTabs.byBoard(boardId),
      })
    },
  })
}
