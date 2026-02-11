import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/middleware/auth'
import { UnauthorizedError, ForbiddenError } from '@/middleware/auth'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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
    const body = await request.json()
    const validated = locationSchema.parse(body)

    // Verify the inspector belongs to this user (or user is admin/dispatcher)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    const isPrivileged = userRole?.role === 'admin' || userRole?.role === 'dispatcher'

    if (!isPrivileged) {
      const { data: inspector } = await supabase
        .from('inspectors')
        .select('email')
        .eq('id', validated.inspector_id)
        .single()

      if (!inspector || inspector.email !== session.user.email) {
        return NextResponse.json({ error: 'Not authorized for this inspector' }, { status: 403 })
      }
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

      supabase
        .from('inspector_location_history')
        .insert({
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
            'Authorization': `Basic ${Buffer.from(ablyApiKey).toString('base64')}`,
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
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Location update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
