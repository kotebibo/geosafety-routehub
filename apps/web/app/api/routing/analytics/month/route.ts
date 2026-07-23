export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { georgiaDateOf, georgiaDayRange } from '@/lib/time'

const DAY = 86400000

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

// The Mondays (UTC) of every week that overlaps a YYYY-MM month, plus the full
// date range those weeks span. Weeks are Monday-start (Georgian convention).
function monthWeeks(month: string): { weekStarts: string[]; rangeStart: string; rangeEnd: string } {
  const [y, m] = month.split('-').map(Number)
  const first = Date.UTC(y, m - 1, 1)
  const last = Date.UTC(y, m, 0) // last day of the month
  const dow = (new Date(first).getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  const firstMonday = first - dow * DAY
  const weekStarts: string[] = []
  for (let cur = firstMonday; cur <= last; cur += 7 * DAY) weekStarts.push(iso(cur))
  const rangeStart = weekStarts[0]
  const rangeEnd = iso(firstMonday + (weekStarts.length * 7 - 1) * DAY)
  return { weekStarts, rangeStart, rangeEnd }
}

const FUEL_KEYS = {
  petrol: 'fuel_price_petrol',
  diesel: 'fuel_price_diesel',
  gas: 'fuel_price_gas',
} as const

interface Agg {
  totalKm: number
  days: number
  stopCount: number
  visitedCount: number
  minutes: number
}

// GET ?month=YYYY-MM — per-week analytics slices for a whole month. Each slice
// carries per-officer km/fuel/cost/time; the month totals sum them. Admin only.
export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const month = new URL(request.url).searchParams.get('month')
    if (!month || !/^\d{4}-\d{2}$/.test(month))
      return NextResponse.json({ error: 'month (YYYY-MM) is required' }, { status: 400 })

    const svc = createServiceClient() as any
    const { weekStarts, rangeStart, rangeEnd } = monthWeeks(month)

    const { data: roles } = await svc.from('user_roles').select('user_id').eq('role', 'officer')
    const officerIds = (roles || []).map((r: any) => r.user_id)
    if (officerIds.length === 0)
      return NextResponse.json({
        month,
        weekStarts,
        weeks: [],
        monthTotals: empty(),
        globalPrices: emptyPrices(),
      })

    const { data: users } = await svc
      .from('users')
      .select('id, full_name, email')
      .in('id', officerIds)
      .eq('is_active', true)
      .order('full_name')
    const activeIds = (users || []).map((u: any) => u.id)
    if (activeIds.length === 0)
      return NextResponse.json({
        month,
        weekStarts,
        weeks: [],
        monthTotals: empty(),
        globalPrices: emptyPrices(),
      })

    const { data: transport } = await svc
      .from('officer_transport')
      .select('user_id, consumption_l_per_100km, fuel_price_per_liter, fuel_type')
      .in('user_id', activeIds)
    const consumptionOf = new Map<string, number | null>(
      (transport || []).map((t: any) => [t.user_id, t.consumption_l_per_100km])
    )
    const priceOverrideOf = new Map<string, number | null>(
      (transport || []).map((t: any) => [t.user_id, t.fuel_price_per_liter])
    )
    const fuelTypeOf = new Map<string, string | null>(
      (transport || []).map((t: any) => [t.user_id, t.fuel_type])
    )

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
    const globalPrices = {
      petrol: toPrice(priceByKey.get(FUEL_KEYS.petrol)),
      diesel: toPrice(priceByKey.get(FUEL_KEYS.diesel)),
      gas: toPrice(priceByKey.get(FUEL_KEYS.gas)),
    }

    // One range query, then bucket rows into the week they belong to.
    const firstMondayMs = Date.parse(`${rangeStart}T00:00:00Z`)
    const weekIndexOf = (dateStr: string): number =>
      Math.floor((Date.parse(`${dateStr}T00:00:00Z`) - firstMondayMs) / (7 * DAY))

    const { data: routes } = await svc
      .from('routes')
      .select('inspector_id, date, total_distance_km, route_stops(status, prepaid)')
      .in('inspector_id', activeIds)
      .gte('date', rangeStart)
      .lte('date', rangeEnd)
    const ciRange = georgiaDayRange(rangeStart, rangeEnd)
    const { data: checkins } = await svc
      .from('location_checkins')
      .select('inspector_id, duration_minutes, created_at')
      .in('inspector_id', activeIds)
      .gte('created_at', ciRange.gte)
      .lte('created_at', ciRange.lte)

    // aggByWeek[weekIndex] = Map(officerId → Agg)
    const aggByWeek: Map<string, Agg>[] = weekStarts.map(
      () => new Map<string, Agg>(activeIds.map((id: string) => [id, blank()]))
    )
    const inRange = (i: number) => i >= 0 && i < weekStarts.length

    for (const r of routes || []) {
      const wi = weekIndexOf(r.date)
      if (!inRange(wi)) continue
      const agg = aggByWeek[wi].get(r.inspector_id)
      if (!agg) continue
      const stops = r.route_stops || []
      if (stops.length === 0) continue
      agg.days += 1
      agg.stopCount += stops.length
      agg.visitedCount += stops.filter(
        (s: any) => s.status === 'completed' || s.status === 'visited'
      ).length
      const allPrepaid = stops.every((s: any) => s.prepaid)
      if (!allPrepaid) agg.totalKm += r.total_distance_km || 0
    }
    for (const c of checkins || []) {
      if (c.duration_minutes == null) continue
      const wi = weekIndexOf(georgiaDateOf(c.created_at))
      if (!inRange(wi)) continue
      const agg = aggByWeek[wi].get(c.inspector_id)
      if (agg) agg.minutes += c.duration_minutes
    }

    const officerRow = (u: any, agg: Agg) => {
      const consumption = consumptionOf.get(u.id) ?? null
      const liters =
        consumption != null && agg.totalKm > 0 ? (agg.totalKm * consumption) / 100 : null
      const priceOverride = priceOverrideOf.get(u.id) ?? null
      const fuelType = (fuelTypeOf.get(u.id) ?? null) as 'petrol' | 'diesel' | 'gas' | null
      const typePrice = fuelType ? globalPrices[fuelType] : null
      const fuelPrice = priceOverride ?? typePrice
      const cost = liters != null && fuelPrice != null ? liters * fuelPrice : null
      return {
        officerId: u.id,
        name: u.full_name || u.email,
        email: u.email,
        totalKm: agg.totalKm,
        days: agg.days,
        stopCount: agg.stopCount,
        visitedCount: agg.visitedCount,
        minutes: agg.minutes,
        consumption,
        liters,
        fuelType,
        priceOverride,
        fuelPrice,
        cost,
      }
    }

    const weeks = weekStarts.map((weekStart, wi) => {
      const officers = (users || [])
        .map((u: any) => officerRow(u, aggByWeek[wi].get(u.id)!))
        .sort((a: any, b: any) => b.totalKm - a.totalKm || a.name.localeCompare(b.name, 'ka'))
      const fleet = officers.reduce(
        (s: any, o: any) => ({
          km: s.km + o.totalKm,
          liters: s.liters + (o.liters ?? 0),
          cost: s.cost + (o.cost ?? 0),
          minutes: s.minutes + o.minutes,
          planning: s.planning + (o.days > 0 ? 1 : 0),
        }),
        { km: 0, liters: 0, cost: 0, minutes: 0, planning: 0 }
      )
      return {
        weekStart,
        weekEnd: iso(Date.parse(`${weekStart}T00:00:00Z`) + 6 * DAY),
        fleet,
        officers,
      }
    })

    const monthTotals = weeks.reduce(
      (s: any, w: any) => ({
        km: s.km + w.fleet.km,
        liters: s.liters + w.fleet.liters,
        cost: s.cost + w.fleet.cost,
        minutes: s.minutes + w.fleet.minutes,
      }),
      empty()
    )

    return NextResponse.json({ month, weekStarts, weeks, monthTotals, globalPrices })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    console.error('routing month analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function blank(): Agg {
  return { totalKm: 0, days: 0, stopCount: 0, visitedCount: 0, minutes: 0 }
}
function empty() {
  return { km: 0, liters: 0, cost: 0, minutes: 0 }
}
function emptyPrices() {
  return { petrol: null, diesel: null, gas: null }
}
