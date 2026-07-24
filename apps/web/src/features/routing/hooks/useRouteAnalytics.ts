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
  /** Fuel bought for objects the officer never reached this week (skipped/failed
   *  in an approved week) — the officer's fuel "debt". */
  wastedKm: number
  wastedLiters: number
  wastedCost: number
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

export interface WeekSlice {
  weekStart: string
  weekEnd: string
  fleet: {
    km: number
    liters: number
    cost: number
    minutes: number
    planning: number
    wastedCost: number
  }
  officers: OfficerWeekSummary[]
}
export interface MonthAnalytics {
  month: string
  weekStarts: string[]
  weeks: WeekSlice[]
  monthTotals: { km: number; liters: number; cost: number; minutes: number; wastedCost: number }
  globalPrices: FuelPrices
}

/** Per-week analytics slices for a whole month (YYYY-MM). Admin analytics page. */
export function useMonthAnalytics(month: string, enabled = true) {
  return useQuery({
    queryKey: ['route-analytics-month', month],
    queryFn: async (): Promise<MonthAnalytics> => {
      const res = await fetch(`/api/routing/analytics/month?month=${month}`)
      if (!res.ok) throw new Error('Failed to load month analytics')
      return res.json()
    },
    enabled: enabled && !!month,
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
      queryClient.invalidateQueries({ queryKey: ['route-analytics-month'] })
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
      queryClient.invalidateQueries({ queryKey: ['route-analytics-month'] })
    },
  })
}
