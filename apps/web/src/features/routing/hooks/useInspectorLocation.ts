'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useUpdateBoard } from '@/features/boards/hooks'
import type { Board, RoutingStartLocation } from '@/types/board'

/**
 * Reads and persists the inspector's starting location for a board.
 * Stored in board.settings.routing_start (JSONB — no migration needed) so it
 * survives reloads and is visible to managers viewing the same board.
 */
export function useInspectorLocation(board: Board) {
  const { user } = useAuth()
  const updateBoard = useUpdateBoard(board.id, user?.id || '')

  const start = board.settings?.routing_start ?? null

  const save = (loc: Omit<RoutingStartLocation, 'updated_at'>) =>
    updateBoard.mutateAsync({
      settings: {
        ...board.settings,
        routing_start: { ...loc, updated_at: new Date().toISOString() },
      },
    })

  const clear = () => {
    const next = { ...board.settings }
    delete next.routing_start
    return updateBoard.mutateAsync({ settings: next })
  }

  return { start, save, clear, isSaving: updateBoard.isPending }
}
