'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
  /** The officer's own price override (null → inherits the global price). */
  priceOverride: number | null
  /** Effective price used for cost (override ?? global). */
  fuelPrice: number | null
  cost: number | null
}

export interface RouteAnalytics {
  weekStart: string
  globalPrice: number | null
  officers: OfficerWeekSummary[]
}

/** Per-officer weekly plan summary (km, fuel, cost) for the admin analytics page. */
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

/** Global fuel price (₾/L) that officers inherit by default. */
export function useSetFuelPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (price: number | null) => {
      const res = await fetch('/api/routing/fuel-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-analytics'] })
    },
  })
}

/** Per-officer fuel-price override (null clears it → inherits global). */
export function useSetOfficerFuelPrice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ officerId, price }: { officerId: string; price: number | null }) => {
      const res = await fetch('/api/routing/officer-fuel-price', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId, price }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-analytics'] })
    },
  })
}
