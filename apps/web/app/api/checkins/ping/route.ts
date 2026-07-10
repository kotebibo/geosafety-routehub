/**
 * @swagger
 * /api/checkins/ping:
 *   post:
 *     summary: Submit a GPS ping during an active check-in
 *     description: Records the inspector's current position while checked in. Computes distance from the reference location (company location or original check-in coords) and flags whether the inspector is within the 150m geofence. Violation counts are aggregated at checkout.
 *     tags: [Checkins]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [checkin_id, lat, lng]
 *             properties:
 *               checkin_id:
 *                 type: string
 *                 format: uuid
 *               lat:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               lng:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *               accuracy:
 *                 type: number
 *     responses:
 *       200:
 *         description: Ping recorded with distance result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 distance:
 *                   type: integer
 *                   description: Distance in meters from reference location
 *                 within_radius:
 *                   type: boolean
 *                 warning:
 *                   type: string
 *                   nullable: true
 *                   description: Warning message when outside radius
 *       400:
 *         description: Validation failed or check-in already closed
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Check-in not found
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { haversineMeters } from '@/lib/geo-utils'

const RADIUS_METERS = 150

const pingSchema = z.object({
  checkin_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    await requireAuth()
    const body = await request.json()
    const validated = pingSchema.parse(body)

    // Get the active checkin with its reference location
    const { data: checkin, error: fetchError } = await supabase
      .from('location_checkins')
      .select('*')
      .eq('id', validated.checkin_id)
      .single()

    if (fetchError || !checkin) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
    }

    if ((checkin as any).checked_out_at) {
      return NextResponse.json({ error: 'Check-in already closed' }, { status: 400 })
    }

    // Get reference coordinates (company location or original checkin coords)
    let refLat = checkin.lat
    let refLng = checkin.lng

    if ((checkin as any).company_location_id) {
      const { data: loc } = await supabase
        .from('company_locations')
        .select('lat, lng')
        .eq('id', (checkin as any).company_location_id)
        .single()

      if (loc?.lat != null && loc?.lng != null) {
        refLat = loc.lat
        refLng = loc.lng
      }
    }

    const distance = Math.round(haversineMeters(validated.lat, validated.lng, refLat, refLng))
    const withinRadius = distance <= RADIUS_METERS

    // Insert ping
    const { error: insertError } = await (supabase as any).from('checkin_gps_pings').insert({
      checkin_id: validated.checkin_id,
      lat: validated.lat,
      lng: validated.lng,
      accuracy: validated.accuracy || null,
      distance_from_location: distance,
      within_radius: withinRadius,
    })

    if (insertError) throw insertError

    // Note: violation/ping counts are calculated at checkout time from pings table

    return NextResponse.json({
      distance,
      within_radius: withinRadius,
      warning: !withinRadius
        ? `თქვენ იმყოფებით ${distance}მ მანძილზე ნაცვლად ${RADIUS_METERS}მ რადიუსისა`
        : null,
    })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('GPS ping error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
