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
export interface WeekPlan {
  inspectorId: string
  weekStart: string
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
