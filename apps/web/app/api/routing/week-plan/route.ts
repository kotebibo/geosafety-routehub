export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

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
    return NextResponse.json({ inspectorId, weekStart, days })
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
    if (!isManager && v.inspectorId !== session.user.id)
      return NextResponse.json({ error: 'Cannot plan for another officer' }, { status: 403 })

    const svc = createServiceClient() as any
    const dates = weekDates(v.weekStart)

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
      }))
      const { error: sErr } = await svc.from('route_stops').insert(stops)
      if (sErr) throw sErr
      savedDays++
      savedStops += stops.length
    }

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
