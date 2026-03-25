/**
 * Board Analytics Service
 * Fetches aggregate data from board items for financial analytics
 */

import { createClient } from '@/lib/supabase'

const getDb = () => createClient() as any

export interface BoardAnalyticsKPI {
  totalInspectors: number
  totalLocations: number
  totalRevenue: number
  avgRevenuePerLocation: number
}

export interface InspectorRevenue {
  name: string
  locations: number
  total_amount: number
  pct_amount: number
}

export interface TopLocation {
  name: string
  inspector: string
  amount: number
}

interface BoardRow {
  id: string
  name: string
  data: Record<string, any>
  group_id?: string
}

interface GroupRow {
  id: string
  name: string
}

export const boardAnalyticsService = {
  findSummaryBoard: async (): Promise<string | null> => {
    const db = getDb()
    const { data } = await db
      .from('boards')
      .select('id')
      .eq('name', 'შემაჯამებელი')
      .limit(1)
      .single()
    return (data as any)?.id || null
  },

  findLocationsBoard: async (): Promise<string | null> => {
    const db = getDb()
    const { data } = await db
      .from('boards')
      .select('id')
      .eq('name', 'ინსპექტორები / ლოკაციები')
      .limit(1)
      .single()
    return (data as any)?.id || null
  },

  getKPIs: async (): Promise<BoardAnalyticsKPI> => {
    const boardId = await boardAnalyticsService.findSummaryBoard()
    if (!boardId) {
      return { totalInspectors: 0, totalLocations: 0, totalRevenue: 0, avgRevenuePerLocation: 0 }
    }

    const db = getDb()
    const { data: items, error } = await db
      .from('board_items')
      .select('name, data')
      .eq('board_id', boardId)

    if (error) throw error

    const rows = (items || []) as BoardRow[]
    let totalLocations = 0
    let totalRevenue = 0

    for (const item of rows) {
      totalLocations += item.data?.locations || 0
      totalRevenue += item.data?.total_amount || 0
    }

    return {
      totalInspectors: rows.length,
      totalLocations,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRevenuePerLocation:
        totalLocations > 0 ? Math.round((totalRevenue / totalLocations) * 100) / 100 : 0,
    }
  },

  getInspectorRevenue: async (): Promise<InspectorRevenue[]> => {
    const boardId = await boardAnalyticsService.findSummaryBoard()
    if (!boardId) return []

    const db = getDb()
    const { data: items, error } = await db
      .from('board_items')
      .select('name, data')
      .eq('board_id', boardId)

    if (error) throw error

    return ((items || []) as BoardRow[])
      .map(item => ({
        name: item.name,
        locations: item.data?.locations || 0,
        total_amount: item.data?.total_amount || 0,
        pct_amount: item.data?.pct_amount || 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
  },

  getTopLocations: async (limit: number = 15): Promise<TopLocation[]> => {
    const boardId = await boardAnalyticsService.findLocationsBoard()
    if (!boardId) return []

    const db = getDb()

    const { data: groups } = await db
      .from('board_groups')
      .select('id, name')
      .eq('board_id', boardId)

    const groupMap = new Map(((groups || []) as GroupRow[]).map(g => [g.id, g.name]))

    const { data: items, error } = await db
      .from('board_items')
      .select('name, data, group_id')
      .eq('board_id', boardId)

    if (error) throw error

    return ((items || []) as BoardRow[])
      .map(item => ({
        name: item.name,
        inspector: groupMap.get(item.group_id || '') || 'უცნობი',
        amount: item.data?.col_20 || 0,
      }))
      .filter(l => l.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
  },
}
