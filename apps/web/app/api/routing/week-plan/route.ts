export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notify'
import { notifyManagers } from '@/features/routing/lib/routing-notify'

const stopSchema = z.object({
  itemId: z.string().uuid(),
  position: z.number().int(),
  distanceFromPrevious: z.number().optional(),
})
const saveSchema = z.object({
  boardId: z.string().uuid(),
  inspectorId: z.string().uuid(),
  weekStart: z.string(), // YYYY-MM-DD (Monday)
  days: z
    .array(
      z.object({
        date: z.string(),
        km: z.number().optional(),
        stops: z.array(stopSchema),
      })
    )
    .max(7),
})

function weekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i))
    return dt.toISOString().slice(0, 10)
  })
}

async function roleOf(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
  return data?.role ?? null
}

// Fuel snapshot for a week: sum planned km (excluding prepaid carry-over stops),
// × the officer's consumption → liters, × their fuel-type price → cost (₾).
async function computeWeekFuel(svc: any, inspectorId: string, weekStart: string) {
  const dates = weekDates(weekStart)
  const { data: routes } = await svc
    .from('routes')
    .select('total_distance_km, route_stops(prepaid)')
    .eq('inspector_id', inspectorId)
    .in('date', dates)
  // A day whose stops are ALL prepaid contributes no new km/fuel.
  let totalKm = 0
  for (const r of routes || []) {
    const stops = r.route_stops || []
    const allPrepaid = stops.length > 0 && stops.every((s: any) => s.prepaid)
    if (!allPrepaid) totalKm += r.total_distance_km || 0
  }

  const { data: t } = await svc
    .from('officer_transport')
    .select('consumption_l_per_100km, fuel_type, fuel_price_per_liter')
    .eq('user_id', inspectorId)
    .maybeSingle()
  const consumption = t?.consumption_l_per_100km ?? null
  const liters = consumption != null && totalKm > 0 ? (totalKm * consumption) / 100 : null

  const FUEL_KEYS: Record<string, string> = {
    petrol: 'fuel_price_petrol',
    diesel: 'fuel_price_diesel',
    gas: 'fuel_price_gas',
  }
  let typePrice: number | null = null
  if (t?.fuel_type && FUEL_KEYS[t.fuel_type]) {
    const { data: p } = await svc
      .from('app_settings')
      .select('value')
      .eq('key', FUEL_KEYS[t.fuel_type])
      .maybeSingle()
    const n = p?.value != null && p.value !== '' ? Number(p.value) : null
    typePrice = n != null && !isNaN(n) ? n : null
  }
  // Per-officer override wins; otherwise the global price for their fuel type.
  const price = t?.fuel_price_per_liter ?? typePrice
  const cost = liters != null && price != null ? liters * price : null
  return { totalKm, liters, cost }
}

// GET ?inspectorId=&weekStart=  → the saved plan (routes + stops) for that officer's week
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const url = new URL(request.url)
    const inspectorId = url.searchParams.get('inspectorId')
    const weekStart = url.searchParams.get('weekStart')
    if (!inspectorId || !weekStart)
      return NextResponse.json({ error: 'inspectorId and weekStart required' }, { status: 400 })

    const supabase = createServerClient() as any
    const dates = weekDates(weekStart)
    const { data: routes, error } = await supabase
      .from('routes')
      .select(
        'id, date, total_distance_km, status, route_stops(board_item_id, position, distance_from_previous_km, status)'
      )
      .eq('inspector_id', inspectorId)
      .in('date', dates)
      .order('date')
    if (error) throw error

    const days = (routes || []).map((r: any) => ({
      date: r.date,
      km: r.total_distance_km,
      status: r.status,
      stops: (r.route_stops || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((s: any) => ({
          itemId: s.board_item_id,
          position: s.position,
          distanceFromPrevious: s.distance_from_previous_km,
          status: s.status,
        })),
    }))

    // Week-level lifecycle (draft → submitted → approved) + fuel snapshot.
    const svc = createServiceClient() as any
    const { data: plan } = await svc
      .from('week_plans')
      .select('status, submitted_at, approved_at, approved_by, total_km, fuel_liters, fuel_cost')
      .eq('inspector_id', inspectorId)
      .eq('week_start', weekStart)
      .maybeSingle()

    return NextResponse.json({
      inspectorId,
      weekStart,
      status: plan?.status ?? 'draft',
      plan: plan ?? null,
      days,
    })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('week-plan GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — replace the officer's planned routes for this week (one route per day + stops)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient() as any
    const session = await requireAuth()
    const v = saveSchema.parse(await request.json())

    // Role check: officers may only save their own plan; admin/dispatcher any
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
    const isManager = role?.role === 'admin' || role?.role === 'dispatcher'
    const isAdmin = role?.role === 'admin'
    if (!isManager && v.inspectorId !== session.user.id)
      return NextResponse.json({ error: 'Cannot plan for another officer' }, { status: 403 })

    const svc = createServiceClient() as any
    const dates = weekDates(v.weekStart)

    // A submitted/approved plan is locked for the officer — only an admin may
    // edit it on their behalf (officer must ask the admin).
    const { data: existingPlan } = await svc
      .from('week_plans')
      .select('status')
      .eq('inspector_id', v.inspectorId)
      .eq('week_start', v.weekStart)
      .maybeSingle()
    if (existingPlan && existingPlan.status !== 'draft' && !isAdmin)
      return NextResponse.json(
        { error: 'Plan is locked — ask an admin to change it', locked: true },
        { status: 409 }
      )

    // Wipe existing PLANNED routes for this officer+week (leave completed ones alone)
    const { data: existing } = await svc
      .from('routes')
      .select('id')
      .eq('inspector_id', v.inspectorId)
      .in('date', dates)
      .eq('status', 'planned')
    const oldIds = (existing || []).map((r: any) => r.id)
    if (oldIds.length) {
      await svc.from('route_stops').delete().in('route_id', oldIds)
      await svc.from('routes').delete().in('id', oldIds)
    }

    // Carry-over: objects that were "failed" earlier (skipped in a prior week and
    // never resolved as canceled+confirmed) were already paid for, so re-planning
    // them this week must not be charged again → mark those stops prepaid.
    const plannedItemIds = [...new Set(v.days.flatMap(d => d.stops.map(s => s.itemId)))]
    const prepaidItems = new Set<string>()
    if (plannedItemIds.length) {
      const { data: priorSkipped } = await svc
        .from('routes')
        .select('date, route_stops(board_item_id, status, skip_reason, skip_confirmed)')
        .eq('inspector_id', v.inspectorId)
        .lt('date', v.weekStart)
      for (const r of priorSkipped || []) {
        for (const s of r.route_stops || []) {
          if (
            s.status === 'skipped' &&
            s.board_item_id &&
            plannedItemIds.includes(s.board_item_id) &&
            !(s.skip_reason === 'canceled' && s.skip_confirmed)
          )
            prepaidItems.add(s.board_item_id)
        }
      }
    }

    // Insert one route per non-empty day + its stops
    let savedDays = 0
    let savedStops = 0
    for (const day of v.days) {
      if (day.stops.length === 0) continue
      const { data: route, error: rErr } = await svc
        .from('routes')
        .insert({
          name: `კვირის მარშრუტი — ${day.date}`,
          date: day.date,
          inspector_id: v.inspectorId,
          status: 'planned',
          total_distance_km: day.km ?? null,
          optimization_type: 'distance',
        })
        .select('id')
        .single()
      if (rErr) throw rErr
      const stops = day.stops.map(s => ({
        route_id: route.id,
        board_item_id: s.itemId,
        position: s.position,
        status: 'pending',
        distance_from_previous_km: s.distanceFromPrevious ?? null,
        prepaid: prepaidItems.has(s.itemId),
      }))
      const { error: sErr } = await svc.from('route_stops').insert(stops)
      if (sErr) throw sErr
      savedDays++
      savedStops += stops.length
    }

    // Any edit re-opens the plan as a draft — a submitted/approved plan that an
    // admin changes must be re-submitted/re-approved so the fuel snapshot can't
    // drift from what was actually purchased.
    await svc.from('week_plans').upsert(
      {
        inspector_id: v.inspectorId,
        board_id: v.boardId,
        week_start: v.weekStart,
        status: 'draft',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'inspector_id,week_start' }
    )

    return NextResponse.json({ success: true, savedDays, savedStops })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('week-plan POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const patchSchema = z.object({
  inspectorId: z.string().uuid(),
  weekStart: z.string(),
  action: z.enum(['submit', 'approve', 'reopen']),
})

// PATCH — advance the week plan's lifecycle.
//   submit  (officer/admin): draft → submitted (locks it for the officer)
//   approve (admin only):    submitted → approved + fuel snapshot (= purchased)
//   reopen  (admin only):    → draft (admin re-opens for editing)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient() as any
    const session = await requireAuth()
    const { inspectorId, weekStart, action } = patchSchema.parse(await request.json())

    const role = await roleOf(supabase, session.user.id)
    const isAdmin = role === 'admin'
    const isManager = isAdmin || role === 'dispatcher'
    const isOwner = inspectorId === session.user.id

    if (action !== 'submit' && !isAdmin)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (action === 'submit' && !isOwner && !isManager)
      return NextResponse.json({ error: 'Cannot submit another officer’s plan' }, { status: 403 })

    const svc = createServiceClient() as any
    const now = new Date().toISOString()

    const patch: Record<string, any> = { updated_at: now }
    if (action === 'submit') {
      patch.status = 'submitted'
      patch.submitted_at = now
    } else if (action === 'reopen') {
      patch.status = 'draft'
    } else if (action === 'approve') {
      const fuel = await computeWeekFuel(svc, inspectorId, weekStart)
      patch.status = 'approved'
      patch.approved_at = now
      patch.approved_by = session.user.id
      patch.total_km = fuel.totalKm
      patch.fuel_liters = fuel.liters
      patch.fuel_cost = fuel.cost
    }

    const { data, error } = await svc
      .from('week_plans')
      .upsert(
        { inspector_id: inspectorId, week_start: weekStart, ...patch },
        { onConflict: 'inspector_id,week_start' }
      )
      .select()
      .single()
    if (error) throw error

    // Notify: submit → managers (in-app); approve → the officer (in-app).
    if (action === 'submit') {
      const { data: u } = await svc
        .from('users')
        .select('full_name, email')
        .eq('id', inspectorId)
        .maybeSingle()
      const who = u?.full_name || u?.email || 'ოფიცერი'
      await notifyManagers(svc, {
        type: 'week_plan_submitted',
        title: 'ახალი კვირის გეგმა',
        message: `${who} — კვირის გეგმა დასამტკიცებლად`,
        data: { inspectorId, weekStart },
        email: false,
      })
    } else if (action === 'approve') {
      await notifyUser({
        supabase: svc,
        userId: inspectorId,
        type: 'week_plan_approved',
        title: 'გეგმა დამტკიცდა',
        message: 'თქვენი კვირის გეგმა დამტკიცდა',
        data: { weekStart },
        email: false,
      })
    }

    return NextResponse.json({ success: true, plan: data })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('week-plan PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
