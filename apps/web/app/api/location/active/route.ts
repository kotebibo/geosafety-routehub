/**
 * @swagger
 * /api/location/active:
 *   get:
 *     summary: Get currently active inspectors with live locations
 *     description: Returns inspectors who reported a location within the last 30 minutes, including their latest coordinates and today's active route progress.
 *     tags: [Location]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of active inspectors with location and route data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   full_name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *                   last_location_update:
 *                     type: string
 *                     format: date-time
 *                   active_route:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       total_stops:
 *                         type: integer
 *                       completed_stops:
 *                         type: integer
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher role required
 *       500:
 *         description: Internal server error
 */

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

    if (!inspectors || inspectors.length === 0) {
      return NextResponse.json([])
    }

    const inspectorIds = inspectors.map((i: any) => i.id)

    // Fetch all locations and routes in parallel (2 queries instead of 2*N)
    const [{ data: allLocations }, { data: allRoutes }] = await Promise.all([
      (supabase as any)
        .from('inspector_location_history')
        .select('inspector_id, lat, lng, recorded_at')
        .in('inspector_id', inspectorIds)
        .order('recorded_at', { ascending: false }),
      supabase
        .from('routes')
        .select('id, name, status, inspector_id, route_stops(id, status)')
        .in('inspector_id', inspectorIds)
        .eq('date', today)
        .in('status', ['planned', 'in_progress']),
    ])

    // Index: latest location per inspector (first occurrence since ordered desc)
    const latestLocByInspector = new Map<string, { lat: number; lng: number }>()
    for (const loc of allLocations || []) {
      if (!latestLocByInspector.has(loc.inspector_id)) {
        latestLocByInspector.set(loc.inspector_id, { lat: loc.lat, lng: loc.lng })
      }
    }

    // Index: route per inspector
    const routeByInspector = new Map<string, any>()
    for (const route of allRoutes || []) {
      if (route.inspector_id && !routeByInspector.has(route.inspector_id)) {
        routeByInspector.set(route.inspector_id, route)
      }
    }

    const result = inspectors
      .map((inspector: any) => {
        const loc = latestLocByInspector.get(inspector.id)
        if (!loc) return null

        const route = routeByInspector.get(inspector.id)
        return {
          id: inspector.id,
          full_name: inspector.full_name,
          phone: inspector.phone,
          lat: loc.lat,
          lng: loc.lng,
          last_location_update: inspector.last_location_update,
          active_route: route
            ? {
                id: route.id,
                name: route.name,
                status: route.status,
                total_stops: (route.route_stops as any[])?.length || 0,
                completed_stops:
                  (route.route_stops as any[])?.filter((s: any) => s.status === 'completed')
                    .length || 0,
              }
            : null,
        }
      })
      .filter(Boolean)

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
