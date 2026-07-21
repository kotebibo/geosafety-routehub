export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'

function weekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i))
    return dt.toISOString().slice(0, 10)
  })
}

// GET ?weekStart=YYYY-MM-DD (Monday) — per-officer summary of the week's planned
// routes: total distance, days planned, stop/visited counts, and the fuel
// estimate from each officer's consumption. Admin only.
export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const weekStart = new URL(request.url).searchParams.get('weekStart')
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart))
      return NextResponse.json({ error: 'weekStart (YYYY-MM-DD) is required' }, { status: 400 })

    const svc = createServiceClient() as any

    const { data: roles } = await svc.from('user_roles').select('user_id').eq('role', 'officer')
    const officerIds = (roles || []).map((r: any) => r.user_id)
    if (officerIds.length === 0) return NextResponse.json({ weekStart, officers: [] })

    const { data: users } = await svc
      .from('users')
      .select('id, full_name, email')
      .in('id', officerIds)
      .eq('is_active', true)
      .order('full_name')
    const activeIds = (users || []).map((u: any) => u.id)
    if (activeIds.length === 0) return NextResponse.json({ weekStart, officers: [] })

    const { data: transport } = await svc
      .from('officer_transport')
      .select('user_id, consumption_l_per_100km, fuel_price_per_liter')
      .in('user_id', activeIds)
    const consumptionOf = new Map<string, number | null>(
      (transport || []).map((t: any) => [t.user_id, t.consumption_l_per_100km])
    )
    const priceOverrideOf = new Map<string, number | null>(
      (transport || []).map((t: any) => [t.user_id, t.fuel_price_per_liter])
    )

    // Global fuel price — the default every officer inherits.
    const { data: priceRow } = await svc
      .from('app_settings')
      .select('value')
      .eq('key', 'fuel_price_per_liter')
      .maybeSingle()
    const globalPriceNum =
      priceRow?.value != null && priceRow.value !== '' ? Number(priceRow.value) : null
    const globalPrice = globalPriceNum != null && !isNaN(globalPriceNum) ? globalPriceNum : null

    const dates = weekDates(weekStart)
    const { data: routes } = await svc
      .from('routes')
      .select('inspector_id, total_distance_km, route_stops(status)')
      .in('inspector_id', activeIds)
      .in('date', dates)

    type Agg = { totalKm: number; days: number; stopCount: number; visitedCount: number }
    const aggOf = new Map<string, Agg>(
      activeIds.map((id: string) => [id, { totalKm: 0, days: 0, stopCount: 0, visitedCount: 0 }])
    )
    for (const r of routes || []) {
      const agg = aggOf.get(r.inspector_id)
      if (!agg) continue
      const stops = r.route_stops || []
      if (stops.length === 0) continue
      agg.days += 1
      agg.stopCount += stops.length
      // Done = 'completed' (the DB-valid state); 'visited' kept for any legacy rows.
      agg.visitedCount += stops.filter(
        (s: any) => s.status === 'completed' || s.status === 'visited'
      ).length
      agg.totalKm += r.total_distance_km || 0
    }

    const officers = (users || []).map((u: any) => {
      const agg = aggOf.get(u.id)!
      const consumption = consumptionOf.get(u.id) ?? null
      const liters =
        consumption != null && agg.totalKm > 0 ? (agg.totalKm * consumption) / 100 : null
      const priceOverride = priceOverrideOf.get(u.id) ?? null
      const fuelPrice = priceOverride ?? globalPrice // effective price for this officer
      const cost = liters != null && fuelPrice != null ? liters * fuelPrice : null
      return {
        officerId: u.id,
        name: u.full_name || u.email,
        email: u.email,
        totalKm: agg.totalKm,
        days: agg.days,
        stopCount: agg.stopCount,
        visitedCount: agg.visitedCount,
        consumption,
        liters,
        priceOverride, // the officer's own override (null → inherits global)
        fuelPrice, // effective price used for cost
        cost,
      }
    })

    // Officers with the most planned distance first; unplanned ones last.
    officers.sort((a: any, b: any) => b.totalKm - a.totalKm || a.name.localeCompare(b.name, 'ka'))

    return NextResponse.json({ weekStart, globalPrice, officers })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    console.error('routing analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
