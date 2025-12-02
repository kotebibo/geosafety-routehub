import { getSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Company = Database['public']['Tables']['companies']['Row']
type Route = Database['public']['Tables']['routes']['Row']
type Inspector = Database['public']['Tables']['inspectors']['Row']
type RouteStop = Database['public']['Tables']['route_stops']['Row']

export class RoutesService {
  // Use any type for supabase to bypass strict table typings
  private supabase = getSupabase() as any

  async getRoutes(date?: string) {
    const query = this.supabase
      .from('routes')
      .select(`
        *,
        inspector:inspectors(id, full_name, email),
        route_stops(
          *,
          company:companies(*)
        )
      `)
      .order('date', { ascending: false })

    if (date) {
      query.eq('date', date)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async getRoute(id: string) {
    const { data, error } = await this.supabase
      .from('routes')
      .select(`
        *,
        inspector:inspectors(*),
        route_stops(
          *,
          company:companies(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createRoute(route: Partial<Route>) {
    const { data, error } = await this.supabase
      .from('routes')
      .insert(route)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateRoute(id: string, updates: Partial<Route>) {
    const { data, error } = await this.supabase
      .from('routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteRoute(id: string) {
    const { error } = await this.supabase
      .from('routes')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async addStopToRoute(routeId: string, companyId: string, position: number) {
    const { data, error } = await this.supabase
      .from('route_stops')
      .insert({
        route_id: routeId,
        company_id: companyId,
        position,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateStopStatus(stopId: string, status: RouteStop['status']) {
    const { data, error } = await this.supabase
      .from('route_stops')
      .update({ 
        status,
        actual_arrival_time: status === 'in_progress' ? new Date().toISOString() : undefined,
        actual_departure_time: status === 'completed' ? new Date().toISOString() : undefined
      })
      .eq('id', stopId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async optimizeRoute(companyIds: string[]) {
    // This would call your optimization API
    // For now, returning a simple ordered list
    return companyIds
  }
}

export const routesService = new RoutesService()