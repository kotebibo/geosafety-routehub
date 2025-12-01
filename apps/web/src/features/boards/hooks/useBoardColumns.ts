import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardsService } from '../services/boards.service'
import { queryKeys } from '@/lib/react-query'
import type { BoardColumn, BoardType } from '@/types/board'

/**
 * Hook to fetch board columns
 */
export function useBoardColumns(boardType: BoardType, boardId?: string, visibleOnly = false) {
  return useQuery({
    queryKey: boardId
      ? [...queryKeys.boardColumns.byType(boardType), boardId]
      : queryKeys.boardColumns.byType(boardType),
    queryFn: () =>
      visibleOnly
        ? boardsService.getVisibleColumns(boardType)
        : boardsService.getColumns(boardType, boardId),
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
    onSuccess: (updatedColumn) => {
      // Invalidate the board columns cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardColumns.byType(updatedColumn.board_type),
      })
    },
  })
}

/**
 * Hook to update multiple columns (for reordering/resizing)
 */
export function useUpdateColumns(boardType: BoardType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (columns: Array<{ id: string; position: number; width?: number }>) =>
      boardsService.updateColumns(columns),
    onMutate: async (newColumns) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.boardColumns.byType(boardType),
      })

      // Snapshot previous value
      const previousColumns = queryClient.getQueryData<BoardColumn[]>(
        queryKeys.boardColumns.byType(boardType)
      )

      // Optimistically update
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

        queryClient.setQueryData(
          queryKeys.boardColumns.byType(boardType),
          updatedColumns.sort((a, b) => a.position - b.position)
        )
      }

      return { previousColumns }
    },
    onError: (err, newColumns, context) => {
      // Rollback on error
      if (context?.previousColumns) {
        queryClient.setQueryData(
          queryKeys.boardColumns.byType(boardType),
          context.previousColumns
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardColumns.byType(boardType),
      })
    },
  })
}

/**
 * Hook to toggle column visibility
 */
export function useToggleColumnVisibility(boardType: BoardType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      columnId,
      isVisible,
    }: {
      columnId: string
      isVisible: boolean
    }) => boardsService.toggleColumnVisibility(columnId, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boardColumns.byType(boardType),
      })
    },
  })
}

/**
 * Hook to update column width
 */
export function useUpdateColumnWidth(boardType: BoardType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ columnId, width }: { columnId: string; width: number }) =>
      boardsService.updateColumnWidth(columnId, width),
    onMutate: async ({ columnId, width }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.boardColumns.byType(boardType),
      })

      // Snapshot previous value
      const previousColumns = queryClient.getQueryData<BoardColumn[]>(
        queryKeys.boardColumns.byType(boardType)
      )

      // Optimistically update
      if (previousColumns) {
        queryClient.setQueryData(
          queryKeys.boardColumns.byType(boardType),
          previousColumns.map((col) =>
            col.column_id === columnId ? { ...col, width } : col
          )
        )
      }

      return { previousColumns }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousColumns) {
        queryClient.setQueryData(
          queryKeys.boardColumns.byType(boardType),
          context.previousColumns
        )
      }
    },
  })
}
