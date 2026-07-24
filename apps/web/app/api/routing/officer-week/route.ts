export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSelfOrManager } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { georgiaMondayOfDate, weekDatesFrom } from '@/lib/time'

// GET ?inspectorId=&weekStart= — one officer's routing extras for a week:
//   unplanned — extra-visit requests (with reason)
//   deviation — deferred/skipped stops this week (reason/note/confirm state)
//   failed    — earlier deferred+unvisited stops that weren't "canceled+confirmed"
//               (paid but wasted → excluded from cost). Officers see own; managers any.
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const inspectorId = url.searchParams.get('inspectorId')
    const weekStart = url.searchParams.get('weekStart')
    if (!inspectorId || !weekStart)
      return NextResponse.json({ error: 'inspectorId and weekStart required' }, { status: 400 })

    // Officers see their own week; managers may view anyone's.
    await requireSelfOrManager(inspectorId)

    const svc = createServiceClient() as any
    const dates = weekDatesFrom(weekStart)
    const weekEnd = dates[6]

    const nameOfItem = new Map<string, string>()
    const resolveItems = async (ids: (string | null)[]) => {
      const miss = [...new Set(ids.filter(Boolean))].filter(id => !nameOfItem.has(id as string))
      if (!miss.length) return
      const { data } = await svc.from('board_items').select('id, name').in('id', miss)
      for (const it of data || []) nameOfItem.set(it.id, it.name)
    }

    // Unplanned (extra visits this week).
    const { data: ev } = await svc
      .from('extra_visits')
      .select('id, board_item_id, visit_date, distance_km, reason, status')
      .eq('inspector_id', inspectorId)
      .gte('visit_date', weekStart)
      .lte('visit_date', weekEnd)
      .order('created_at', { ascending: true })
    await resolveItems((ev || []).map((e: any) => e.board_item_id))
    const unplanned = (ev || []).map((e: any, i: number) => ({
      id: e.id,
      number: i + 1,
      boardItemId: e.board_item_id,
      name: e.board_item_id ? (nameOfItem.get(e.board_item_id) ?? null) : null,
      date: e.visit_date,
      distanceKm: e.distance_km,
      reason: e.reason,
      status: e.status,
    }))

    // Deviation (skipped stops THIS week) + Failed (skipped BEFORE this week,
    // not canceled+confirmed).
    const { data: routes } = await svc
      .from('routes')
      .select(
        'date, route_stops(id, board_item_id, status, skip_reason, skip_note, skip_confirmed, deferred_at)'
      )
      .eq('inspector_id', inspectorId)
      .lte('date', weekEnd)
    // "failed" only counts objects from an APPROVED (fuel-bought) prior week —
    // mirrors the prepaid carry-over rule so the two features agree.
    const { data: approvedPlans } = await svc
      .from('week_plans')
      .select('week_start')
      .eq('inspector_id', inspectorId)
      .eq('status', 'approved')
      .lt('week_start', weekStart)
    const approvedWeeks = new Set<string>((approvedPlans || []).map((p: any) => p.week_start))
    const deviation: any[] = []
    // Failed = objects whose LATEST prior stop was an unresolved skip (paid but
    // not visited, not canceled+confirmed). Tracking only the latest prior stop
    // per object means one that was later visited no longer shows as failed.
    const priorLatest = new Map<string, any>()
    for (const r of routes || []) {
      for (const s of r.route_stops || []) {
        if (r.date >= weekStart && r.date <= weekEnd) {
          if (s.status === 'skipped')
            deviation.push({
              stopId: s.id,
              boardItemId: s.board_item_id,
              date: r.date,
              reason: s.skip_reason,
              note: s.skip_note,
              confirmed: s.skip_confirmed,
            })
        } else if (r.date < weekStart && s.board_item_id) {
          const prev = priorLatest.get(s.board_item_id)
          if (!prev || r.date > prev.date) priorLatest.set(s.board_item_id, { ...s, date: r.date })
        }
      }
    }
    const failed = Array.from(priorLatest.values())
      .filter(
        s =>
          s.status === 'skipped' &&
          !(s.skip_reason === 'canceled' && s.skip_confirmed) &&
          approvedWeeks.has(georgiaMondayOfDate(s.date))
      )
      .map(s => ({
        stopId: s.id,
        boardItemId: s.board_item_id,
        date: s.date,
        reason: s.skip_reason,
        note: s.skip_note,
        confirmed: s.skip_confirmed,
      }))
    await resolveItems([...deviation, ...failed].map(x => x.boardItemId))
    for (const x of [...deviation, ...failed])
      x.name = x.boardItemId ? (nameOfItem.get(x.boardItemId) ?? null) : null

    return NextResponse.json({ inspectorId, weekStart, unplanned, deviation, failed })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ error: 'Cannot view another officer’s data' }, { status: 403 })
    console.error('officer-week GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
