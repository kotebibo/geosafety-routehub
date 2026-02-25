// Board Item Hooks
// Query and mutation hooks for board item operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userBoardsService } from '../services/user-boards.service'
import { queryKeys } from '@/lib/react-query'
import type { BoardItem } from '@/types/board'

export function useBoardItems(boardId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-items', boardId],
    queryFn: () => userBoardsService.getBoardItems(boardId),
    enabled: !!boardId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useBoardItem(itemId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-items', 'detail', itemId],
    queryFn: () => userBoardsService.getBoardItem(itemId),
    enabled: !!itemId,
  })
}

export function useCreateBoardItem(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (item: Omit<BoardItem, 'id' | 'created_at' | 'updated_at'>) =>
      userBoardsService.createBoardItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    },
  })
}

export function useUpdateBoardItem(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<BoardItem> }) =>
      userBoardsService.updateBoardItem(itemId, updates),
    onMutate: async ({ itemId, updates }) => {
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })

      const previousItems = queryClient.getQueryData<BoardItem[]>([
        ...queryKeys.routes.all,
        'board-items',
        boardId,
      ])

      if (previousItems) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-items', boardId],
          previousItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
        )
      }

      return { previousItems }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-items', boardId],
          context.previousItems
        )
      }
    },
    onSettled: () => {
      queryClient.refetchQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
        type: 'active',
      })
    },
  })
}

export function useUpdateBoardItemField(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, fieldName, value }: { itemId: string; fieldName: string; value: any }) =>
      userBoardsService.updateBoardItemField(itemId, fieldName, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    },
  })
}

export function useDeleteBoardItem(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => userBoardsService.deleteBoardItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    },
  })
}

export function useBulkUpdateItems(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Array<{ id: string; data: Partial<BoardItem> }>) =>
      userBoardsService.bulkUpdateItems(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    },
  })
}

export function useDuplicateBoardItem(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, newName, targetBoardId }: { itemId: string; newName?: string; targetBoardId?: string }) =>
      userBoardsService.duplicateBoardItem(itemId, { newName, targetBoardId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    },
  })
}

export function useDuplicateBoardItems(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemIds, targetBoardId }: { itemIds: string[]; targetBoardId?: string }) =>
      userBoardsService.duplicateBoardItems(itemIds, targetBoardId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    },
  })
}
