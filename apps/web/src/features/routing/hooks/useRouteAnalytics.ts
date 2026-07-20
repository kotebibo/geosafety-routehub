'use client'

import { useQuery } from '@tanstack/react-query'

export interface OfficerWeekSummary {
  officerId: string
  name: string
  email: string
  totalKm: number
  days: number
  stopCount: number
  visitedCount: number
  consumption: number | null
  liters: number | null
}

export interface RouteAnalytics {
  weekStart: string
  officers: OfficerWeekSummary[]
}

/** Per-officer weekly plan summary (km + fuel) for the admin analytics page. */
export function useRouteAnalytics(weekStart: string) {
  return useQuery({
    queryKey: ['route-analytics', weekStart],
    queryFn: async (): Promise<RouteAnalytics> => {
      const res = await fetch(`/api/routing/analytics?weekStart=${weekStart}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      return res.json()
    },
    enabled: !!weekStart,
    staleTime: 30_000,
  })
}
