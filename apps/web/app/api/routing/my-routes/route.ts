export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { parseCoordinates } from '@/lib/geo-utils'
import { resolveLocationColumns } from '@/features/routing/lib/location-columns'

// GET ?inspectorId=&from=&to= — an officer's routes with stops and resolved
// company (board item) names. Officers see only their own; admin/dispatcher
// may pass any inspectorId for oversight.
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const url = new URL(request.url)
    const requested = url.searchParams.get('inspectorId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const supabase = createServerClient() as any
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
    const isManager = roleRow?.role === 'admin' || roleRow?.role === 'dispatcher'

    const inspectorId = requested || session.user.id
    if (inspectorId !== session.user.id && !isManager)
      return NextResponse.json({ error: 'Cannot view another officer’s routes' }, { status: 403 })

    // Auth already enforced above; use the service client so a manager can read
    // any officer's routes regardless of row-level policies.
    const svc = createServiceClient() as any
    let query = svc
      .from('routes')
      .select(
        'id, name, date, status, start_time, end_time, total_distance_km, ' +
          'route_stops(id, board_item_id, company_id, position, status, distance_from_previous_km)'
      )
      .eq('inspector_id', inspectorId)
      .order('date', { ascending: true })
    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)

    const { data: routes, error } = await query
    if (error) throw error

    // Resolve stop display names. Weekly-planned stops carry board_item_id;
    // legacy stops carry company_id — resolve both, no FK embed (105 omits it).
    const itemIds = new Set<string>()
    const companyIds = new Set<string>()
    for (const r of routes || []) {
      for (const s of r.route_stops || []) {
        if (s.board_item_id) itemIds.add(s.board_item_id)
        else if (s.company_id) companyIds.add(s.company_id)
      }
    }

    const nameById = new Map<string, string>()
    const coordsById = new Map<string, { lat: number; lng: number }>()
    if (itemIds.size > 0) {
      const { data: items } = await svc
        .from('board_items')
        .select('id, name, board_id, data')
        .in('id', [...itemIds])

      // Find the coordinates column per board so we can parse each item's coords.
      const boardIds = [
        ...new Set((items || []).map((i: any) => i.board_id).filter(Boolean)),
      ] as string[]
      const coordsColByBoard = new Map<string, string | undefined>()
      if (boardIds.length > 0) {
        const { data: cols } = await svc
          .from('board_columns')
          .select('board_id, column_id, column_name, column_type, config')
          .in('board_id', boardIds)
        const byBoard = new Map<string, any[]>()
        for (const c of cols || []) {
          if (!byBoard.has(c.board_id)) byBoard.set(c.board_id, [])
          byBoard.get(c.board_id)!.push(c)
        }
        for (const bid of boardIds) {
          coordsColByBoard.set(bid, resolveLocationColumns(byBoard.get(bid) || []).coordsColumnId)
        }
      }

      for (const it of items || []) {
        nameById.set(it.id, it.name)
        const col = coordsColByBoard.get(it.board_id)
        const coords = col ? parseCoordinates(it.data?.[col]) : null
        if (coords) coordsById.set(it.id, coords)
      }
    }
    if (companyIds.size > 0) {
      const { data: companies } = await svc
        .from('companies')
        .select('id, name')
        .in('id', [...companyIds])
      for (const c of companies || []) nameById.set(c.id, c.name)
    }

    // The officer's home / route-start, for the map's home marker + line origin.
    const { data: transport } = await svc
      .from('officer_transport')
      .select('start_lat, start_lng, home_lat, home_lng')
      .eq('user_id', inspectorId)
      .maybeSingle()
    const start =
      transport?.start_lat != null && transport?.start_lng != null
        ? { lat: Number(transport.start_lat), lng: Number(transport.start_lng) }
        : transport?.home_lat != null && transport?.home_lng != null
          ? { lat: Number(transport.home_lat), lng: Number(transport.home_lng) }
          : null

    // Check-in state/time per stop. The board check-in flow links board_item_id
    // (not route_stop_id), so match the officer's check-ins by board_item_id +
    // the route's date. Keyed `${board_item_id}|${YYYY-MM-DD}`.
    const checkinByItemDate = new Map<
      string,
      { checkedInAt: string | null; checkedOutAt: string | null; durationMinutes: number | null }
    >()
    if (itemIds.size > 0) {
      const { data: checkins } = await svc
        .from('location_checkins')
        .select('board_item_id, created_at, checked_out_at, duration_minutes')
        .eq('inspector_id', inspectorId)
        .in('board_item_id', [...itemIds])
        .order('created_at', { ascending: true })
      for (const c of checkins || []) {
        if (!c.board_item_id || !c.created_at) continue
        // Key by the Georgia-local (UTC+4) day, matching how a route's date and
        // the check-in→stop status write are computed. Latest per item+day wins.
        const day = new Date(new Date(c.created_at).getTime() + 4 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
        checkinByItemDate.set(`${c.board_item_id}|${day}`, {
          checkedInAt: c.created_at,
          checkedOutAt: c.checked_out_at ?? null,
          durationMinutes: c.duration_minutes ?? null,
        })
      }
    }

    const result = (routes || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      date: r.date,
      status: r.status,
      startTime: r.start_time,
      endTime: r.end_time,
      totalDistanceKm: r.total_distance_km,
      stops: (r.route_stops || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((s: any) => {
          const key = s.board_item_id || s.company_id
          const coords = key ? coordsById.get(key) : null
          // Status is persisted on check-in/out (route_stops.status), so read it
          // straight. The check-in match here only surfaces the visit times.
          const ci = s.board_item_id
            ? checkinByItemDate.get(`${s.board_item_id}|${r.date}`)
            : undefined
          return {
            id: s.id,
            position: s.position,
            status: s.status,
            distanceFromPrevious: s.distance_from_previous_km,
            boardItemId: s.board_item_id,
            name: nameById.get(s.board_item_id) || nameById.get(s.company_id) || null,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            checkedInAt: ci?.checkedInAt ?? null,
            checkedOutAt: ci?.checkedOutAt ?? null,
            durationMinutes: ci?.durationMinutes ?? null,
          }
        }),
    }))

    return NextResponse.json({ inspectorId, start, routes: result })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('my-routes GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
