export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseCoordinates, haversineMeters } from '@/lib/geo-utils'
import { getEffectiveVisitTypes } from '@/features/boards/constants/checkin'

const createCheckinSchema = z.object({
  inspector_id: z.string().uuid(),
  company_id: z.string().uuid().nullable().optional(),
  company_location_id: z.string().uuid().nullable().optional(),
  route_stop_id: z.string().uuid().nullable().optional(),
  board_item_id: z.string().uuid().nullable().optional(),
  board_column_id: z.string().uuid().nullable().optional(),
  checkin_type: z.string().max(100).nullable().optional(),
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

const CHECKIN_RADIUS_METERS = 150

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const session = await requireAuth()
    const body = await request.json()
    const validated = createCheckinSchema.parse(body)

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 403 })
    }

    const isAdminOrDispatcher = userRole.role === 'admin' || userRole.role === 'dispatcher'
    if (!isAdminOrDispatcher && session.user.id !== validated.inspector_id) {
      return NextResponse.json({ error: 'Cannot check in as another inspector' }, { status: 403 })
    }

    // Prevent double check-in
    const { data: activeCheckin } = await supabase
      .from('location_checkins')
      .select('id')
      .eq('inspector_id', validated.inspector_id)
      .is('checked_out_at', null)
      .limit(1)
      .maybeSingle()

    if (activeCheckin) {
      return NextResponse.json(
        { error: 'თქვენ უკვე გაქვთ აქტიური ჩეკ-ინი. ჯერ გააკეთეთ ჩეკ-აუთი.' },
        { status: 409 }
      )
    }

    let locationUpdated = false
    let distanceFromLocation: number | null = null
    let serviceSnapshot: string | null = null
    let stageColumnId: string | null = null
    let stageTypes: string[] = []
    let itemBoardId: string | null = null

    // Geofence check: board item path (new) or company location path (legacy)
    if (validated.board_item_id) {
      // Item-centric checkin: resolve coordinates from board item data
      const serviceClient = createServiceClient()
      const { data: item } = await serviceClient
        .from('board_items')
        .select('data, board_id')
        .eq('id', validated.board_item_id)
        .single()

      if (item) {
        // Config comes from the checkin column the sheet was opened from;
        // fall back to the board's first checkin column for older clients.
        let colQuery = serviceClient
          .from('board_columns')
          .select('config')
          .eq('board_id', item.board_id)
          .eq('column_type', 'checkin')
        if (validated.board_column_id) {
          colQuery = colQuery.eq('id', validated.board_column_id)
        }
        const { data: checkinCols } = await colQuery.limit(1)

        const colConfig = checkinCols?.[0]?.config as Record<string, any> | undefined
        // Snapshot the column's service so later config edits can't rewrite history
        serviceSnapshot = colConfig?.service || null
        stageColumnId = colConfig?.stage_column_id || null
        stageTypes = getEffectiveVisitTypes(colConfig)
        itemBoardId = item.board_id
        const coordsColumnId = colConfig?.coordinates_column_id
        if (coordsColumnId && item.data) {
          const targetCoords = parseCoordinates((item.data as Record<string, any>)[coordsColumnId])
          if (targetCoords) {
            distanceFromLocation = Math.round(
              haversineMeters(validated.lat, validated.lng, targetCoords.lat, targetCoords.lng)
            )
            if (distanceFromLocation > CHECKIN_RADIUS_METERS) {
              return NextResponse.json(
                {
                  error: `თქვენ იმყოფებით ${distanceFromLocation}მ მანძილზე. ჩეკ-ინისთვის საჭიროა ${CHECKIN_RADIUS_METERS}მ რადიუსში ყოფნა.`,
                  distance: distanceFromLocation,
                  max_radius: CHECKIN_RADIUS_METERS,
                },
                { status: 422 }
              )
            }
          }
          // If parseCoordinates returns null: no geofence, GPS-only mode
        }
      }
    } else if (validated.company_location_id) {
      // Legacy company-based geofence
      const { data: loc } = await supabase
        .from('company_locations')
        .select('lat, lng')
        .eq('id', validated.company_location_id)
        .single()

      if (loc) {
        if (loc.lat != null && loc.lng != null) {
          distanceFromLocation = Math.round(
            haversineMeters(validated.lat, validated.lng, loc.lat, loc.lng)
          )
          if (distanceFromLocation > CHECKIN_RADIUS_METERS) {
            return NextResponse.json(
              {
                error: `თქვენ იმყოფებით ${distanceFromLocation}მ მანძილზე კომპანიის ლოკაციიდან. ჩეკ-ინისთვის საჭიროა ${CHECKIN_RADIUS_METERS}მ რადიუსში ყოფნა.`,
                distance: distanceFromLocation,
                max_radius: CHECKIN_RADIUS_METERS,
              },
              { status: 422 }
            )
          }
        } else {
          await supabase
            .from('company_locations')
            .update({ lat: validated.lat, lng: validated.lng })
            .eq('id', validated.company_location_id)
          locationUpdated = true
        }
      }
    }

    const { data: checkin, error } = await supabase
      .from('location_checkins')
      .insert({
        inspector_id: validated.inspector_id,
        company_id: validated.company_id || null,
        company_location_id: validated.company_location_id || null,
        route_stop_id: validated.route_stop_id || null,
        board_item_id: validated.board_item_id || null,
        board_column_id: validated.board_column_id || null,
        checkin_type: validated.checkin_type || null,
        service: serviceSnapshot,
        lat: validated.lat,
        lng: validated.lng,
        accuracy: validated.accuracy || null,
        notes: validated.notes || null,
        location_updated: locationUpdated,
        distance_from_location: distanceFromLocation,
      } as any)
      .select()
      .single()

    // Partial unique index (one active checkin per inspector) closes the
    // check-then-insert race — map the violation to the same 409.
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'თქვენ უკვე გაქვთ აქტიური ჩეკ-ინი. ჯერ გააკეთეთ ჩეკ-აუთი.' },
        { status: 409 }
      )
    }
    if (error) throw error

    if (validated.route_stop_id) {
      await supabase
        .from('route_stops')
        .update({
          status: 'completed',
          actual_arrival_time: new Date().toTimeString().slice(0, 8),
        })
        .eq('id', validated.route_stop_id)
    }

    // Stage automation: the visit type doubles as the company's stage.
    // When the checkin column has stage_column_id configured, set that
    // status column on the item to the visit type. Never fails the checkin.
    // Only real stage types update the stage — "სხვა" (or any unknown type)
    // is recorded on the checkin but leaves the company's stage untouched.
    const isStageType = stageTypes.includes(validated.checkin_type || '')
    if (
      validated.board_item_id &&
      validated.checkin_type &&
      isStageType &&
      stageColumnId &&
      itemBoardId
    ) {
      try {
        const sc = createServiceClient()
        // Status cells store the option KEY (label with spaces → underscores)
        const optionKey = validated.checkin_type.toLowerCase().replace(/\s+/g, '_')

        // Re-fetch item data right before writing to narrow the race window
        const { data: freshItem } = await sc
          .from('board_items')
          .select('data')
          .eq('id', validated.board_item_id)
          .single()
        const newData = {
          ...((freshItem?.data as Record<string, any>) || {}),
          [stageColumnId]: optionKey,
        }
        await sc
          .from('board_items')
          .update({ data: newData, updated_at: new Date().toISOString() })
          .eq('id', validated.board_item_id)

        // Ensure the status column has an option for this stage so the cell
        // renders with a label and color instead of falling back to default
        const { data: stageCols } = await sc
          .from('board_columns')
          .select('id, config')
          .eq('board_id', itemBoardId)
          .eq('column_id', stageColumnId)
          .limit(1)
        const stageCol = stageCols?.[0]
        if (stageCol) {
          const cfg = (stageCol.config as Record<string, any>) || {}
          const options: any[] = Array.isArray(cfg.options) ? [...cfg.options] : []
          if (!options.some(o => o.key === optionKey)) {
            const palette = [
              'bright_blue',
              'working_orange',
              'purple',
              'aquamarine',
              'egg_yolk',
              'dark_blue',
              'sunset',
              'indigo',
              'grass_green',
            ]
            options.push({
              key: optionKey,
              label: validated.checkin_type,
              color: palette[options.length % palette.length],
            })
            await sc
              .from('board_columns')
              .update({ config: { ...cfg, options } })
              .eq('id', stageCol.id)
          }
        }
      } catch (automationError) {
        console.error('Checkin stage automation failed:', automationError)
      }
    }

    return NextResponse.json(
      {
        ...checkin,
        location_updated: locationUpdated,
        distance_from_location: distanceFromLocation,
      },
      { status: 201 }
    )
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
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const session = await requireAuth()
    const body = await request.json()
    const validated = checkoutSchema.parse(body)

    const { data: checkin, error: fetchError } = await supabase
      .from('location_checkins')
      .select('*')
      .eq('id', validated.checkin_id)
      .single()

    if (fetchError || !checkin) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
    }

    if ((checkin as any).checked_out_at) {
      return NextResponse.json({ error: 'Already checked out' }, { status: 400 })
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 403 })
    }

    const isAdminOrDispatcher = userRole.role === 'admin' || userRole.role === 'dispatcher'
    if (!isAdminOrDispatcher && session.user.id !== checkin.inspector_id) {
      return NextResponse.json({ error: 'Cannot check out another inspector' }, { status: 403 })
    }

    const checkinTime = new Date(checkin.created_at!).getTime()
    const now = Date.now()
    const durationMinutes = Math.round((now - checkinTime) / 60000)
    const checkedOutAt = new Date(now).toISOString()

    const checkoutDistance = Math.round(
      haversineMeters(checkin.lat, checkin.lng, validated.lat, validated.lng)
    )
    const locationMatch = checkoutDistance <= CHECKIN_RADIUS_METERS

    const { data: updated, error: updateError } = await supabase
      .from('location_checkins')
      .update({
        checked_out_at: checkedOutAt,
        checkout_lat: validated.lat,
        checkout_lng: validated.lng,
        checkout_accuracy: validated.accuracy || null,
        duration_minutes: durationMinutes,
        checkout_distance: checkoutDistance,
        location_match: locationMatch,
      } as any)
      .eq('id', validated.checkin_id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updated)
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
    console.error('Check-out error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { error } = await supabase.from('location_checkins').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('Checkin delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 403 })
    }

    const boardItemId = searchParams.get('board_item_id')

    // Item timeline: checkins are the item's visit history and must survive
    // transfers between inspectors' boards, so previous inspectors' checkins
    // stay visible to the item's current owner. RLS would hide them for
    // officers — use the service client for item-scoped reads.
    const client = boardItemId ? createServiceClient() : supabase

    let query = client
      .from('location_checkins')
      // boards embed must be disambiguated — board_items has two FKs to boards
      // (board_id + original_board_id), PostgREST returns 300 otherwise
      .select(
        '*, companies(name), company_locations(name), board_items(name, boards!board_items_board_id_fkey(name))'
      )
      .order('created_at', { ascending: false })

    if (userRole.role === 'officer' && !boardItemId) {
      query = query.eq('inspector_id', session.user.id)
    }

    const inspectorId = searchParams.get('inspector_id')
    const inspectorIdList = inspectorId ? inspectorId.split(',').filter(Boolean) : []
    const companyId = searchParams.get('company_id')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = searchParams.get('limit')
    const activeOnly = searchParams.get('active')

    if (inspectorIdList.length === 1) query = query.eq('inspector_id', inspectorIdList[0])
    else if (inspectorIdList.length > 1) query = query.in('inspector_id', inspectorIdList)
    if (companyId) query = query.eq('company_id', companyId)
    if (boardItemId) query = query.eq('board_item_id', boardItemId)
    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)
    if (activeOnly === 'true') query = query.is('checked_out_at', null)
    if (limit) query = query.limit(parseInt(limit))

    const { data, error } = await query

    if (error) throw error

    // Resolve inspector names from public.users — location_checkins.inspector_id
    // holds auth.users ids with no FK to inspectors, so PostgREST can't embed it.
    const inspectorIds = [...new Set((data || []).map((c: any) => c.inspector_id).filter(Boolean))]
    let namesById: Record<string, string> = {}
    if (inspectorIds.length > 0) {
      const { data: users } = await createServiceClient()
        .from('users')
        .select('id, full_name, email')
        .in('id', inspectorIds)
      namesById = Object.fromEntries(
        (users || []).map(u => [u.id, u.full_name || u.email || 'Unknown'])
      )
    }

    const checkins = (data || []).map((c: any) => ({
      ...c,
      inspector_name: namesById[c.inspector_id] || 'Unknown',
      company_name: c.companies?.name || null,
      location_name: c.company_locations?.name || null,
      board_item_name: c.board_items?.name || null,
      board_name: c.board_items?.boards?.name || null,
      companies: undefined,
      company_locations: undefined,
      board_items: undefined,
    }))

    return NextResponse.json(checkins)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('Checkins fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
