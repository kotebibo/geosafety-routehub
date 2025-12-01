import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardsService } from '../services/boards.service'
import { queryKeys } from '@/lib/react-query'
import type { BoardView, BoardType } from '@/types/board'

/**
 * Hook to fetch all views for a board type
 */
export function useBoardViews(boardType: BoardType, userId: string) {
  return useQuery({
    queryKey: queryKeys.boardViews.byType(boardType),
    queryFn: () => boardsService.getViews(boardType, userId),
    enabled: !!userId,
  })
}

/**
 * Hook to fetch the default view
 */
export function useDefaultBoardView(boardType: BoardType, userId: string) {
  return useQuery({
    queryKey: [...queryKeys.boardViews.byType(boardType), 'default'],
    queryFn: () => boardsService.getDefaultView(boardType, userId),
    enabled: !!userId,
  })
}

/**
 * Hook to fetch a specific view
 */
export function useBoardView(viewId: string) {
  return useQuery({
    queryKey: queryKeys.boardViews.detail(viewId),
    queryFn: () => boardsService.getView(viewId),
    enabled: !!viewId,
  })
}

/**
 * Hook to create a new view
 */
export function useCreateBoardView(boardType: BoardType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (view: Omit<BoardView, 'id' | 'created_at' | 'updated_at'>) =>
      boardsService.createView(view),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardViews.byType(boardType),
      })
    },
  })
}

/**
 * Hook to update a view
 */
export function useUpdateBoardView(boardType: BoardType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ viewId, updates }: { viewId: string; updates: Partial<BoardView> }) =>
      boardsService.updateView(viewId, updates),
    onSuccess: (updatedView) => {
      // Update the specific view cache
      queryClient.setQueryData(
        queryKeys.boardViews.detail(updatedView.id),
        updatedView
      )

      // Invalidate the list
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardViews.byType(boardType),
      })
    },
  })
}

/**
 * Hook to delete a view
 */
export function useDeleteBoardView(boardType: BoardType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (viewId: string) => boardsService.deleteView(viewId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardViews.byType(boardType),
      })
    },
  })
}

/**
 * Hook to set a view as default
 */
export function useSetDefaultView(boardType: BoardType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      viewId,
      userId,
    }: {
      viewId: string
      userId: string
      boardType: BoardType
    }) => boardsService.setDefaultView(viewId, userId, boardType),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardViews.byType(boardType),
      })
    },
  })
}
