'use client'

import { useMutation } from '@tanstack/react-query'

export interface OptimizeLocation {
  id: string
  name: string
  lat: number
  lng: number
}

export interface OptimizedStop {
  id: string
  name: string
  lat: number
  lng: number
  position: number
  distanceFromPrevious: number // km
}

export interface OptimizedRouteResult {
  stops: OptimizedStop[]
  totalDistance: number // km
  originalDistance: number
  improvement: number // %
  algorithm: string
  metadata: {
    usingRealRoads: boolean
    routeGeometry?: number[][] | null // [lng, lat] pairs
  }
}

/**
 * Optimizes stop order via the existing /api/routes/optimize endpoint
 * (Nearest Neighbor + 2-opt, OSRM real roads with Haversine fallback).
 * The caller passes the inspector's start location as the FIRST location —
 * the optimizer keeps index 0 fixed, so stops[0] is always the start.
 */
export function useRouteOptimizer() {
  return useMutation({
    mutationFn: async (locations: OptimizeLocation[]): Promise<OptimizedRouteResult> => {
      const res = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations, options: { useRealRoads: true } }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { ...err, status: res.status }
      }
      const data = await res.json()
      return data.route as OptimizedRouteResult
    },
  })
}
