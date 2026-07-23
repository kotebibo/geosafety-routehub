'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface WeekPlanStop {
  itemId: string
  position: number
  distanceFromPrevious: number | null
  status?: string
}
export interface WeekPlanDay {
  date: string
  km: number | null
  status?: string
  stops: WeekPlanStop[]
}
export type WeekPlanStatus = 'draft' | 'submitted' | 'approved'

export interface WeekPlanSnapshot {
  status: WeekPlanStatus
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  total_km: number | null
  fuel_liters: number | null
  fuel_cost: number | null
}

export interface WeekPlan {
  inspectorId: string
  weekStart: string
  status: WeekPlanStatus
  plan: WeekPlanSnapshot | null
  days: WeekPlanDay[]
}

export interface SaveWeekPlanInput {
  boardId: string
  inspectorId: string
  weekStart: string
  days: {
    date: string
    km?: number
    stops: { itemId: string; position: number; distanceFromPrevious?: number }[]
  }[]
}

/** The saved plan for an officer's week (used to prefill the planner + manager view). */
export function useWeekPlan(inspectorId: string, weekStart: string) {
  return useQuery({
    queryKey: ['week-plan', inspectorId, weekStart],
    queryFn: async (): Promise<WeekPlan> => {
      const res = await fetch(
        `/api/routing/week-plan?inspectorId=${inspectorId}&weekStart=${weekStart}`
      )
      if (!res.ok) throw new Error('Failed to load week plan')
      return res.json()
    },
    enabled: !!inspectorId && !!weekStart,
    staleTime: 30_000,
  })
}

export function useSaveWeekPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveWeekPlanInput) => {
      const res = await fetch('/api/routing/week-plan', {
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['week-plan', variables.inspectorId, variables.weekStart],
      })
    },
  })
}

/** Advance the week plan lifecycle: submit (officer) / approve|reopen (admin). */
export function useWeekPlanAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      inspectorId: string
      weekStart: string
      action: 'submit' | 'approve' | 'reopen'
    }) => {
      const res = await fetch('/api/routing/week-plan', {
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['week-plan', variables.inspectorId, variables.weekStart],
      })
      // submit/approve/reopen shows in the admin requests tab (admin-week), both
      // analytics views and the change history — refresh all so the list/metrics
      // update immediately, not after a refresh.
      queryClient.invalidateQueries({ queryKey: ['route-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['route-analytics-month'] })
      queryClient.invalidateQueries({ queryKey: ['admin-week'] })
      queryClient.invalidateQueries({ queryKey: ['routing-audit'] })
    },
  })
}
