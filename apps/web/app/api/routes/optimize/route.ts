/**
 * @swagger
 * /api/routes/optimize:
 *   post:
 *     summary: Optimize a route's stop order
 *     description: Accepts a list of locations and returns an optimized stop sequence. Uses OSRM real-road routing by default. Requires admin or dispatcher role.
 *     tags: [Routes]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [locations]
 *             properties:
 *               locations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [lat, lng]
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     lat:
 *                       type: number
 *                     lng:
 *                       type: number
 *               options:
 *                 type: object
 *                 properties:
 *                   useRealRoads:
 *                     type: boolean
 *                     description: Use OSRM road routing (default true)
 *     responses:
 *       200:
 *         description: Optimized route with stop order and metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 route:
 *                   type: object
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     inputStops:
 *                       type: integer
 *                     outputStops:
 *                       type: integer
 *                     algorithm:
 *                       type: string
 *                     usingRealRoads:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
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
import { z } from 'zod'
import { optimizeRoute, type Location, type OptimizationOptions } from '@routehub/route-optimizer'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { optimizeRouteSchema, type OptimizeRouteInput } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // Require admin or dispatcher role to optimize routes
    await requireAdminOrDispatcher()

    const rawBody = await request.json()

    // Validate input with Zod
    let body: OptimizeRouteInput
    try {
      body = optimizeRouteSchema.parse(rawBody)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }
      throw error
    }

    const { locations, options } = body

    // Optimize route (now async for OSRM support)
    const optimized = await optimizeRoute(locations, {
      ...options,
      useRealRoads: options?.useRealRoads !== false, // Default true
    })

    return NextResponse.json({
      success: true,
      route: optimized,
      metadata: {
        inputStops: locations.length,
        outputStops: optimized.stops.length,
        algorithm: optimized.algorithm,
        usingRealRoads: optimized.metadata.usingRealRoads,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Route optimization error:', error)

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
