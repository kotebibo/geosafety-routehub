/**
 * @swagger
 * /api/location/update:
 *   post:
 *     summary: Submit a GPS location update for an inspector
 *     description: Updates the inspector's current location, inserts a history record, and broadcasts the update via Ably. The caller must own the inspector_id or hold admin/dispatcher role.
 *     tags: [Location]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inspector_id, latitude, longitude]
 *             properties:
 *               inspector_id:
 *                 type: string
 *                 format: uuid
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *               accuracy:
 *                 type: number
 *               speed:
 *                 type: number
 *               heading:
 *                 type: number
 *               route_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized for this inspector
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/middleware/auth'
import { UnauthorizedError, ForbiddenError } from '@/middleware/auth'
import { z } from 'zod'

const locationSchema = z.object({
  inspector_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  route_id: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const supabase = createServerClient()
    const body = await request.json()
    const validated = locationSchema.parse(body)

    // Verify ownership: user must own this ID or be admin/dispatcher
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    const isPrivileged = userRole?.role === 'admin' || userRole?.role === 'dispatcher'

    if (!isPrivileged && session.user.id !== validated.inspector_id) {
      return NextResponse.json({ error: 'Not authorized for this user' }, { status: 403 })
    }

    const pointWKT = `POINT(${validated.longitude} ${validated.latitude})`

    // Update current location + insert history in parallel
    const [updateResult, insertResult] = await Promise.all([
      supabase
        .from('inspectors')
        .update({
          current_location: pointWKT,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', validated.inspector_id),

      // PostGIS table not in generated types
      (supabase as any).from('inspector_location_history').insert({
        inspector_id: validated.inspector_id,
        lat: validated.latitude,
        lng: validated.longitude,
        accuracy: validated.accuracy,
        speed: validated.speed,
        heading: validated.heading,
        route_id: validated.route_id,
      }),
    ])

    if (updateResult.error) {
      console.error('Inspector location update error:', updateResult.error)
    }
    if (insertResult.error) {
      console.error('Location history insert error:', insertResult.error)
    }

    // Broadcast via Ably REST API
    const ablyApiKey = process.env.ABLY_API_KEY || process.env.NEXT_PUBLIC_ABLY_API_KEY
    if (ablyApiKey) {
      const channelName = `location:inspector:${validated.inspector_id}`
      try {
        await fetch(`https://rest.ably.io/channels/${encodeURIComponent(channelName)}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(ablyApiKey).toString('base64')}`,
          },
          body: JSON.stringify({
            name: 'location',
            data: {
              inspector_id: validated.inspector_id,
              latitude: validated.latitude,
              longitude: validated.longitude,
              accuracy: validated.accuracy,
              speed: validated.speed,
              heading: validated.heading,
              route_id: validated.route_id,
              timestamp: new Date().toISOString(),
            },
          }),
        })
      } catch (ablyError) {
        console.error('Ably broadcast failed:', ablyError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Location update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
