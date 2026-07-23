export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { georgiaDateOf, georgiaDayRange, georgiaToday, georgiaTimeOfDay } from '@/lib/time'

// GET ?inspectorId=&boardId=&weekStart=YYYY-MM-DD
// Execution vs plan for one officer + board in a given week:
//   unplannedVisits — check-ins this week on this board's items that were NOT
//                     in the week's plan ("დაუგეგმავი ვიზიტი")
//   missedPlanned   — planned stops this week not yet visited ("გეგმიდან გადახვევა")
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const url = new URL(request.url)
    const inspectorId = url.searchParams.get('inspectorId')
    const boardId = url.searchParams.get('boardId')
    const weekStart = url.searchParams.get('weekStart')
    if (!inspectorId || !boardId || !weekStart)
      return NextResponse.json(
        { error: 'inspectorId, boardId and weekStart are required' },
        { status: 400 }
      )

    // Self, or a manager viewing anyone.
    const supabase = createServerClient() as any
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
    const isManager = roleRow?.role === 'admin' || roleRow?.role === 'dispatcher'
    if (inspectorId !== session.user.id && !isManager)
      return NextResponse.json({ error: 'Cannot view another officer’s plan' }, { status: 403 })

    const svc = createServiceClient() as any

    // Week range (Sunday end, YYYY-MM-DD).
    const weekEnd = new Date(new Date(`${weekStart}T00:00:00.000Z`).getTime() + 6 * 86400000)
      .toISOString()
      .slice(0, 10)

    // This board's items (id → name) — scopes "unplanned visits" to this board.
    const { data: items } = await svc.from('board_items').select('id, name').eq('board_id', boardId)
    const nameById = new Map<string, string>((items || []).map((i: any) => [i.id, i.name]))
    const boardItemIds = new Set<string>((items || []).map((i: any) => i.id))

    // The week's planned stops for this officer.
    const { data: routes } = await svc
      .from('routes')
      .select('date, route_stops(board_item_id, position, status)')
      .eq('inspector_id', inspectorId)
      .gte('date', weekStart)
      .lte('date', weekEnd)
    const plannedByItem = new Map<string, { date: string; status: string | null }>()
    for (const r of routes || [])
      for (const s of r.route_stops || [])
        if (s.board_item_id && boardItemIds.has(s.board_item_id))
          plannedByItem.set(s.board_item_id, { date: r.date, status: s.status })

    // The officer's check-ins this week (on this board's items), bounded by the
    // Georgia week in UTC so rows near midnight land in the right week.
    const ciRange = georgiaDayRange(weekStart, weekEnd)
    const { data: checkins } = await svc
      .from('location_checkins')
      .select('board_item_id, created_at')
      .eq('inspector_id', inspectorId)
      .gte('created_at', ciRange.gte)
      .lte('created_at', ciRange.lte)
      .order('created_at', { ascending: true })
    // Georgia "now" as a naive local datetime, for the 21:00 cutoff comparison.
    const georgiaNow = `${georgiaToday()}T${georgiaTimeOfDay()}`

    const visitedItems = new Set<string>() // any check-in this week
    const visitDayByItem = new Map<string, string>() // first visit day (unplanned display)
    const checkinOnDay = new Set<string>() // `${itemId}|${georgiaDay}`
    for (const c of checkins || []) {
      if (!c.board_item_id || !boardItemIds.has(c.board_item_id) || !c.created_at) continue
      const day = georgiaDateOf(c.created_at)
      if (!visitedItems.has(c.board_item_id)) visitDayByItem.set(c.board_item_id, day)
      visitedItems.add(c.board_item_id)
      checkinOnDay.add(`${c.board_item_id}|${day}`)
    }

    // Unplanned: visited this week on an item that wasn't in the plan at all.
    const unplannedVisits = [...visitedItems]
      .filter(itemId => !plannedByItem.has(itemId))
      .map(itemId => ({
        boardItemId: itemId,
        name: nameById.get(itemId) ?? null,
        date: visitDayByItem.get(itemId) ?? '',
      }))

    // Deviation: a planned stop not visited on its planned day, once that day's
    // 21:00 (Georgia) has passed. A late (next-day) check-in leaves it here — it
    // stays a deviation for the record, since the planned day was missed.
    const missedPlanned = [...plannedByItem.entries()]
      .filter(([itemId, p]) => {
        if (p.status === 'completed' || p.status === 'visited') return false
        if (checkinOnDay.has(`${itemId}|${p.date}`)) return false // visited on time
        return georgiaNow >= `${p.date}T21:00:00` // past 21:00 of the planned day
      })
      .map(([itemId, p]) => ({
        boardItemId: itemId,
        name: nameById.get(itemId) ?? null,
        date: p.date,
        lateVisitedOn: visitedItems.has(itemId) ? (visitDayByItem.get(itemId) ?? null) : null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ weekStart, unplannedVisits, missedPlanned })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('week-execution GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
