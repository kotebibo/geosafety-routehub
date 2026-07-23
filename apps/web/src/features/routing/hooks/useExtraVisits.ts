'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type ExtraVisitStatus = 'requested' | 'approved' | 'rejected'

export interface ExtraVisit {
  id: string
  number: number
  boardItemId: string | null
  name: string | null
  date: string
  distanceKm: number | null
  reason: string | null
  status: ExtraVisitStatus
}

/** An officer's extra (unplanned) visits for a week. */
export function useExtraVisits(inspectorId: string, weekStart: string) {
  return useQuery({
    queryKey: ['extra-visits', inspectorId, weekStart],
    queryFn: async (): Promise<ExtraVisit[]> => {
      const res = await fetch(
        `/api/routing/extra-visits?inspectorId=${inspectorId}&weekStart=${weekStart}`
      )
      if (!res.ok) throw new Error('Failed to load extra visits')
      return (await res.json()).visits ?? []
    },
    enabled: !!inspectorId && !!weekStart,
    staleTime: 15_000,
  })
}

interface CreateExtraVisitInput {
  inspectorId: string
  weekStart: string
  boardId?: string | null
  boardItemId: string
  visitDate: string
  distanceKm?: number | null
  reason?: string | null
}

/** Request an extra visit (officer own, or admin on their behalf). */
export function useCreateExtraVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateExtraVisitInput) => {
      const res = await fetch('/api/routing/extra-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: (_data, v) => {
      queryClient.invalidateQueries({ queryKey: ['extra-visits', v.inspectorId, v.weekStart] })
      // The visible "unplanned" lists read officer-week / admin-week, so refresh
      // those too — otherwise a booked visit only shows after a manual refresh.
      queryClient.invalidateQueries({ queryKey: ['officer-week'] })
      queryClient.invalidateQueries({ queryKey: ['admin-week'] })
      queryClient.invalidateQueries({ queryKey: ['routing-audit'] })
    },
  })
}

/** Admin approves/rejects an extra-visit request. */
export function useReviewExtraVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; action: 'approve' | 'reject' }) => {
      const res = await fetch('/api/routing/extra-visits', {
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
      queryClient.invalidateQueries({ queryKey: ['extra-visits'] })
      // Approve/reject is shown in the admin requests tab (admin-week) and the
      // per-officer popup (officer-week) — refresh both immediately.
      queryClient.invalidateQueries({ queryKey: ['admin-week'] })
      queryClient.invalidateQueries({ queryKey: ['officer-week'] })
      queryClient.invalidateQueries({ queryKey: ['routing-audit'] })
    },
  })
}
