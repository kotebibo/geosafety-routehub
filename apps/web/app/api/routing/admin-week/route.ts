export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { weekDatesFrom } from '@/lib/time'

// GET ?weekStart= — admin/dispatcher work queue for a week:
//   requests   — submitted week plans awaiting approval (officer + km/fuel)
//   unplanned  — extra-visit requests
//   deferred   — planned stops that were skipped/deferred (with reason)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const weekStart = new URL(request.url).searchParams.get('weekStart')
    if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

    const supabase = createServerClient() as any
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
    if (role?.role !== 'admin' && role?.role !== 'dispatcher')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const svc = createServiceClient() as any
    const dates = weekDatesFrom(weekStart)
    const weekEnd = dates[6]

    // Names: officers (users) + board items resolved lazily below.
    const nameOfUser = new Map<string, string>()
    const resolveUsers = async (ids: string[]) => {
      const missing = ids.filter(id => id && !nameOfUser.has(id))
      if (!missing.length) return
      const { data } = await svc.from('users').select('id, full_name, email').in('id', missing)
      for (const u of data || []) nameOfUser.set(u.id, u.full_name || u.email)
    }
    const nameOfItem = new Map<string, string>()
    const resolveItems = async (ids: string[]) => {
      const missing = ids.filter(id => id && !nameOfItem.has(id))
      if (!missing.length) return
      const { data } = await svc.from('board_items').select('id, name').in('id', missing)
      for (const it of data || []) nameOfItem.set(it.id, it.name)
    }

    // The three list queries are independent (same week window) — run together.
    const [{ data: planRows }, { data: evRows }, { data: defRoutes }] = await Promise.all([
      // Requests: submitted week plans for this week
      svc
        .from('week_plans')
        .select('id, inspector_id, week_start, status, submitted_at')
        .eq('week_start', weekStart)
        .eq('status', 'submitted'),
      // Unplanned: extra-visit requests this week
      svc
        .from('extra_visits')
        .select('id, inspector_id, board_item_id, visit_date, distance_km, reason, status')
        .gte('visit_date', weekStart)
        .lte('visit_date', weekEnd)
        .order('created_at', { ascending: true }),
      // Deferred: skipped stops on this week's routes
      svc
        .from('routes')
        .select(
          'date, inspector_id, route_stops(id, board_item_id, status, skip_reason, skip_note, deferred_at)'
        )
        .in('date', dates),
    ])

    // --- Requests ---
    await resolveUsers((planRows || []).map((p: any) => p.inspector_id))
    // km per requesting officer (sum of the week's routes)
    const reqIds = (planRows || []).map((p: any) => p.inspector_id)
    const kmByOfficer = new Map<string, number>()
    if (reqIds.length) {
      const { data: rts } = await svc
        .from('routes')
        .select('inspector_id, total_distance_km')
        .in('inspector_id', reqIds)
        .in('date', dates)
      for (const r of rts || [])
        kmByOfficer.set(
          r.inspector_id,
          (kmByOfficer.get(r.inspector_id) || 0) + (r.total_distance_km || 0)
        )
    }
    const requests = (planRows || []).map((p: any) => ({
      inspectorId: p.inspector_id,
      name: nameOfUser.get(p.inspector_id) ?? null,
      weekStart: p.week_start,
      submittedAt: p.submitted_at,
      totalKm: kmByOfficer.get(p.inspector_id) ?? 0,
    }))

    // --- Unplanned ---
    await resolveUsers((evRows || []).map((e: any) => e.inspector_id))
    await resolveItems((evRows || []).map((e: any) => e.board_item_id).filter(Boolean))
    const unplanned = (evRows || []).map((e: any) => ({
      id: e.id,
      inspectorId: e.inspector_id,
      officerName: nameOfUser.get(e.inspector_id) ?? null,
      boardItemId: e.board_item_id,
      objectName: e.board_item_id ? (nameOfItem.get(e.board_item_id) ?? null) : null,
      date: e.visit_date,
      distanceKm: e.distance_km,
      reason: e.reason,
      status: e.status,
    }))

    // --- Deferred ---
    const deferred: any[] = []
    for (const r of defRoutes || []) {
      for (const st of r.route_stops || []) {
        if (st.status !== 'skipped') continue
        deferred.push({
          stopId: st.id,
          inspectorId: r.inspector_id,
          boardItemId: st.board_item_id,
          date: r.date,
          reason: st.skip_reason,
          note: st.skip_note,
          deferredAt: st.deferred_at,
        })
      }
    }
    await resolveUsers(deferred.map(d => d.inspectorId))
    await resolveItems(deferred.map(d => d.boardItemId).filter(Boolean))
    for (const d of deferred) {
      d.officerName = nameOfUser.get(d.inspectorId) ?? null
      d.objectName = d.boardItemId ? (nameOfItem.get(d.boardItemId) ?? null) : null
    }

    return NextResponse.json({ weekStart, requests, unplanned, deferred })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('admin-week GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
