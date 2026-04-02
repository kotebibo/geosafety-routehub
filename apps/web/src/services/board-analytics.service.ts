/**
 * Board Analytics Service
 * Fetches aggregate data from board items for the financial analytics dashboard.
 * Data sources:
 *   - კომპანიები board: parent companies with contract data
 *   - ინსპექტორები / ლოკაციები board: locations grouped by inspector
 *   - შემაჯამებელი board: pre-aggregated inspector totals
 *
 * Column mappings from კომპანიები board:
 *   status  = service type (სტატუსი)
 *   start_date  = contract start date
 *   end_date  = contract end date
 *   monthly = monthly amount (ყოველთვიური)
 *   payment_method = payment method (გადახდის წესი)
 *   invoice_amount = invoice amount
 *   act_amount = act amount (აქტების თანხა)
 *   vat = VAT (დღგ)
 *   sales_manager = sales manager
 */

import { createClient } from '@/lib/supabase'

const getDb = () => createClient() as any

// ── Types ──

export interface GlobalKPI {
  totalRevenue: number
  activeContracts: number
  totalLocations: number
  avgRevenuePerCompany: number
}

export interface InspectorSummary {
  name: string
  locations: number
  total_amount: number
  pct_amount: number
}

export interface ServiceTypeRevenue {
  service_type: string
  revenue: number
  count: number
  pct: number
}

export interface MonthlyTrend {
  month: string
  revenue: number
  new_contracts: number
}

export interface PaymentMethodBreakdown {
  method: string
  count: number
}

export interface TopCompanyRevenue {
  name: string
  amount: number
  end_date: string | null
  days_until_expiry: number | null
}

export interface TopLocation {
  name: string
  inspector: string
  amount: number
}

export interface InspectorScatter {
  name: string
  locations: number
  revenue: number
}

export interface ExpiringContract {
  name: string
  inspector: string
  amount: number
  end_date: string
  days_remaining: number
  payment_method: string
  service_type: string
}

export interface CompanyRow {
  name: string
  locations: number
  inspector: string
  service_type: string
  monthly: number
  invoice: number
  vat: number
  payment_method: string
  start_date: string | null
  end_date: string | null
}

export interface ValueBucket {
  bucket: string
  count: number
}

export interface ExpiryMonth {
  month: string
  count: number
  urgency: 'red' | 'amber' | 'green'
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

// ── Helpers ──

function findBoard(name: string): Promise<string | null> {
  return getDb()
    .from('boards')
    .select('id')
    .eq('name', name)
    .limit(1)
    .maybeSingle()
    .then(({ data }: any) => (data as any)?.id || null)
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatServiceType(raw: string | null): string {
  if (!raw) return 'უცნობი'
  return raw.replace(/_/g, ' ').replace(/და/g, '& ').trim()
}

function formatPaymentMethod(raw: string | null): string {
  if (!raw) return 'უცნობი'
  return raw.replace(/_/g, ' ').trim()
}

// ── Service ──

export const boardAnalyticsService = {
  /**
   * Load all source data once. Other methods derive from this.
   */
  loadCompaniesBoard: async (): Promise<BoardRow[]> => {
    const boardId = await findBoard('კომპანიები')
    if (!boardId) return []
    const db = getDb()
    const { data, error } = await db
      .from('board_items')
      .select('id, name, data, group_id')
      .eq('board_id', boardId)
      .is('deleted_at', null)
    if (error) throw error
    return (data || []) as BoardRow[]
  },

  loadLocationsBoard: async (): Promise<{ items: BoardRow[]; groups: GroupRow[] }> => {
    const boardId = await findBoard('ინსპექტორები / ლოკაციები')
    if (!boardId) return { items: [], groups: [] }
    const db = getDb()
    const [{ data: items }, { data: groups }] = await Promise.all([
      db
        .from('board_items')
        .select('id, name, data, group_id')
        .eq('board_id', boardId)
        .is('deleted_at', null),
      db.from('board_groups').select('id, name').eq('board_id', boardId),
    ])
    return { items: (items || []) as BoardRow[], groups: (groups || []) as GroupRow[] }
  },

  loadSummaryBoard: async (): Promise<BoardRow[]> => {
    const boardId = await findBoard('შემაჯამებელი')
    if (!boardId) return []
    const db = getDb()
    const { data, error } = await db
      .from('board_items')
      .select('id, name, data')
      .eq('board_id', boardId)
      .is('deleted_at', null)
    if (error) throw error
    return (data || []) as BoardRow[]
  },

  // ── Global KPIs ──

  getGlobalKPIs: (companies: BoardRow[], locations: BoardRow[]): GlobalKPI => {
    const totalRevenue = companies.reduce((s, c) => s + (c.data?.act_amount || 0), 0)
    const activeContracts = companies.length
    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeContracts,
      totalLocations: locations.length,
      avgRevenuePerCompany:
        companies.length > 0 ? Math.round((totalRevenue / companies.length) * 100) / 100 : 0,
    }
  },

  // ── Finance tab ──

  getServiceTypeRevenue: (companies: BoardRow[]): ServiceTypeRevenue[] => {
    const map: Record<string, { revenue: number; count: number }> = {}
    for (const c of companies) {
      const st = formatServiceType(c.data?.status)
      if (!map[st]) map[st] = { revenue: 0, count: 0 }
      map[st].revenue += c.data?.act_amount || 0
      map[st].count++
    }
    const total = Object.values(map).reduce((s, v) => s + v.revenue, 0)
    return Object.entries(map)
      .map(([service_type, v]) => ({
        service_type,
        revenue: Math.round(v.revenue * 100) / 100,
        count: v.count,
        pct: total > 0 ? Math.round((v.revenue / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  },

  getMonthlyTrend: (companies: BoardRow[]): MonthlyTrend[] => {
    const months: Record<string, { revenue: number; new_contracts: number }> = {}
    for (const c of companies) {
      const start = c.data?.start_date
      const amount = c.data?.act_amount || 0
      if (!start) continue
      const month = start.slice(0, 7) // YYYY-MM
      if (!months[month]) months[month] = { revenue: 0, new_contracts: 0 }
      months[month].revenue += amount
      months[month].new_contracts++
    }
    return Object.entries(months)
      .map(([month, v]) => ({
        month,
        revenue: Math.round(v.revenue * 100) / 100,
        new_contracts: v.new_contracts,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  },

  getPaymentMethodBreakdown: (companies: BoardRow[]): PaymentMethodBreakdown[] => {
    const map: Record<string, number> = {}
    for (const c of companies) {
      const method = formatPaymentMethod(c.data?.payment_method)
      map[method] = (map[method] || 0) + 1
    }
    return Object.entries(map)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)
  },

  getTopCompanies: (companies: BoardRow[], limit = 10): TopCompanyRevenue[] => {
    return companies
      .map(c => ({
        name: c.name,
        amount: c.data?.act_amount || 0,
        end_date: c.data?.end_date || null,
        days_until_expiry: daysUntil(c.data?.end_date),
      }))
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
  },

  // ── Inspectors tab ──

  getInspectorSummaries: (summaryRows: BoardRow[]): InspectorSummary[] => {
    return summaryRows
      .map(item => ({
        name: item.name,
        locations: item.data?.locations || 0,
        total_amount: item.data?.total_amount || 0,
        pct_amount: item.data?.pct_amount || 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
  },

  getInspectorScatter: (summaryRows: BoardRow[]): InspectorScatter[] => {
    return summaryRows.map(item => ({
      name: item.name,
      locations: item.data?.locations || 0,
      revenue: item.data?.total_amount || 0,
    }))
  },

  getTopLocations: (items: BoardRow[], groups: GroupRow[], limit = 15): TopLocation[] => {
    const groupMap = new Map(groups.map(g => [g.id, g.name]))
    return items
      .map(item => ({
        name: item.name,
        inspector: groupMap.get(item.group_id || '') || 'უცნობი',
        amount: item.data?.col_20 || 0,
      }))
      .filter(l => l.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
  },

  // ── Companies tab ──

  getExpiringContracts: (
    companies: BoardRow[],
    locations: BoardRow[],
    groups: GroupRow[]
  ): ExpiringContract[] => {
    const groupMap = new Map(groups.map(g => [g.id, g.name]))
    // Build inspector lookup from locations board
    const inspectorByCompany: Record<string, string> = {}
    for (const loc of locations) {
      const inspector = groupMap.get(loc.group_id || '') || ''
      if (inspector) inspectorByCompany[loc.name] = inspector
    }

    return companies
      .filter(c => c.data?.end_date)
      .map(c => {
        const days = daysUntil(c.data.end_date)
        return {
          name: c.name,
          inspector: inspectorByCompany[c.name] || c.data?.sales_manager || 'უცნობი',
          amount: c.data?.act_amount || 0,
          end_date: c.data.end_date,
          days_remaining: days || 0,
          payment_method: formatPaymentMethod(c.data?.payment_method),
          service_type: formatServiceType(c.data?.status),
        }
      })
      .filter(c => c.days_remaining > -90) // Include recently expired + upcoming
      .sort((a, b) => a.days_remaining - b.days_remaining)
  },

  getExpiryTimeline: (companies: BoardRow[]): ExpiryMonth[] => {
    const now = new Date()
    const months: Record<string, number> = {}

    for (const c of companies) {
      const end = c.data?.end_date
      if (!end) continue
      const month = end.slice(0, 7)
      months[month] = (months[month] || 0) + 1
    }

    return Object.entries(months)
      .filter(([month]) => month >= now.toISOString().slice(0, 7))
      .map(([month, count]) => {
        const monthDate = new Date(month + '-01')
        const diffMonths =
          (monthDate.getFullYear() - now.getFullYear()) * 12 +
          (monthDate.getMonth() - now.getMonth())
        let urgency: 'red' | 'amber' | 'green' = 'green'
        if (diffMonths <= 1) urgency = 'red'
        else if (diffMonths <= 3) urgency = 'amber'
        return { month, count, urgency }
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(0, 12)
  },

  getValueBuckets: (companies: BoardRow[]): ValueBucket[] => {
    const buckets: Record<string, number> = {
      '0-100': 0,
      '100-300': 0,
      '300-500': 0,
      '500-1000': 0,
      '1000+': 0,
    }
    for (const c of companies) {
      const amount = c.data?.act_amount || 0
      if (amount <= 100) buckets['0-100']++
      else if (amount <= 300) buckets['100-300']++
      else if (amount <= 500) buckets['300-500']++
      else if (amount <= 1000) buckets['500-1000']++
      else buckets['1000+']++
    }
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }))
  },

  getCompanyTable: (companies: BoardRow[]): CompanyRow[] => {
    return companies.map(c => ({
      name: c.name,
      locations: 0, // Filled in by caller if needed
      inspector: c.data?.sales_manager || '',
      service_type: formatServiceType(c.data?.status),
      monthly: c.data?.monthly || 0,
      invoice: c.data?.invoice_amount || 0,
      vat: c.data?.vat || 0,
      payment_method: formatPaymentMethod(c.data?.payment_method),
      start_date: c.data?.start_date || null,
      end_date: c.data?.end_date || null,
    }))
  },
}
