// Board Transfer Hooks
// Query and mutation hooks for item transfer between boards

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userBoardsService } from '../services/user-boards.service'
import { queryKeys } from '@/lib/react-query'

export function useColumnMapping(sourceBoardId: string, targetBoardId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'column-mapping', sourceBoardId, targetBoardId],
    queryFn: () => userBoardsService.getColumnMapping(sourceBoardId, targetBoardId),
    enabled: !!sourceBoardId && !!targetBoardId && sourceBoardId !== targetBoardId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMoveItemToBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      targetBoardId,
      columnMapping,
      options,
    }: {
      itemId: string
      targetBoardId: string
      columnMapping?: Record<string, string>
      options?: { preserveUnmapped?: boolean }
    }) => userBoardsService.moveItemToBoard(itemId, targetBoardId, columnMapping, options),
    onSuccess: (movedItem, { targetBoardId }) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items'],
      })
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', targetBoardId],
      })
    },
  })
}

export function useMoveItemsToBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemIds,
      targetBoardId,
      columnMapping,
      options,
    }: {
      itemIds: string[]
      targetBoardId: string
      columnMapping?: Record<string, string>
      options?: { preserveUnmapped?: boolean }
    }) => userBoardsService.moveItemsToBoard(itemIds, targetBoardId, columnMapping, options),
    onSuccess: (result, { targetBoardId }) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items'],
      })
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', targetBoardId],
      })
    },
  })
}

export function useCompatibleColumnTypes(sourceType: string) {
  return userBoardsService.getCompatibleColumnTypes(sourceType)
}

export function useSearchBoards(query: string, userId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'user-boards', 'search', query, userId],
    queryFn: () => userBoardsService.searchBoards(query, userId),
    enabled: !!query && query.length >= 2 && !!userId,
  })
}

export function useSearchBoardItems(boardId: string, query: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-items', boardId, 'search', query],
    queryFn: () => userBoardsService.searchBoardItems(boardId, query),
    enabled: !!boardId && !!query && query.length >= 2,
  })
}
