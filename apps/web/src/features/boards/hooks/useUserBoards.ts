import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userBoardsService } from '../services/user-boards.service'
import { boardsService } from '../services/boards.service'
import { queryKeys } from '@/lib/react-query'
import type { Board, BoardItem, BoardMember, BoardTemplate, BoardType } from '@/types/board'
import type { BoardGroup } from '../types/board'

// ==================== BOARDS ====================

/**
 * Hook to fetch all boards for a user
 */
export function useUserBoards(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'user-boards', userId],
    queryFn: () => userBoardsService.getBoards(userId),
    enabled: !!userId,
  })
}

/**
 * Hook to fetch boards by type
 */
export function useBoardsByType(boardType: BoardType, userId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'user-boards', boardType, userId],
    queryFn: () => userBoardsService.getBoardsByType(boardType, userId),
    enabled: !!userId,
  })
}

/**
 * Hook to fetch a specific board
 */
export function useBoard(boardId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'user-boards', 'detail', boardId],
    queryFn: () => userBoardsService.getBoard(boardId),
    enabled: !!boardId,
    staleTime: 5 * 60 * 1000, // 5 minutes - board metadata rarely changes
  })
}

/**
 * Hook to create a board
 */
export function useCreateBoard(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (board: Omit<Board, 'id' | 'created_at' | 'updated_at'>) =>
      userBoardsService.createBoard(board),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'user-boards', userId],
      })
      // Also invalidate workspace boards
      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      })
    },
  })
}

/**
 * Hook to create board from template
 */
export function useCreateBoardFromTemplate(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, name, workspaceId }: { templateId: string; name: string; workspaceId?: string }) =>
      userBoardsService.createBoardFromTemplate(templateId, name, userId, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'user-boards', userId],
      })
      // Also invalidate workspace boards
      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      })
    },
  })
}

/**
 * Hook to update a board
 */
export function useUpdateBoard(boardId: string, userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Partial<Board>) =>
      userBoardsService.updateBoard(boardId, updates),
    onSuccess: (updatedBoard) => {
      // Update specific board cache
      queryClient.setQueryData(
        [...queryKeys.routes.all, 'user-boards', 'detail', boardId],
        updatedBoard
      )

      // Invalidate list
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'user-boards', userId],
      })
    },
  })
}

/**
 * Hook to delete a board
 */
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

/**
 * Hook to duplicate a board
 */
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

// ==================== BOARD ITEMS ====================

/**
 * Hook to fetch board items
 */
export function useBoardItems(boardId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-items', boardId],
    queryFn: () => userBoardsService.getBoardItems(boardId),
    enabled: !!boardId,
    staleTime: 30 * 1000, // 30 seconds - prevent immediate refetch on mount
    refetchOnWindowFocus: false, // Real-time updates handle this via Ably
  })
}

/**
 * Hook to fetch a specific item
 */
export function useBoardItem(itemId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-items', 'detail', itemId],
    queryFn: () => userBoardsService.getBoardItem(itemId),
    enabled: !!itemId,
  })
}

/**
 * Hook to create a board item
 */
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

/**
 * Hook to update a board item
 */
export function useUpdateBoardItem(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<BoardItem> }) =>
      userBoardsService.updateBoardItem(itemId, updates),
    onMutate: async ({ itemId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<BoardItem[]>([
        ...queryKeys.routes.all,
        'board-items',
        boardId,
      ])

      // Optimistically update
      if (previousItems) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-items', boardId],
          previousItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
        )
      }

      return { previousItems }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-items', boardId],
          context.previousItems
        )
      }
    },
    onSettled: () => {
      // Use refetchQueries instead of invalidateQueries to bypass staleTime
      // This ensures the data is always fresh after a mutation
      queryClient.refetchQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
        type: 'active',
      })
    },
  })
}

/**
 * Hook to update item field
 */
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

/**
 * Hook to delete a board item
 */
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

/**
 * Hook to bulk update items
 */
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

/**
 * Hook to duplicate a single board item
 */
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

/**
 * Hook to duplicate multiple board items
 */
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

// ==================== BOARD MEMBERS ====================

/**
 * Hook to fetch board members
 */
export function useBoardMembers(boardId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-members', boardId],
    queryFn: () => userBoardsService.getBoardMembers(boardId),
    enabled: !!boardId,
  })
}

/**
 * Hook to add board member
 */
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

/**
 * Hook to update board member role
 */
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

/**
 * Hook to remove board member
 */
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

// ==================== BOARD GROUPS ====================

/**
 * Hook to fetch board groups
 */
export function useBoardGroups(boardId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
    queryFn: () => boardsService.getBoardGroups(boardId),
    enabled: !!boardId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to create a board group
 */
export function useCreateBoardGroup(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (group: { name: string; color: string; position: number }) =>
      boardsService.createBoardGroup({ ...group, board_id: boardId }),
    onSuccess: (newGroup) => {
      // Optimistically add to cache
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

/**
 * Hook to update a board group
 */
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
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })

      // Snapshot previous value
      const previousGroups = queryClient.getQueryData<BoardGroup[]>([
        ...queryKeys.routes.all,
        'board-groups',
        boardId,
      ])

      // Optimistically update
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
      // Rollback on error
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

/**
 * Hook to delete a board group
 */
export function useDeleteBoardGroup(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupId: string) => boardsService.deleteBoardGroup(groupId),
    onMutate: async (groupId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })

      // Snapshot previous value
      const previousGroups = queryClient.getQueryData<BoardGroup[]>([
        ...queryKeys.routes.all,
        'board-groups',
        boardId,
      ])

      // Optimistically remove
      if (previousGroups) {
        queryClient.setQueryData(
          [...queryKeys.routes.all, 'board-groups', boardId],
          previousGroups.filter((group) => group.id !== groupId)
        )
      }

      return { previousGroups }
    },
    onError: (err, variables, context) => {
      // Rollback on error
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

/**
 * Hook to reorder board groups
 */
export function useReorderBoardGroups(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Array<{ id: string; position: number }>) =>
      boardsService.reorderBoardGroups(updates),
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.routes.all, 'board-groups', boardId],
      })

      // Snapshot previous value
      const previousGroups = queryClient.getQueryData<BoardGroup[]>([
        ...queryKeys.routes.all,
        'board-groups',
        boardId,
      ])

      // Optimistically update positions
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
      // Rollback on error
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

// ==================== BOARD TEMPLATES ====================

/**
 * Hook to fetch all templates
 */
export function useBoardTemplates() {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-templates'],
    queryFn: () => userBoardsService.getTemplates(),
    staleTime: 10 * 60 * 1000, // 10 minutes - templates don't change often
  })
}

/**
 * Hook to fetch templates by category
 */
export function useBoardTemplatesByCategory(category: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-templates', 'category', category],
    queryFn: () => userBoardsService.getTemplatesByCategory(category),
    enabled: !!category,
  })
}

/**
 * Hook to fetch featured templates
 */
export function useFeaturedBoardTemplates() {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-templates', 'featured'],
    queryFn: () => userBoardsService.getFeaturedTemplates(),
  })
}

/**
 * Hook to fetch a specific template
 */
export function useBoardTemplate(templateId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-templates', 'detail', templateId],
    queryFn: () => userBoardsService.getTemplate(templateId),
    enabled: !!templateId,
  })
}

/**
 * Hook to save a board as a template
 */
export function useSaveAsTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      templateData,
    }: {
      boardId: string
      templateData: {
        name: string
        description?: string
        category?: string
        is_featured?: boolean
      }
    }) => userBoardsService.saveAsTemplate(boardId, templateData),
    onSuccess: () => {
      // Invalidate templates cache
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-templates'],
      })
    },
  })
}

// ==================== SEARCH ====================

/**
 * Hook to search boards
 */
export function useSearchBoards(query: string, userId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'user-boards', 'search', query, userId],
    queryFn: () => userBoardsService.searchBoards(query, userId),
    enabled: !!query && query.length >= 2 && !!userId,
  })
}

/**
 * Hook to search board items
 */
export function useSearchBoardItems(boardId: string, query: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-items', boardId, 'search', query],
    queryFn: () => userBoardsService.searchBoardItems(boardId, query),
    enabled: !!boardId && !!query && query.length >= 2,
  })
}
