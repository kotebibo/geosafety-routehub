'use client'

import { useQuery } from '@tanstack/react-query'

export interface WeekExecutionEntry {
  boardItemId: string
  name: string | null
  /** YYYY-MM-DD — the visit date (unplanned) or the planned day (missed). */
  date: string
}

export interface WeekExecution {
  weekStart: string
  /** Check-ins this week on this board that weren't in the plan. */
  unplannedVisits: WeekExecutionEntry[]
  /** Planned stops this week not yet visited. */
  missedPlanned: WeekExecutionEntry[]
}

/** Execution-vs-plan for one officer + board in a week (planner side panels). */
export function useWeekExecution(inspectorId: string, boardId: string, weekStart: string) {
  return useQuery({
    queryKey: ['week-execution', inspectorId, boardId, weekStart],
    queryFn: async (): Promise<WeekExecution> => {
      const res = await fetch(
        `/api/routing/week-execution?inspectorId=${inspectorId}&boardId=${boardId}&weekStart=${weekStart}`
      )
      if (!res.ok) throw new Error('Failed to load week execution')
      return res.json()
    },
    enabled: !!inspectorId && !!boardId && !!weekStart,
    staleTime: 15_000,
  })
}
