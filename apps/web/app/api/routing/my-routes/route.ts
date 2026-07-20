export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

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
    if (itemIds.size > 0) {
      const { data: items } = await svc
        .from('board_items')
        .select('id, name')
        .in('id', [...itemIds])
      for (const it of items || []) nameById.set(it.id, it.name)
    }
    if (companyIds.size > 0) {
      const { data: companies } = await svc
        .from('companies')
        .select('id, name')
        .in('id', [...companyIds])
      for (const c of companies || []) nameById.set(c.id, c.name)
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
        .map((s: any) => ({
          id: s.id,
          position: s.position,
          status: s.status,
          distanceFromPrevious: s.distance_from_previous_km,
          boardItemId: s.board_item_id,
          name: nameById.get(s.board_item_id) || nameById.get(s.company_id) || null,
        })),
    }))

    return NextResponse.json({ inspectorId, routes: result })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('my-routes GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
