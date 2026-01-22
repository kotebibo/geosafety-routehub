/**
 * Stats Service
 * Fetches real-time statistics for dashboard display
 */

import { createClient } from '@/lib/supabase'

// Helper to get supabase client with current auth state
const getSupabase = () => createClient()

export interface DashboardStats {
  companies: number
  inspectors: number
  routes: number
  inspections: number
}

export const statsService = {
  /**
   * Get dashboard statistics
   * Returns counts for companies, inspectors, routes, and inspections
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const supabase = getSupabase()

    // Fetch all counts in parallel
    const [companiesResult, inspectorsResult, routesResult, inspectionsResult] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('inspectors').select('id', { count: 'exact', head: true }),
      supabase.from('routes').select('id', { count: 'exact', head: true }),
      // inspections might be stored as board items or a dedicated table
      // For now, count completed route stops as inspections
      supabase.from('route_stops').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    ])

    return {
      companies: companiesResult.count || 0,
      inspectors: inspectorsResult.count || 0,
      routes: routesResult.count || 0,
      inspections: inspectionsResult.count || 0,
    }
  },

  /**
   * Get detailed stats (for admin dashboard)
   */
  async getDetailedStats(): Promise<{
    companies: { total: number; active: number }
    inspectors: { total: number; active: number; onLeave: number }
    routes: { total: number; today: number }
    inspections: { total: number; todayCompleted: number }
  }> {
    const supabase = getSupabase()
    const today = new Date().toISOString().split('T')[0]

    const [
      companiesTotal,
      companiesActive,
      inspectorsTotal,
      inspectorsActive,
      inspectorsOnLeave,
      routesTotal,
      routesToday,
      inspectionsTotal,
      inspectionsToday,
    ] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('inspectors').select('id', { count: 'exact', head: true }),
      supabase.from('inspectors').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('inspectors').select('id', { count: 'exact', head: true }).eq('status', 'on_leave'),
      supabase.from('routes').select('id', { count: 'exact', head: true }),
      supabase.from('routes').select('id', { count: 'exact', head: true }).gte('date', today),
      supabase.from('route_stops').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('route_stops').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', today),
    ])

    return {
      companies: {
        total: companiesTotal.count || 0,
        active: companiesActive.count || 0,
      },
      inspectors: {
        total: inspectorsTotal.count || 0,
        active: inspectorsActive.count || 0,
        onLeave: inspectorsOnLeave.count || 0,
      },
      routes: {
        total: routesTotal.count || 0,
        today: routesToday.count || 0,
      },
      inspections: {
        total: inspectionsTotal.count || 0,
        todayCompleted: inspectionsToday.count || 0,
      },
    }
  },
}
