/**
 * Tracking Service
 * Fetches active inspector locations and location history
 * Uses client-side Supabase (reads auth from localStorage, not cookies)
 */

import { createClient } from '@/lib/supabase'

const getDb = () => createClient()

export interface ActiveInspector {
  id: string
  full_name: string
  phone: string | null
  lat: number
  lng: number
  last_location_update: string
  active_route: {
    id: string
    name: string | null
    status: string
    total_stops: number
    completed_stops: number
  } | null
}

export interface LocationPoint {
  lat: number
  lng: number
  recorded_at: string
  accuracy: number | null
  speed: number | null
}

export const trackingService = {
  getActiveInspectors: async (): Promise<ActiveInspector[]> => {
    const supabase = getDb()
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const today = new Date().toISOString().split('T')[0]

    // Get inspectors with recent location updates
    const { data: inspectors, error: inspError } = await supabase
      .from('inspectors')
      .select('id, full_name, phone, last_location_update')
      .not('last_location_update', 'is', null)
      .gte('last_location_update', thirtyMinAgo)
      .eq('status', 'active')
      .returns<{ id: string; full_name: string; phone: string | null; last_location_update: string }[]>()

    if (inspError) throw inspError
    if (!inspectors?.length) return []

    const result: ActiveInspector[] = []

    for (const inspector of inspectors) {
      // Get latest location from history
      const { data: latestLocData } = await supabase
        .from('inspector_location_history')
        .select('lat, lng')
        .eq('inspector_id', inspector.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()
        .returns<{ lat: number; lng: number }>()
      const latestLoc = latestLocData as { lat: number; lng: number } | null

      if (!latestLoc) continue

      // Get active route for today
      const { data: routeData } = await supabase
        .from('routes')
        .select('id, name, status')
        .eq('inspector_id', inspector.id)
        .eq('date', today)
        .in('status', ['planned', 'in_progress'])
        .limit(1)
        .single()
        .returns<{ id: string; name: string | null; status: string }>()
      const route = routeData as { id: string; name: string | null; status: string } | null

      let activeRoute: ActiveInspector['active_route'] = null

      if (route) {
        // Get stop counts for the route
        const { count: totalStops } = await supabase
          .from('route_stops')
          .select('*', { count: 'exact', head: true })
          .eq('route_id', route.id)

        const { count: completedStops } = await supabase
          .from('route_stops')
          .select('*', { count: 'exact', head: true })
          .eq('route_id', route.id)
          .eq('status', 'completed')

        activeRoute = {
          id: route.id,
          name: route.name,
          status: route.status,
          total_stops: totalStops || 0,
          completed_stops: completedStops || 0,
        }
      }

      result.push({
        id: inspector.id,
        full_name: inspector.full_name,
        phone: inspector.phone,
        lat: latestLoc.lat,
        lng: latestLoc.lng,
        last_location_update: inspector.last_location_update,
        active_route: activeRoute,
      })
    }

    return result
  },

  getLocationHistory: async (inspectorId: string, since: string): Promise<LocationPoint[]> => {
    const supabase = getDb()
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('inspector_location_history')
      .select('lat, lng, recorded_at, accuracy, speed')
      .eq('inspector_id', inspectorId)
      .gte('recorded_at', sinceDate)
      .order('recorded_at', { ascending: true })
      .returns<LocationPoint[]>()

    if (error) throw error
    return data || []
  },
}
