export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const RADIUS_METERS = 200

const pingSchema = z.object({
  checkin_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
})

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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
