export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { UnauthorizedError, ForbiddenError } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const supabase = createServerClient()

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const today = new Date().toISOString().split('T')[0]

    // Get inspectors with recent location updates
    const { data: inspectors, error: inspError } = await supabase
      .from('inspectors')
      .select('id, full_name, phone, last_location_update')
      .not('last_location_update', 'is', null)
      .gte('last_location_update', thirtyMinAgo)
      .eq('status', 'active')

    if (inspError) throw inspError

    const result = []

    for (const inspector of inspectors || []) {
      // Get latest location from history
      // PostGIS table not in generated types
      const { data: latestLoc } = await (supabase as any)
        .from('inspector_location_history')
        .select('lat, lng')
        .eq('inspector_id', inspector.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()

      if (!latestLoc) continue

      // Get active route for today
      const { data: route } = await supabase
        .from('routes')
        .select('id, name, status, route_stops(id, status)')
        .eq('inspector_id', inspector.id)
        .eq('date', today)
        .in('status', ['planned', 'in_progress'])
        .limit(1)
        .single()

      result.push({
        id: inspector.id,
        full_name: inspector.full_name,
        phone: inspector.phone,
        lat: latestLoc.lat,
        lng: latestLoc.lng,
        last_location_update: inspector.last_location_update,
        active_route: route
          ? {
              id: route.id,
              name: route.name,
              status: route.status,
              total_stops: (route.route_stops as any[])?.length || 0,
              completed_stops:
                (route.route_stops as any[])?.filter((s: any) => s.status === 'completed').length ||
                0,
            }
          : null,
      })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Active inspectors error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
