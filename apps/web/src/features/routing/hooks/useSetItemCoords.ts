'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'

export interface SetItemCoordsInput {
  itemId: string
  coordsColumnId: string
  lat: number
  lng: number
}

/**
 * Writes a coordinate into a board item's coordinates column via the server
 * (service client), so board_items RLS doesn't drop the update. Invalidates the
 * board's item list so the planner/detail views pick up the new coordinate.
 */
export function useSetItemCoords(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SetItemCoordsInput) => {
      const res = await fetch('/api/routing/item-coords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-items', boardId],
      })
    },
  })
}
