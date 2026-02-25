// Board CRUD Hooks
// Query and mutation hooks for board-level operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userBoardsService } from '../services/user-boards.service'
import { queryKeys } from '@/lib/react-query'
import type { Board, BoardType } from '@/types/board'

export function useUserBoards(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'user-boards', userId],
    queryFn: () => userBoardsService.getBoards(userId),
    enabled: !!userId,
  })
}

export function useBoardsByType(boardType: BoardType, userId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'user-boards', boardType, userId],
    queryFn: () => userBoardsService.getBoardsByType(boardType, userId),
    enabled: !!userId,
  })
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'user-boards', 'detail', boardId],
    queryFn: () => userBoardsService.getBoard(boardId),
    enabled: !!boardId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateBoard(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (board: Omit<Board, 'id' | 'created_at' | 'updated_at'>) =>
      userBoardsService.createBoard(board),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'user-boards', userId],
      })
      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      })
    },
  })
}

export function useCreateBoardFromTemplate(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, name, workspaceId }: { templateId: string; name: string; workspaceId?: string }) =>
      userBoardsService.createBoardFromTemplate(templateId, name, userId, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'user-boards', userId],
      })
      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      })
    },
  })
}

export function useUpdateBoard(boardId: string, userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Partial<Board>) =>
      userBoardsService.updateBoard(boardId, updates),
    onSuccess: (updatedBoard) => {
      queryClient.setQueryData(
        [...queryKeys.routes.all, 'user-boards', 'detail', boardId],
        updatedBoard
      )
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'user-boards', userId],
      })
    },
  })
}

export function useDeleteBoard(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (boardId: string) => userBoardsService.deleteBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'user-boards', userId],
      })
    },
  })
}

export function useDuplicateBoard(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, newName }: { boardId: string; newName: string }) =>
      userBoardsService.duplicateBoard(boardId, newName, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'user-boards', userId],
      })
    },
  })
}
