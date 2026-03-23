import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardSubitemsService } from '../services/board-subitems.service'
import { queryKeys } from '@/lib/react-query'
import type { BoardSubitem, BoardSubitemColumn } from '../types/board'

/**
 * Hook to fetch subitems for a parent item (lazy — only when expanded)
 */
export function useBoardSubitems(parentItemId: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.boardSubitems.byParent(parentItemId),
    queryFn: () => boardSubitemsService.getSubitems(parentItemId),
    enabled: !!parentItemId && enabled,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to fetch subitem counts for multiple parent items
 */
export function useBoardSubitemCounts(parentItemIds: string[], enabled = true) {
  return useQuery({
    queryKey: queryKeys.boardSubitems.counts(parentItemIds),
    queryFn: () => boardSubitemsService.getSubitemCounts(parentItemIds),
    enabled: enabled && parentItemIds.length > 0,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch subitem columns for a board
 */
export function useBoardSubitemColumns(boardId: string) {
  return useQuery({
    queryKey: queryKeys.boardSubitemColumns.byBoard(boardId),
    queryFn: () => boardSubitemsService.getSubitemColumns(boardId),
    enabled: !!boardId,
    staleTime: 5 * 60 * 1000, // columns don't change often
  })
}

/**
 * Hook to create a subitem
 */
export function useCreateSubitem(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (subitem: {
      parent_item_id: string
      name: string
      position: number
      data?: Record<string, any>
      status?: string
      assigned_to?: string
      due_date?: string
      created_by?: string
    }) => boardSubitemsService.createSubitem({ ...subitem, board_id: boardId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardSubitems.byParent(variables.parent_item_id),
      })
      // Invalidate counts since a new subitem was added
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardSubitems.all,
      })
    },
  })
}

/**
 * Hook to update a subitem (with optimistic update)
 */
export function useUpdateSubitem(parentItemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      subitemId,
      updates,
    }: {
      subitemId: string
      updates: Partial<
        Pick<BoardSubitem, 'name' | 'data' | 'status' | 'assigned_to' | 'due_date' | 'position'>
      >
    }) => boardSubitemsService.updateSubitem(subitemId, updates),
    onMutate: async ({ subitemId, updates }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.boardSubitems.byParent(parentItemId),
      })

      const previousSubitems = queryClient.getQueryData<BoardSubitem[]>(
        queryKeys.boardSubitems.byParent(parentItemId)
      )

      queryClient.setQueryData<BoardSubitem[]>(
        queryKeys.boardSubitems.byParent(parentItemId),
        old => old?.map(s => (s.id === subitemId ? { ...s, ...updates } : s))
      )

      return { previousSubitems }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSubitems) {
        queryClient.setQueryData(
          queryKeys.boardSubitems.byParent(parentItemId),
          context.previousSubitems
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardSubitems.byParent(parentItemId),
      })
    },
  })
}

/**
 * Hook to delete a subitem
 */
export function useDeleteSubitem(parentItemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (subitemId: string) => boardSubitemsService.deleteSubitem(subitemId),
    onMutate: async subitemId => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.boardSubitems.byParent(parentItemId),
      })

      const previousSubitems = queryClient.getQueryData<BoardSubitem[]>(
        queryKeys.boardSubitems.byParent(parentItemId)
      )

      queryClient.setQueryData<BoardSubitem[]>(
        queryKeys.boardSubitems.byParent(parentItemId),
        old => old?.filter(s => s.id !== subitemId)
      )

      return { previousSubitems }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSubitems) {
        queryClient.setQueryData(
          queryKeys.boardSubitems.byParent(parentItemId),
          context.previousSubitems
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardSubitems.byParent(parentItemId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardSubitems.all,
      })
    },
  })
}

/**
 * Hook to reorder subitems
 */
export function useReorderSubitems(parentItemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: { id: string; position: number }[]) =>
      boardSubitemsService.reorderSubitems(updates),
    onMutate: async updates => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.boardSubitems.byParent(parentItemId),
      })

      const previousSubitems = queryClient.getQueryData<BoardSubitem[]>(
        queryKeys.boardSubitems.byParent(parentItemId)
      )

      queryClient.setQueryData<BoardSubitem[]>(
        queryKeys.boardSubitems.byParent(parentItemId),
        old => {
          if (!old) return old
          const positionMap = new Map(updates.map(u => [u.id, u.position]))
          return [...old]
            .map(s => ({
              ...s,
              position: positionMap.get(s.id) ?? s.position,
            }))
            .sort((a, b) => a.position - b.position)
        }
      )

      return { previousSubitems }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSubitems) {
        queryClient.setQueryData(
          queryKeys.boardSubitems.byParent(parentItemId),
          context.previousSubitems
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardSubitems.byParent(parentItemId),
      })
    },
  })
}

/**
 * Hook to ensure default subitem columns exist for a board
 */
export function useEnsureSubitemColumns(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => boardSubitemsService.ensureDefaultColumns(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardSubitemColumns.byBoard(boardId),
      })
    },
  })
}
