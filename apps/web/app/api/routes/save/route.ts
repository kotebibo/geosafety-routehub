/**
 * @swagger
 * /api/routes/save:
 *   post:
 *     summary: Save a planned route with stops
 *     description: Creates a route record and its stops. When a service type and inspector are specified, updates company_services inspection dates and creates inspection_history records. Requires admin or dispatcher role.
 *     tags: [Routes]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, date, stops]
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               inspectorId:
 *                 type: string
 *                 format: uuid
 *               serviceTypeId:
 *                 type: string
 *                 format: uuid
 *               startTime:
 *                 type: string
 *               totalDistance:
 *                 type: number
 *                 description: Total route distance in km
 *               totalDuration:
 *                 type: number
 *                 description: Total route duration in minutes
 *               optimizationType:
 *                 type: string
 *                 enum: [distance, duration]
 *               routeGeometry:
 *                 type: object
 *                 description: GeoJSON route geometry from OSRM
 *               stops:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [companyId, position]
 *                   properties:
 *                     companyId:
 *                       type: string
 *                       format: uuid
 *                     companyServiceId:
 *                       type: string
 *                       format: uuid
 *                     position:
 *                       type: integer
 *                     distanceFromPrevious:
 *                       type: number
 *                     durationFromPrevious:
 *                       type: number
 *     responses:
 *       200:
 *         description: Route saved with inspection dates updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 route:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date
 *                     serviceTypeId:
 *                       type: string
 *                       format: uuid
 *                     totalStops:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failed
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
import { z } from 'zod'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { saveRouteSchema, type SaveRouteInput } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // Require admin or dispatcher role to save routes
    await requireAdminOrDispatcher()
    const supabase = createServerClient()

    const rawBody = await request.json()

    // Validate input with Zod
    let body: SaveRouteInput
    try {
      body = saveRouteSchema.parse(rawBody)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }
      throw error
    }

    // Insert route with service_type_id
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .insert({
        name: body.name,
        date: body.date,
        inspector_id: body.inspectorId || null,
        service_type_id: body.serviceTypeId || null, // NEW
        status: 'planned',
        start_time: body.startTime || null,
        total_distance_km: body.totalDistance,
        total_duration_minutes: body.totalDuration || null,
        optimization_type: body.optimizationType || 'distance',
        route_geometry: body.routeGeometry ? JSON.stringify(body.routeGeometry) : null,
      })
      .select()
      .single()

    if (routeError) {
      console.error('Route insert error:', routeError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Insert route stops
    const stops = body.stops.map(stop => ({
      route_id: route.id,
      company_id: stop.companyId,
      position: stop.position,
      distance_from_previous_km: stop.distanceFromPrevious || 0,
      duration_from_previous_minutes: stop.durationFromPrevious || null,
      status: 'pending',
    }))

    const { error: stopsError } = await supabase.from('route_stops').insert(stops)

    if (stopsError) {
      console.error('Route stops insert error:', stopsError)
      await supabase.from('routes').delete().eq('id', route.id)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // NEW: Service-aware route saving
    if (body.serviceTypeId && body.inspectorId) {
      // Get service type details for frequency calculation
      const { data: serviceType } = await supabase
        .from('service_types')
        .select('default_frequency_days')
        .eq('id', body.serviceTypeId)
        .single()

      const frequencyDays = serviceType?.default_frequency_days || 90

      // Update company_services for each stop
      for (const stop of body.stops) {
        if (stop.companyServiceId) {
          // Calculate next inspection date
          const routeDate = new Date(body.date)
          const nextDate = new Date(routeDate)
          nextDate.setDate(nextDate.getDate() + frequencyDays)

          // Update company service
          await supabase
            .from('company_services')
            .update({
              last_inspection_date: body.date,
              next_inspection_date: nextDate.toISOString().split('T')[0],
              assigned_inspector_id: body.inspectorId,
            })
            .eq('id', stop.companyServiceId)

          // Create placeholder inspection_history record
          await supabase.from('inspection_history').insert({
            company_id: stop.companyId,
            service_type_id: body.serviceTypeId,
            inspector_id: body.inspectorId,
            route_id: route.id,
            inspection_date: body.date,
            status: 'in_progress', // Will be updated when route is completed
            notes: `Route: ${body.name}`,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      route: {
        id: route.id,
        name: route.name,
        date: route.date,
        serviceTypeId: body.serviceTypeId,
        totalStops: body.stops.length,
      },
      message: 'Route saved successfully! Inspection dates updated.',
    })
  } catch (error) {
    console.error('Save route error:', error)

    // Handle authentication errors
    if (error instanceof Error && error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
