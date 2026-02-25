// Board Member Hooks
// Query and mutation hooks for board member operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userBoardsService } from '../services/user-boards.service'
import { queryKeys } from '@/lib/react-query'

export function useBoardMembers(boardId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-members', boardId],
    queryFn: () => userBoardsService.getBoardMembers(boardId),
    enabled: !!boardId,
  })
}

export function useAddBoardMember(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      role,
      addedBy,
    }: {
      userId: string
      role: 'owner' | 'editor' | 'viewer'
      addedBy: string
    }) => userBoardsService.addBoardMember(boardId, userId, role, addedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-members', boardId],
      })
    },
  })
}

export function useUpdateBoardMemberRole(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'owner' | 'editor' | 'viewer' }) =>
      userBoardsService.updateBoardMemberRole(boardId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-members', boardId],
      })
    },
  })
}

export function useRemoveBoardMember(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => userBoardsService.removeBoardMember(boardId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-members', boardId],
      })
    },
  })
}
