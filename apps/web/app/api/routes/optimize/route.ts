/**
 * Route Optimization API Endpoint
 * POST /api/routes/optimize
 * Protected: Requires authentication (admin/dispatcher)
 */

import { NextRequest, NextResponse } from 'next/server'
import { optimizeRoute, type Location, type OptimizationOptions } from '@geosafety/route-optimizer'
import { requireAdminOrDispatcher } from '@/middleware/auth'

export async function POST(request: NextRequest) {
  try {
    // Require admin or dispatcher role to optimize routes
    await requireAdminOrDispatcher();

    const body = await request.json()
    const { locations, options }: { locations: Location[]; options?: OptimizationOptions } = body
    
    // Validate input
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        { error: 'Invalid locations data' },
        { status: 400 }
      )
    }
    
    // Validate location format
    for (const loc of locations) {
      if (!loc.id || !loc.name || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
        return NextResponse.json(
          { error: 'Each location must have id, name, lat, and lng' },
          { status: 400 }
        )
      }
    }
    
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
      {
        error: 'Route optimization failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
