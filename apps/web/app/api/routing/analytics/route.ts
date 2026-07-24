export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { georgiaDayRange, weekDatesFrom } from '@/lib/time'
import { FUEL_KEYS, toPrice } from '@/features/routing/lib/fuel-pricing'

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

    // Everything below depends only on activeIds/dates — fetch in parallel
    // instead of five serial round-trips.
    const dates = weekDatesFrom(weekStart)
    const range = georgiaDayRange(dates[0], dates[6])
    const [
      { data: transport },
      { data: priceRows },
      { data: routes },
      { data: approvedPlans },
      { data: checkins },
    ] = await Promise.all([
      svc
        .from('officer_transport')
        .select('user_id, consumption_l_per_100km, fuel_price_per_liter, fuel_type')
        .in('user_id', activeIds),
      svc.from('app_settings').select('key, value').in('key', Object.values(FUEL_KEYS)),
      svc
        .from('routes')
        .select(
          'inspector_id, total_distance_km, route_stops(status, prepaid, distance_from_previous_km)'
        )
        .in('inspector_id', activeIds)
        .in('date', dates),
      // Weeks whose fuel was actually bought (approved) — only those carry a
      // "wasted fuel" debt when an object is paid for but not visited.
      svc
        .from('week_plans')
        .select('inspector_id')
        .eq('week_start', weekStart)
        .eq('status', 'approved')
        .in('inspector_id', activeIds),
      // Time spent this week per officer (sum of check-in durations). Bound the
      // check-in window by the Georgia week in UTC (not naive strings) so rows
      // near midnight land in the right week.
      svc
        .from('location_checkins')
        .select('inspector_id, duration_minutes')
        .in('inspector_id', activeIds)
        .gte('created_at', range.gte)
        .lte('created_at', range.lte),
    ])
    const consumptionOf = new Map<string, number | null>(
      (transport || []).map((t: any) => [t.user_id, t.consumption_l_per_100km])
    )
    const priceOverrideOf = new Map<string, number | null>(
      (transport || []).map((t: any) => [t.user_id, t.fuel_price_per_liter])
    )
    const fuelTypeOf = new Map<string, string | null>(
      (transport || []).map((t: any) => [t.user_id, t.fuel_type])
    )

    // Global fuel price per fuel type — the default an officer inherits based on
    // the fuel type set on their profile.
    const priceByKey = new Map<string, string>((priceRows || []).map((r: any) => [r.key, r.value]))
    const globalPrices = {
      petrol: toPrice(priceByKey.get(FUEL_KEYS.petrol)),
      diesel: toPrice(priceByKey.get(FUEL_KEYS.diesel)),
      gas: toPrice(priceByKey.get(FUEL_KEYS.gas)),
    }

    const approvedSet = new Set<string>((approvedPlans || []).map((p: any) => p.inspector_id))

    // wastedKm = distance of paid-for objects that were NOT visited (skipped/
    // failed, non-prepaid) in an approved week — the officer's fuel "debt".
    type Agg = {
      totalKm: number
      days: number
      stopCount: number
      visitedCount: number
      wastedKm: number
    }
    const aggOf = new Map<string, Agg>(
      activeIds.map((id: string) => [
        id,
        { totalKm: 0, days: 0, stopCount: 0, visitedCount: 0, wastedKm: 0 },
      ])
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
      // A day whose stops are ALL prepaid carry-overs was already paid for last
      // week → its km/fuel isn't charged again (matches computeWeekFuel).
      const allPrepaid = stops.every((s: any) => s.prepaid)
      if (!allPrepaid) agg.totalKm += r.total_distance_km || 0
      if (approvedSet.has(r.inspector_id))
        for (const s of stops)
          if (!s.prepaid && (s.status === 'skipped' || s.status === 'failed'))
            agg.wastedKm += s.distance_from_previous_km || 0
    }

    // Sum each officer's check-in durations for the week (fetched above).
    const minutesOf = new Map<string, number>()
    for (const c of checkins || [])
      if (c.duration_minutes != null)
        minutesOf.set(c.inspector_id, (minutesOf.get(c.inspector_id) || 0) + c.duration_minutes)

    const officers = (users || []).map((u: any) => {
      const agg = aggOf.get(u.id)!
      const consumption = consumptionOf.get(u.id) ?? null
      const liters =
        consumption != null && agg.totalKm > 0 ? (agg.totalKm * consumption) / 100 : null
      const priceOverride = priceOverrideOf.get(u.id) ?? null
      const fuelType = (fuelTypeOf.get(u.id) ?? null) as 'petrol' | 'diesel' | 'gas' | null
      // Effective price: an explicit per-officer override wins; otherwise the
      // global price for the officer's fuel type.
      const typePrice = fuelType ? globalPrices[fuelType] : null
      const fuelPrice = priceOverride ?? typePrice
      const cost = liters != null && fuelPrice != null ? liters * fuelPrice : null
      // Fuel already bought for objects the officer never reached this week.
      const wastedLiters =
        consumption != null && agg.wastedKm > 0 ? (agg.wastedKm * consumption) / 100 : 0
      const wastedCost = fuelPrice != null ? wastedLiters * fuelPrice : 0
      return {
        officerId: u.id,
        name: u.full_name || u.email,
        email: u.email,
        totalKm: agg.totalKm,
        days: agg.days,
        stopCount: agg.stopCount,
        visitedCount: agg.visitedCount,
        minutes: minutesOf.get(u.id) ?? 0,
        consumption,
        liters,
        wastedKm: agg.wastedKm,
        wastedLiters,
        wastedCost,
        fuelType, // officer's fuel type (drives which global price applies)
        priceOverride, // the officer's own override (null → inherits by type)
        fuelPrice, // effective price used for cost
        cost,
      }
    })

    // Officers with the most planned distance first; unplanned ones last.
    officers.sort((a: any, b: any) => b.totalKm - a.totalKm || a.name.localeCompare(b.name, 'ka'))

    return NextResponse.json({ weekStart, globalPrices, officers })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    console.error('routing analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
