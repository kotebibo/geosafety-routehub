import { supabase } from '@/lib/supabase/client'

// Use 'any' type assertion to avoid TypeScript inference issues with Supabase generated types
const db = supabase as any

export const routesService = {
  getAll: async () => {
    const { data, error } = await db
      .from('routes')
      .select('*')
      .order('date', { ascending: true })

    if (error) throw error
    return data
  },

  getByInspector: async (inspectorId: string) => {
    const { data, error } = await db
      .from('routes')
      .select('*')
      .eq('inspector_id', inspectorId)
      .order('date', { ascending: true })

    if (error) throw error
    return data
  },

  getById: async (id: string) => {
    const { data, error } = await db
      .from('routes')
      .select(`
        *,
        route_stops (
          *,
          company:companies (
            id,
            name,
            address,
            lat,
            lng
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  create: async (routeData: {
    name: string
    inspector_id: string
    date: string  // Changed from scheduled_date
    start_time: string
    stops: any[]
    total_distance: number
    route_geometry?: any
    notes?: string
  }) => {
    // Create the route first
    const { data: route, error: routeError } = await db
      .from('routes')
      .insert({
        name: routeData.name,
        inspector_id: routeData.inspector_id,
        date: routeData.date,
        start_time: routeData.start_time,
        status: 'planned',
        total_distance_km: routeData.total_distance,
        route_geometry: routeData.route_geometry,
      })
      .select()
      .single()

    if (routeError) throw routeError

    // Create route stops
    if (routeData.stops && routeData.stops.length > 0) {
      const stops = routeData.stops.map((stop: any, index: number) => ({
        route_id: route.id,
        company_id: stop.company.id,
        position: index + 1,  // Changed from stop_order
        scheduled_arrival_time: routeData.start_time,
        status: 'pending',
      }))

      const { error: stopsError } = await db
        .from('route_stops')
        .insert(stops)

      if (stopsError) throw stopsError
    }

    return route
  },

  update: async (id: string, updates: any) => {
    const { data, error } = await db
      .from('routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  delete: async (id: string) => {
    const { error } = await db
      .from('routes')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  reassign: async (routeId: string, newInspectorId: string) => {
    const { data, error } = await db
      .from('routes')
      .update({ inspector_id: newInspectorId })
      .eq('id', routeId)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
