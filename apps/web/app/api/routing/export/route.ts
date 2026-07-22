export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

const FUEL_KEYS: Record<string, string> = {
  petrol: 'fuel_price_petrol',
  diesel: 'fuel_price_diesel',
  gas: 'fuel_price_gas',
}

// GET ?from=&to= — per-officer aggregated rows over a date range (week or month)
// for Excel export. Admin/dispatcher only.
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

    const supabase = createServerClient() as any
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
    if (role?.role !== 'admin' && role?.role !== 'dispatcher')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const svc = createServiceClient() as any

    const { data: roleRows } = await svc.from('user_roles').select('user_id').eq('role', 'officer')
    const officerIds = (roleRows || []).map((r: any) => r.user_id)
    if (officerIds.length === 0) return NextResponse.json({ from, to, rows: [] })

    const { data: users } = await svc
      .from('users')
      .select('id, full_name, email')
      .in('id', officerIds)
      .eq('is_active', true)
      .order('full_name')
    const activeIds = (users || []).map((u: any) => u.id)
    if (activeIds.length === 0) return NextResponse.json({ from, to, rows: [] })

    const { data: transport } = await svc
      .from('officer_transport')
      .select('user_id, consumption_l_per_100km, fuel_type, fuel_price_per_liter, org')
      .in('user_id', activeIds)
    const tOf = new Map<string, any>((transport || []).map((t: any) => [t.user_id, t]))

    const { data: priceRows } = await svc
      .from('app_settings')
      .select('key, value')
      .in('key', Object.values(FUEL_KEYS))
    const priceByKey = new Map<string, string>((priceRows || []).map((r: any) => [r.key, r.value]))
    const toPrice = (v: unknown): number | null => {
      if (v == null || v === '') return null
      const n = Number(v)
      return isNaN(n) ? null : n
    }

    const { data: routes } = await svc
      .from('routes')
      .select('inspector_id, total_distance_km, route_stops(status, prepaid)')
      .in('inspector_id', activeIds)
      .gte('date', from)
      .lte('date', to)
    const agg = new Map<string, { km: number; days: number; stops: number; visited: number }>()
    for (const id of activeIds) agg.set(id, { km: 0, days: 0, stops: 0, visited: 0 })
    for (const r of routes || []) {
      const a = agg.get(r.inspector_id)
      if (!a) continue
      const stops = r.route_stops || []
      if (stops.length === 0) continue
      a.days += 1
      a.stops += stops.length
      a.visited += stops.filter(
        (s: any) => s.status === 'completed' || s.status === 'visited'
      ).length
      // All-prepaid carry-over days were already paid for → exclude from km/fuel.
      const allPrepaid = stops.every((s: any) => s.prepaid)
      if (!allPrepaid) a.km += r.total_distance_km || 0
    }

    const { data: checkins } = await svc
      .from('location_checkins')
      .select('inspector_id, duration_minutes')
      .in('inspector_id', activeIds)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
    const minutesOf = new Map<string, number>()
    for (const c of checkins || [])
      if (c.duration_minutes != null)
        minutesOf.set(c.inspector_id, (minutesOf.get(c.inspector_id) || 0) + c.duration_minutes)

    const { data: extra } = await svc
      .from('extra_visits')
      .select('inspector_id')
      .in('inspector_id', activeIds)
      .gte('visit_date', from)
      .lte('visit_date', to)
    const extraOf = new Map<string, number>()
    for (const e of extra || []) extraOf.set(e.inspector_id, (extraOf.get(e.inspector_id) || 0) + 1)

    const rows = (users || []).map((u: any) => {
      const a = agg.get(u.id)!
      const t = tOf.get(u.id)
      const fuelType = (t?.fuel_type ?? null) as 'petrol' | 'diesel' | 'gas' | null
      const consumption = t?.consumption_l_per_100km ?? null
      const liters = consumption != null && a.km > 0 ? (a.km * consumption) / 100 : null
      const typePrice = fuelType ? toPrice(priceByKey.get(FUEL_KEYS[fuelType])) : null
      const price = t?.fuel_price_per_liter ?? typePrice
      const cost = liters != null && price != null ? liters * price : null
      return {
        name: u.full_name || u.email,
        org: t?.org ?? null,
        fuelType,
        days: a.days,
        stops: a.stops,
        visited: a.visited,
        km: Number(a.km.toFixed(1)),
        liters: liters != null ? Number(liters.toFixed(1)) : null,
        cost: cost != null ? Number(cost.toFixed(1)) : null,
        minutes: minutesOf.get(u.id) ?? 0,
        unplanned: extraOf.get(u.id) ?? 0,
      }
    })

    return NextResponse.json({ from, to, rows })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('routing export GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
