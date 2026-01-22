/**
 * Route Optimization API Endpoint
 * POST /api/routes/optimize
 * Protected: Requires authentication (admin/dispatcher)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { optimizeRoute, type Location, type OptimizationOptions } from '@geosafety/route-optimizer'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { optimizeRouteSchema, type OptimizeRouteInput } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // Require admin or dispatcher role to optimize routes
    await requireAdminOrDispatcher();

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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Route optimization failed' },
      { status: 500 }
    )
  }
}
