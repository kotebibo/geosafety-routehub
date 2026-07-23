'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface WeekComment {
  id: string
  authorId: string | null
  authorName: string | null
  isMine: boolean
  body: string
  createdAt: string
}

/** Comments on an officer's week plan (officer + managers). */
export function useWeekComments(inspectorId: string, weekStart: string) {
  return useQuery({
    queryKey: ['week-comments', inspectorId, weekStart],
    queryFn: async (): Promise<WeekComment[]> => {
      const res = await fetch(
        `/api/routing/week-comments?inspectorId=${inspectorId}&weekStart=${weekStart}`
      )
      if (!res.ok) throw new Error('Failed to load comments')
      return (await res.json()).comments ?? []
    },
    enabled: !!inspectorId && !!weekStart,
    staleTime: 15_000,
  })
}

export function useAddWeekComment(inspectorId: string, weekStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch('/api/routing/week-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectorId, weekStart, body }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['week-comments', inspectorId, weekStart] }),
  })
}
