'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type FuelType = 'petrol' | 'diesel' | 'gas'
export type FuelPrices = Record<FuelType, number | null>

export interface OfficerWeekSummary {
  officerId: string
  name: string
  email: string
  totalKm: number
  days: number
  stopCount: number
  visitedCount: number
  minutes: number
  consumption: number | null
  liters: number | null
  /** The officer's fuel type (drives which global price applies). */
  fuelType: FuelType | null
  /** The officer's own price override (null → inherits the type's global price). */
  priceOverride: number | null
  /** Effective price used for cost (override ?? global price for the type). */
  fuelPrice: number | null
  cost: number | null
}

export interface RouteAnalytics {
  weekStart: string
  globalPrices: FuelPrices
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

export interface WeekRequest {
  inspectorId: string
  name: string | null
  weekStart: string
  submittedAt: string | null
  totalKm: number
}
export interface AdminUnplanned {
  id: string
  inspectorId: string
  officerName: string | null
  boardItemId: string | null
  objectName: string | null
  date: string
  distanceKm: number | null
  reason: string | null
  status: 'requested' | 'approved' | 'rejected'
}
export interface AdminDeferred {
  stopId: string
  inspectorId: string
  officerName: string | null
  boardItemId: string | null
  objectName: string | null
  date: string
  reason: string | null
  note: string | null
  deferredAt: string | null
}
export interface AdminWeek {
  weekStart: string
  requests: WeekRequest[]
  unplanned: AdminUnplanned[]
  deferred: AdminDeferred[]
}

/** Admin/dispatcher work queue for a week: requests, unplanned, deferred. */
export function useAdminWeek(weekStart: string) {
  return useQuery({
    queryKey: ['admin-week', weekStart],
    queryFn: async (): Promise<AdminWeek> => {
      const res = await fetch(`/api/routing/admin-week?weekStart=${weekStart}`)
      if (!res.ok) throw new Error('Failed to load admin week')
      return res.json()
    },
    enabled: !!weekStart,
    staleTime: 15_000,
  })
}

/** Global fuel prices per type (₾/L) that officers inherit by fuel type. */
export function useSetFuelPrices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (prices: FuelPrices) => {
      const res = await fetch('/api/routing/fuel-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prices),
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
