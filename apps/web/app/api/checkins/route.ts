import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireRole } from '@/middleware/auth'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const createCheckinSchema = z.object({
  inspector_id: z.string().uuid(),
  company_id: z.string().uuid(),
  company_location_id: z.string().uuid().nullable().optional(),
  route_stop_id: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  notes: z.string().max(2000).optional(),
})

const checkoutSchema = z.object({
  checkin_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
})

// Haversine distance in meters
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

// Sync a check-in to all boards of type 'checkins'
async function syncCheckinToBoards(
  checkin: any,
  input: { lat: number; lng: number; accuracy?: number; notes?: string },
  locationUpdated: boolean,
  distanceFromLocation: number | null
) {
  const { data: boards } = await supabase
    .from('boards')
    .select('id')
    .eq('board_type', 'checkins')

  if (!boards || boards.length === 0) return

  const [inspectorRes, companyRes, locationRes] = await Promise.all([
    supabase.from('inspectors').select('full_name').eq('id', checkin.inspector_id).single(),
    supabase.from('companies').select('name').eq('id', checkin.company_id).single(),
    checkin.company_location_id
      ? supabase.from('company_locations').select('name').eq('id', checkin.company_location_id).single()
      : Promise.resolve({ data: null }),
  ])

  const inspectorName = inspectorRes.data?.full_name || 'Unknown'
  const companyName = companyRes.data?.name || 'Unknown'
  const locationName = locationRes.data?.name || ''

  for (const board of boards) {
    const { data: groups } = await supabase
      .from('board_groups')
      .select('id')
      .eq('board_id', board.id)
      .order('position', { ascending: true })
      .limit(1)

    const groupId = groups?.[0]?.id || null

    const { count } = await supabase
      .from('board_items')
      .select('*', { count: 'exact', head: true })
      .eq('board_id', board.id)

    const { error: insertError } = await supabase.from('board_items').insert({
      board_id: board.id,
      group_id: groupId,
      position: (count || 0),
      name: `${companyName} — ${inspectorName}`,
      created_by: checkin.inspector_id,
      data: {
        checkin_id: checkin.id,
        inspector: inspectorName,
        company: companyName,
        location: locationName,
        checkin_date: checkin.created_at,
        coordinates: `${input.lat.toFixed(6)}, ${input.lng.toFixed(6)}`,
        distance: distanceFromLocation,
        accuracy: input.accuracy ? Math.round(input.accuracy) : null,
        gps_updated: locationUpdated,
        notes: input.notes || '',
        checkout_date: null,
        checkout_coordinates: null,
        duration_minutes: null,
      },
      status: 'active',
    })

    if (insertError) {
      console.error(`Failed to sync checkin to board ${board.id}:`, insertError)
    }
  }
}

// Sync checkout to matching board items
async function syncCheckoutToBoards(
  checkinId: string,
  checkoutData: { checked_out_at: string; lat: number; lng: number; duration_minutes: number }
) {
  const { data: boards } = await supabase
    .from('boards')
    .select('id')
    .eq('board_type', 'checkins')

  if (!boards || boards.length === 0) return

  for (const board of boards) {
    // Find board items where data->checkin_id matches
    const { data: items } = await supabase
      .from('board_items')
      .select('id, data')
      .eq('board_id', board.id)
      .filter('data->>checkin_id', 'eq', checkinId)

    if (!items || items.length === 0) continue

    for (const item of items) {
      const { error: updateError } = await supabase
        .from('board_items')
        .update({
          data: {
            ...item.data,
            checkout_date: checkoutData.checked_out_at,
            checkout_coordinates: `${checkoutData.lat.toFixed(6)}, ${checkoutData.lng.toFixed(6)}`,
            duration_minutes: checkoutData.duration_minutes,
          },
          status: 'completed',
        })
        .eq('id', item.id)

      if (updateError) {
        console.error(`Failed to sync checkout to board item ${item.id}:`, updateError)
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const validated = createCheckinSchema.parse(body)

    // Verify inspector ownership: user must own this inspector_id or be admin/dispatcher
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role, inspector_id')
      .eq('user_id', session.user.id)
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 403 })
    }

    const isAdminOrDispatcher = userRole.role === 'admin' || userRole.role === 'dispatcher'
    if (!isAdminOrDispatcher && userRole.inspector_id !== validated.inspector_id) {
      return NextResponse.json({ error: 'Cannot check in as another inspector' }, { status: 403 })
    }

    let locationUpdated = false
    let distanceFromLocation: number | null = null

    // Check if company location has GPS coords
    if (validated.company_location_id) {
      const { data: loc } = await supabase
        .from('company_locations')
        .select('lat, lng')
        .eq('id', validated.company_location_id)
        .single()

      if (loc) {
        if (loc.lat != null && loc.lng != null) {
          // Calculate distance
          distanceFromLocation = Math.round(
            haversineMeters(validated.lat, validated.lng, loc.lat, loc.lng)
          )
        } else {
          // No GPS coords — auto-populate from check-in
          await supabase
            .from('company_locations')
            .update({ lat: validated.lat, lng: validated.lng })
            .eq('id', validated.company_location_id)

          locationUpdated = true
        }
      }
    }

    // Insert check-in
    const { data: checkin, error } = await supabase
      .from('location_checkins')
      .insert({
        inspector_id: validated.inspector_id,
        company_id: validated.company_id,
        company_location_id: validated.company_location_id || null,
        route_stop_id: validated.route_stop_id || null,
        lat: validated.lat,
        lng: validated.lng,
        accuracy: validated.accuracy || null,
        notes: validated.notes || null,
        location_updated: locationUpdated,
        distance_from_location: distanceFromLocation,
      })
      .select()
      .single()

    if (error) throw error

    // Update route stop if linked
    if (validated.route_stop_id) {
      await supabase
        .from('route_stops')
        .update({
          status: 'completed',
          actual_arrival_time: new Date().toTimeString().slice(0, 8),
        })
        .eq('id', validated.route_stop_id)
    }

    // Sync to checkins boards (fire-and-forget, don't block the response)
    syncCheckinToBoards(checkin, validated, locationUpdated, distanceFromLocation).catch(
      (err) => console.error('Board sync error:', err)
    )

    return NextResponse.json({
      ...checkin,
      location_updated: locationUpdated,
      distance_from_location: distanceFromLocation,
    }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Check-in error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Check out (close an active check-in)
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const validated = checkoutSchema.parse(body)

    // Get the checkin
    const { data: checkin, error: fetchError } = await supabase
      .from('location_checkins')
      .select('*')
      .eq('id', validated.checkin_id)
      .single()

    if (fetchError || !checkin) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
    }

    // Already checked out
    if (checkin.checked_out_at) {
      return NextResponse.json({ error: 'Already checked out' }, { status: 400 })
    }

    // Verify ownership
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role, inspector_id')
      .eq('user_id', session.user.id)
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 403 })
    }

    const isAdminOrDispatcher = userRole.role === 'admin' || userRole.role === 'dispatcher'
    if (!isAdminOrDispatcher && userRole.inspector_id !== checkin.inspector_id) {
      return NextResponse.json({ error: 'Cannot check out another inspector' }, { status: 403 })
    }

    // Calculate duration in minutes
    const checkinTime = new Date(checkin.created_at).getTime()
    const now = Date.now()
    const durationMinutes = Math.round((now - checkinTime) / 60000)
    const checkedOutAt = new Date(now).toISOString()

    // Update the checkin
    const { data: updated, error: updateError } = await supabase
      .from('location_checkins')
      .update({
        checked_out_at: checkedOutAt,
        checkout_lat: validated.lat,
        checkout_lng: validated.lng,
        checkout_accuracy: validated.accuracy || null,
        duration_minutes: durationMinutes,
      })
      .eq('id', validated.checkin_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Sync checkout to boards (fire-and-forget)
    syncCheckoutToBoards(validated.checkin_id, {
      checked_out_at: checkedOutAt,
      lat: validated.lat,
      lng: validated.lng,
      duration_minutes: durationMinutes,
    }).catch((err) => console.error('Board checkout sync error:', err))

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Check-out error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)

    // Get user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role, inspector_id')
      .eq('user_id', session.user.id)
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 403 })
    }

    let query = supabase
      .from('location_checkins')
      .select('*, inspectors(full_name), companies(name), company_locations(name)')
      .order('created_at', { ascending: false })

    // Inspectors only see their own
    if (userRole.role === 'inspector') {
      if (!userRole.inspector_id) {
        return NextResponse.json([])
      }
      query = query.eq('inspector_id', userRole.inspector_id)
    }

    // Filters
    const inspectorId = searchParams.get('inspector_id')
    const companyId = searchParams.get('company_id')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = searchParams.get('limit')
    const activeOnly = searchParams.get('active')

    if (inspectorId) query = query.eq('inspector_id', inspectorId)
    if (companyId) query = query.eq('company_id', companyId)
    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)
    if (activeOnly === 'true') query = query.is('checked_out_at', null)
    if (limit) query = query.limit(parseInt(limit))

    const { data, error } = await query

    if (error) throw error

    // Flatten joined fields
    const checkins = (data || []).map((c: any) => ({
      ...c,
      inspector_name: c.inspectors?.full_name || 'Unknown',
      company_name: c.companies?.name || 'Unknown',
      location_name: c.company_locations?.name || null,
      inspectors: undefined,
      companies: undefined,
      company_locations: undefined,
    }))

    return NextResponse.json(checkins)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('Checkins fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
