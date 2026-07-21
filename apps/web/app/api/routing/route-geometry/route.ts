export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRouteWithGeometry } from '@routehub/route-optimizer'
import { requireAuth } from '@/middleware/auth'

const schema = z.object({
  // Ordered path (home first, then stops in visiting order).
  locations: z
    .array(z.object({ lat: z.number(), lng: z.number() }))
    .min(2)
    .max(50),
})

// POST — real-road geometry (OSRM driving) for an ordered path, so the map can
// draw the actual roads from home through the stops (Haversine straight-line
// fallback if OSRM is unavailable). Any authenticated user.
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const { locations } = schema.parse(await request.json())

    const result = await getRouteWithGeometry(locations)
    return NextResponse.json({
      geometry: result.geometry, // [lng, lat] pairs
      distanceKm: result.distance,
      isEstimate: result.isEstimate ?? false,
    })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('route-geometry POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
