import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardsService } from '../services/boards.service'
import { queryKeys } from '@/lib/react-query'
import type { BoardColumn, BoardType } from '@/types/board'

// Helper to get the column query key for a board
function columnQueryKey(boardType: BoardType, boardId?: string) {
  return boardId
    ? [...queryKeys.boardColumns.all, 'by-board', boardId]
    : queryKeys.boardColumns.byType(boardType)
}

/**
 * Hook to fetch board columns
 * When boardId is provided, uses boardId-based key so columns load in parallel with board metadata
 */
export function useBoardColumns(boardType: BoardType, boardId?: string, visibleOnly = false) {
  return useQuery({
    queryKey: columnQueryKey(boardType, boardId),
    queryFn: () =>
      visibleOnly
        ? boardsService.getVisibleColumns(boardType)
        : boardsService.getColumns(boardType, boardId),
    enabled: boardId ? !!boardId : true,
    staleTime: 5 * 60 * 1000, // 5 minutes - columns don't change often
  })
}

/**
 * Hook to update a single column
 */
export function useUpdateColumn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      columnId,
      updates,
    }: {
      columnId: string
      updates: Partial<BoardColumn>
    }) => boardsService.updateColumn(columnId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardColumns.all,
      })
    },
  })
}

/**
 * Hook to update multiple columns (for reordering/resizing)
 */
export function useUpdateColumns(boardType: BoardType, boardId?: string) {
  const queryClient = useQueryClient()
  const qk = columnQueryKey(boardType, boardId)

  return useMutation({
    mutationFn: (columns: Array<{ id: string; position: number; width?: number }>) =>
      boardsService.updateColumns(columns),
    onMutate: async (newColumns) => {
      await queryClient.cancelQueries({ queryKey: qk })

      const previousColumns = queryClient.getQueryData<BoardColumn[]>(qk)

      if (previousColumns) {
        const updatedColumns = previousColumns.map((col) => {
          const update = newColumns.find((c) => c.id === col.id)
          if (update) {
            return {
              ...col,
              position: update.position,
              width: update.width !== undefined ? update.width : col.width,
            }
          }
          return col
        })

        queryClient.setQueryData(qk, updatedColumns.sort((a, b) => a.position - b.position))
      }

      return { previousColumns }
    },
    onError: (err, newColumns, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(qk, context.previousColumns)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk })
    },
  })
}

/**
 * Hook to toggle column visibility
 */
export function useToggleColumnVisibility(boardType: BoardType, boardId?: string) {
  const queryClient = useQueryClient()
  const qk = columnQueryKey(boardType, boardId)

  return useMutation({
    mutationFn: ({
      columnId,
      isVisible,
    }: {
      columnId: string
      isVisible: boolean
    }) => boardsService.toggleColumnVisibility(columnId, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk })
    },
  })
}

/**
 * Hook to update column width
 */
export function useUpdateColumnWidth(boardType: BoardType, boardId?: string) {
  const queryClient = useQueryClient()
  const qk = columnQueryKey(boardType, boardId)

  return useMutation({
    mutationFn: ({ columnId, width }: { columnId: string; width: number }) =>
      boardsService.updateColumnWidth(columnId, width),
    onMutate: async ({ columnId, width }) => {
      await queryClient.cancelQueries({ queryKey: qk })

      const previousColumns = queryClient.getQueryData<BoardColumn[]>(qk)

      if (previousColumns) {
        queryClient.setQueryData(
          qk,
          previousColumns.map((col) =>
            col.column_id === columnId ? { ...col, width } : col
          )
        )
      }

      return { previousColumns }
    },
    onError: (err, variables, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(qk, context.previousColumns)
      }
    },
  })
}
