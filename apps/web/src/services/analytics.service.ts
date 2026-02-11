/**
 * Analytics Service
 * Fetches aggregate data for the analytics dashboard
 */

import { createClient } from '@/lib/supabase'

const getDb = () => createClient()

export interface AnalyticsKPI {
  totalCompanies: number
  activeInspectors: number
  routesThisMonth: number
  completionRate: number
}

export interface RoutesByDay {
  date: string
  planned: number
  completed: number
  cancelled: number
}

export interface InspectorWorkload {
  inspector_id: string
  full_name: string
  route_count: number
  stop_count: number
}

export interface RouteStatusBreakdown {
  status: string
  count: number
}

export interface TopCompany {
  company_id: string
  name: string
  inspection_count: number
}

export interface OverdueInspection {
  company_id: string
  company_name: string
  service_type_name: string
  next_inspection_date: string
  days_overdue: number
}

export interface WeeklyDistance {
  week_start: string
  total_distance_km: number
}

export const analyticsService = {
  getKPIs: async (): Promise<AnalyticsKPI> => {
    const db = getDb()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    const [companies, inspectors, routesMonth, completedStops, totalStops] = await Promise.all([
      db.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('inspectors').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('routes').select('id', { count: 'exact', head: true }).gte('date', monthStart),
      db.from('route_stops').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      db.from('route_stops').select('id', { count: 'exact', head: true }),
    ])

    const total = totalStops.count || 0
    const completed = completedStops.count || 0

    return {
      totalCompanies: companies.count || 0,
      activeInspectors: inspectors.count || 0,
      routesThisMonth: routesMonth.count || 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  },

  getRoutesByDay: async (days: number = 30): Promise<RoutesByDay[]> => {
    const db = getDb()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await db
      .from('routes')
      .select('date, status')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date')
      .returns<{ date: string; status: string | null }[]>()

    if (error) throw error

    const grouped: Record<string, RoutesByDay> = {}
    for (const route of data || []) {
      if (!grouped[route.date]) {
        grouped[route.date] = { date: route.date, planned: 0, completed: 0, cancelled: 0 }
      }
      if (route.status === 'completed') grouped[route.date].completed++
      else if (route.status === 'cancelled') grouped[route.date].cancelled++
      else grouped[route.date].planned++
    }

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
  },

  getInspectorWorkload: async (): Promise<InspectorWorkload[]> => {
    const db = getDb()
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartStr = monthStart.toISOString().split('T')[0]

    // Only fetch inspector_id (not nested stops) for route counting
    const { data: routes, error } = await db
      .from('routes')
      .select('id, inspector_id')
      .gte('date', monthStartStr)
      .not('inspector_id', 'is', null)
      .returns<{ id: string; inspector_id: string | null }[]>()

    if (error) throw error

    const { data: inspectors } = await db
      .from('inspectors')
      .select('id, full_name')
      .eq('status', 'active')
      .returns<{ id: string; full_name: string }[]>()

    const nameMap = new Map((inspectors || []).map(i => [i.id, i.full_name]))

    // Group routes by inspector
    const workload: Record<string, InspectorWorkload & { routeIds: string[] }> = {}
    for (const route of routes || []) {
      if (!route.inspector_id) continue
      if (!workload[route.inspector_id]) {
        workload[route.inspector_id] = {
          inspector_id: route.inspector_id,
          full_name: nameMap.get(route.inspector_id) || 'Unknown',
          route_count: 0,
          stop_count: 0,
          routeIds: [],
        }
      }
      workload[route.inspector_id].route_count++
      workload[route.inspector_id].routeIds.push(route.id)
    }

    // Count stops per inspector's routes in parallel
    const entries = Object.values(workload)
    const stopCounts = await Promise.all(
      entries.map(w =>
        db.from('route_stops').select('id', { count: 'exact', head: true })
          .in('route_id', w.routeIds)
      )
    )

    return entries
      .map((w, i) => ({
        inspector_id: w.inspector_id,
        full_name: w.full_name,
        route_count: w.route_count,
        stop_count: stopCounts[i].count || 0,
      }))
      .sort((a, b) => b.route_count - a.route_count)
  },

  getRouteStatusBreakdown: async (): Promise<RouteStatusBreakdown[]> => {
    const db = getDb()
    const statuses = ['planned', 'in_progress', 'completed', 'cancelled'] as const

    const results = await Promise.all(
      statuses.map(status =>
        db.from('routes').select('id', { count: 'exact', head: true }).eq('status', status)
      )
    )

    return statuses
      .map((status, i) => ({ status, count: results[i].count || 0 }))
      .filter(r => r.count > 0)
  },

  getTopCompanies: async (limit: number = 10): Promise<TopCompany[]> => {
    const db = getDb()

    // Get companies with their completed stop counts using a bounded query
    const { data: companies, error: compError } = await db
      .from('companies')
      .select('id, name')
      .eq('status', 'active')
      .limit(200)
      .returns<{ id: string; name: string }[]>()

    if (compError) throw compError

    // Count completed stops per company in parallel (capped at 50 companies to limit queries)
    const companySubset = (companies || []).slice(0, 50)
    const counts = await Promise.all(
      companySubset.map(c =>
        db.from('route_stops').select('id', { count: 'exact', head: true })
          .eq('company_id', c.id).eq('status', 'completed')
      )
    )

    return companySubset
      .map((c, i) => ({ company_id: c.id, name: c.name, inspection_count: counts[i].count || 0 }))
      .filter(c => c.inspection_count > 0)
      .sort((a, b) => b.inspection_count - a.inspection_count)
      .slice(0, limit)
  },

  getOverdueInspections: async (): Promise<OverdueInspection[]> => {
    const db = getDb()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await db
      .from('company_services')
      .select('company_id, next_inspection_date, company:companies(name), service_type:service_types(name)')
      .lt('next_inspection_date', today)
      .eq('status', 'active')
      .not('next_inspection_date', 'is', null)
      .order('next_inspection_date')
      .limit(20)
      .returns<{ company_id: string; next_inspection_date: string | null; company: { name: string } | null; service_type: { name: string } | null }[]>()

    if (error) throw error

    return (data || []).map(item => {
      const nextDate = new Date(item.next_inspection_date!)
      const daysOverdue = Math.floor((Date.now() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        company_id: item.company_id,
        company_name: item.company?.name || 'Unknown',
        service_type_name: item.service_type?.name || 'Unknown',
        next_inspection_date: item.next_inspection_date!,
        days_overdue: daysOverdue,
      }
    })
  },

  getWeeklyDistance: async (weeks: number = 8): Promise<WeeklyDistance[]> => {
    const db = getDb()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeks * 7)

    const { data, error } = await db
      .from('routes')
      .select('date, total_distance_km')
      .gte('date', startDate.toISOString().split('T')[0])
      .not('total_distance_km', 'is', null)
      .order('date')
      .returns<{ date: string; total_distance_km: number | null }[]>()

    if (error) throw error

    const weeksMap: Record<string, number> = {}
    for (const route of data || []) {
      const d = new Date(route.date)
      const dayOfWeek = d.getDay()
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - dayOfWeek)
      const key = weekStart.toISOString().split('T')[0]
      weeksMap[key] = (weeksMap[key] || 0) + (route.total_distance_km || 0)
    }

    return Object.entries(weeksMap)
      .map(([week_start, total_distance_km]) => ({ week_start, total_distance_km: Math.round(total_distance_km) }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start))
  },
}
