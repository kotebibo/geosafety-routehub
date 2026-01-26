/**
 * Workspace Hooks
 * React Query hooks for workspace operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceService } from '../services/workspace.service'
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '@/types/workspace'
import type { Board } from '@/types/board'

// Query key factory for workspaces
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...workspaceKeys.lists(), filters] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  members: (id: string) => [...workspaceKeys.detail(id), 'members'] as const,
  boards: (id: string) => [...workspaceKeys.detail(id), 'boards'] as const,
}

// ==================== WORKSPACES ====================

/**
 * Hook to fetch all user's workspaces
 * @param enabled - Whether to enable the query (default: true). Set to false to wait for auth.
 */
export function useWorkspaces(enabled: boolean = true) {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: () => workspaceService.getWorkspaces(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  })
}

/**
 * Hook to fetch workspaces with board counts
 * @param enabled - Whether to enable the query (default: true). Set to false to wait for auth.
 */
export function useWorkspacesWithBoardCounts(enabled: boolean = true) {
  return useQuery({
    queryKey: [...workspaceKeys.lists(), 'withCounts'],
    queryFn: () => workspaceService.getWorkspacesWithBoardCounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  })
}

/**
 * Hook to fetch a specific workspace
 */
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => workspaceService.getWorkspace(workspaceId),
    enabled: !!workspaceId,
  })
}

/**
 * Hook to fetch workspace with members
 */
export function useWorkspaceWithMembers(workspaceId: string) {
  return useQuery({
    queryKey: [...workspaceKeys.detail(workspaceId), 'withMembers'],
    queryFn: () => workspaceService.getWorkspaceWithMembers(workspaceId),
    enabled: !!workspaceId,
  })
}

/**
 * Hook to fetch workspace with boards
 */
export function useWorkspaceWithBoards(workspaceId: string) {
  return useQuery({
    queryKey: [...workspaceKeys.detail(workspaceId), 'withBoards'],
    queryFn: () => workspaceService.getWorkspaceWithBoards(workspaceId),
    enabled: !!workspaceId,
  })
}

/**
 * Hook to fetch user's default workspace
 */
export function useDefaultWorkspace() {
  return useQuery({
    queryKey: [...workspaceKeys.all, 'default'],
    queryFn: () => workspaceService.getDefaultWorkspace(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to create a workspace
 */
export function useCreateWorkspace(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) =>
      workspaceService.createWorkspace(input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}

/**
 * Hook to update a workspace
 */
export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: UpdateWorkspaceInput) =>
      workspaceService.updateWorkspace(workspaceId, updates),
    onSuccess: (updatedWorkspace) => {
      // Update specific workspace cache
      queryClient.setQueryData(
        workspaceKeys.detail(workspaceId),
        updatedWorkspace
      )
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}

/**
 * Hook to delete a workspace
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspaceService.deleteWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
    },
  })
}

// ==================== WORKSPACE BOARDS ====================

/**
 * Hook to fetch boards in a workspace
 */
export function useWorkspaceBoards(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.boards(workspaceId),
    queryFn: () => workspaceService.getWorkspaceBoards(workspaceId),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook to fetch active (non-archived) boards in a workspace
 */
export function useActiveWorkspaceBoards(workspaceId: string) {
  return useQuery({
    queryKey: [...workspaceKeys.boards(workspaceId), 'active'],
    queryFn: () => workspaceService.getActiveWorkspaceBoards(workspaceId),
    enabled: !!workspaceId,
  })
}

/**
 * Hook to fetch archived boards in a workspace
 */
export function useArchivedWorkspaceBoards(workspaceId: string) {
  return useQuery({
    queryKey: [...workspaceKeys.boards(workspaceId), 'archived'],
    queryFn: () => workspaceService.getArchivedWorkspaceBoards(workspaceId),
    enabled: !!workspaceId,
  })
}

/**
 * Hook to move a board to a workspace
 */
export function useMoveBoardToWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      workspaceId,
    }: {
      boardId: string
      workspaceId: string | null
    }) => workspaceService.moveBoardToWorkspace(boardId, workspaceId),
    onSuccess: () => {
      // Invalidate all workspace boards
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      // Also invalidate boards list
      queryClient.invalidateQueries({ queryKey: ['routes', 'user-boards'] })
    },
  })
}

/**
 * Hook to archive a board
 */
export function useArchiveBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (boardId: string) => workspaceService.archiveBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      queryClient.invalidateQueries({ queryKey: ['routes', 'user-boards'] })
    },
  })
}

/**
 * Hook to restore an archived board
 */
export function useRestoreBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (boardId: string) => workspaceService.restoreBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      queryClient.invalidateQueries({ queryKey: ['routes', 'user-boards'] })
    },
  })
}

// ==================== WORKSPACE MEMBERS ====================

/**
 * Hook to fetch workspace members
 */
export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => workspaceService.getWorkspaceMembers(workspaceId),
    enabled: !!workspaceId,
  })
}

/**
 * Hook to add a workspace member
 */
export function useAddWorkspaceMember(workspaceId: string, addedBy: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      workspaceService.addWorkspaceMember(workspaceId, userId, role, addedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      })
    },
  })
}

/**
 * Hook to update member role
 */
export function useUpdateWorkspaceMemberRole(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      workspaceService.updateMemberRole(workspaceId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      })
    },
  })
}

/**
 * Hook to remove a workspace member
 */
export function useRemoveWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      workspaceService.removeWorkspaceMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      })
    },
  })
}

/**
 * Hook to get current user's role in workspace
 */
export function useUserWorkspaceRole(workspaceId: string, userId: string) {
  return useQuery({
    queryKey: [...workspaceKeys.members(workspaceId), 'role', userId],
    queryFn: () => workspaceService.getUserWorkspaceRole(workspaceId, userId),
    enabled: !!workspaceId && !!userId,
  })
}

// ==================== SEARCH ====================

/**
 * Hook to search workspaces
 */
export function useSearchWorkspaces(query: string) {
  return useQuery({
    queryKey: [...workspaceKeys.all, 'search', query],
    queryFn: () => workspaceService.searchWorkspaces(query),
    enabled: !!query && query.length >= 2,
  })
}
