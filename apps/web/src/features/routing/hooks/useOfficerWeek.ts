'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type SkipReason = 'empty' | 'closed' | 'refused' | 'canceled' | 'other'

export interface UnplannedRow {
  id: string
  number: number
  boardItemId: string | null
  name: string | null
  date: string
  distanceKm: number | null
  reason: string | null
  status: 'requested' | 'approved' | 'rejected'
}
export interface StopExtraRow {
  stopId: string
  boardItemId: string | null
  name: string | null
  date: string
  reason: SkipReason | null
  note: string | null
  confirmed: boolean
}
export interface OfficerWeek {
  inspectorId: string
  weekStart: string
  unplanned: UnplannedRow[]
  deviation: StopExtraRow[]
  failed: StopExtraRow[]
}

/** One officer's routing extras (unplanned / deviation / failed) for a week. */
export function useOfficerWeek(inspectorId: string, weekStart: string) {
  return useQuery({
    queryKey: ['officer-week', inspectorId, weekStart],
    queryFn: async (): Promise<OfficerWeek> => {
      const res = await fetch(
        `/api/routing/officer-week?inspectorId=${inspectorId}&weekStart=${weekStart}`
      )
      if (!res.ok) throw new Error('Failed to load officer week')
      return res.json()
    },
    enabled: !!inspectorId && !!weekStart,
    staleTime: 15_000,
  })
}

/** Admin confirms an "object canceled" deferral → counts as legit (not failed). */
export function useConfirmCancel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (stopId: string) => {
      const res = await fetch(`/api/routing/stops/${stopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCancel: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officer-week'] })
      queryClient.invalidateQueries({ queryKey: ['admin-week'] })
      queryClient.invalidateQueries({ queryKey: ['routing-audit'] })
    },
  })
}
