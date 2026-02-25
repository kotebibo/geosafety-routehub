// Board Group Hooks
// Query and mutation hooks for board group operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardsService } from '../services/boards.service'
import { queryKeys } from '@/lib/react-query'
import type { BoardGroup } from '../types/board'

export function useBoardGroups(boardId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
    queryFn: () => boardsService.getBoardGroups(boardId),
    enabled: !!boardId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateBoardGroup(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (group: { name: string; color: string; position: number }) =>
      boardsService.createBoardGroup({ ...group, board_id: boardId }),
    onSuccess: (newGroup) => {
      const queryKey = [...queryKeys.routes.all, 'board-groups', boardId]
      const previousGroups = queryClient.getQueryData<BoardGroup[]>(queryKey) || []
      queryClient.setQueryData(queryKey, [...previousGroups, newGroup])
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })
    },
  })
}

export function useUpdateBoardGroup(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      groupId,
      updates,
    }: {
      groupId: string
      updates: Partial<Pick<BoardGroup, 'name' | 'color' | 'position' | 'is_collapsed'>>
    }) => boardsService.updateBoardGroup(groupId, updates),
    onMutate: async ({ groupId, updates }) => {
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })

      const previousGroups = queryClient.getQueryData<BoardGroup[]>([
        ...queryKeys.routes.all,
        'board-groups',
        boardId,
      ])

      if (previousGroups) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-groups', boardId],
          previousGroups.map((group) =>
            group.id === groupId ? { ...group, ...updates } : group
          )
        )
      }

      return { previousGroups }
    },
    onError: (err, variables, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-groups', boardId],
          context.previousGroups
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })
    },
  })
}

export function useDeleteBoardGroup(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupId: string) => boardsService.deleteBoardGroup(groupId),
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })

      const previousGroups = queryClient.getQueryData<BoardGroup[]>([
        ...queryKeys.routes.all,
        'board-groups',
        boardId,
      ])

      if (previousGroups) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-groups', boardId],
          previousGroups.filter((group) => group.id !== groupId)
        )
      }

      return { previousGroups }
    },
    onError: (err, variables, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-groups', boardId],
          context.previousGroups
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })
    },
  })
}

export function useReorderBoardGroups(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Array<{ id: string; position: number }>) =>
      boardsService.reorderBoardGroups(updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })

      const previousGroups = queryClient.getQueryData<BoardGroup[]>([
        ...queryKeys.routes.all,
        'board-groups',
        boardId,
      ])

      if (previousGroups) {
        const updatedGroups = previousGroups.map((group) => {
          const update = updates.find((u) => u.id === group.id)
          return update ? { ...group, position: update.position } : group
        })
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-groups', boardId],
          updatedGroups.sort((a, b) => a.position - b.position)
        )
      }

      return { previousGroups }
    },
    onError: (err, variables, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-groups', boardId],
          context.previousGroups
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })
    },
  })
}
