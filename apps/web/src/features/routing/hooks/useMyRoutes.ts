'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type RouteStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'
export type StopStatus = 'pending' | 'visited' | 'skipped'

export interface RouteStop {
  id: string
  position: number
  status: StopStatus | null
  distanceFromPrevious: number | null
  boardItemId: string | null
  name: string | null
}
export interface OfficerRoute {
  id: string
  name: string | null
  date: string
  status: RouteStatus | null
  startTime: string | null
  endTime: string | null
  totalDistanceKm: number | null
  stops: RouteStop[]
}

/** An officer's planned/in-progress/completed routes (managers may pass any id). */
export function useMyRoutes(inspectorId: string) {
  return useQuery({
    queryKey: ['my-routes', inspectorId],
    queryFn: async (): Promise<OfficerRoute[]> => {
      const res = await fetch(`/api/routing/my-routes?inspectorId=${inspectorId}`)
      if (!res.ok) throw new Error('Failed to load routes')
      const data = await res.json()
      return data.routes as OfficerRoute[]
    },
    enabled: !!inspectorId,
    staleTime: 15_000,
  })
}

export function useUpdateRouteStatus(inspectorId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ routeId, status }: { routeId: string; status: RouteStatus }) => {
      const res = await fetch(`/api/routing/routes/${routeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-routes', inspectorId] })
    },
  })
}

export function useUpdateStopStatus(inspectorId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ stopId, status }: { stopId: string; status: StopStatus }) => {
      const res = await fetch(`/api/routing/stops/${stopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-routes', inspectorId] })
    },
  })
}
