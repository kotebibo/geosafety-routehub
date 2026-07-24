export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  parseCoordinatesList,
  nearestWithinRadius,
  haversineMeters,
  isWithinRadius,
} from '@/lib/geo-utils'
import { getEffectiveVisitTypes } from '@/features/boards/constants/checkin'
import { georgiaToday, georgiaTimeOfDay, georgiaMonday } from '@/lib/time'

// Check-in geofence radius, read per request so env/config wins at runtime.
// TEMP: defaults to 150 KM for stage test data (seeded check-ins pass anywhere);
// set CHECKIN_RADIUS_METERS=150 in env to restore the real 150 m rule.
const checkinRadius = () => Number(process.env.CHECKIN_RADIUS_METERS) || 150_000

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
  photo_path: z.string().max(500).nullable().optional(),
})

const checkoutSchema = z.object({
  checkin_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
})

// Reflect a visit on the officer's planned stop. Board check-ins carry
// board_item_id (not route_stop_id), so resolve the stop through the officer's
// route for today and persist the status so every surface (officer routes,
// analytics counts, admin popup) sees it. Never throws — planning is optional.
// route_stops.status is constrained to ('pending','in_progress','completed',
// 'skipped','failed') — 'completed' is the done state (stopVisitState maps it to
// green). We never write 'visited' (not an allowed value).
async function markPlannedStop(
  inspectorId: string,
  boardItemId: string | null | undefined,
  status: 'in_progress' | 'completed'
): Promise<void> {
  if (!boardItemId) return
  try {
    const svc = createServiceClient() as any
    // 1. The stop planned for TODAY (normal check-in on its planned day).
    const { data: todayRoutes } = await svc
      .from('routes')
      .select('route_stops(id, board_item_id)')
      .eq('inspector_id', inspectorId)
      .eq('date', georgiaToday())
    const stopIds: string[] = []
    for (const r of todayRoutes || [])
      for (const st of r.route_stops || [])
        if (st.board_item_id === boardItemId) stopIds.push(st.id)

    // 2. Nothing planned today → the officer finally reached a DEFERRED object on
    //    some other day (checked in from the "plan deviation" section). Resolve
    //    the skipped stop for this item this week and clear its skip mark.
    let resolvingDeviation = false
    if (stopIds.length === 0) {
      const monday = georgiaMonday(0)
      const sunday = new Date(new Date(monday).getTime() + 6 * 86400000).toISOString().slice(0, 10)
      const { data: weekRoutes } = await svc
        .from('routes')
        .select('route_stops(id, board_item_id, status)')
        .eq('inspector_id', inspectorId)
        .gte('date', monday)
        .lte('date', sunday)
      for (const r of weekRoutes || [])
        for (const st of r.route_stops || [])
          if (st.board_item_id === boardItemId && st.status === 'skipped') {
            stopIds.push(st.id)
            resolvingDeviation = true
          }
    }

    if (stopIds.length > 0) {
      const patch: Record<string, any> = { status }
      if (resolvingDeviation) {
        patch.skip_reason = null
        patch.skip_note = null
        patch.deferred_at = null
      }
      await svc.from('route_stops').update(patch).in('id', stopIds)
    }
  } catch (e) {
    console.error('markPlannedStop failed:', e)
  }
}

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

    // TEMP (testing only): user ids in CHECKIN_GEOFENCE_BYPASS_IDS may check in
    // from anywhere. The distance is still measured and stored — only the 150m
    // rejection is skipped. Leave this env unset in production.
    const geofenceBypass = (process.env.CHECKIN_GEOFENCE_BYPASS_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
      .includes(validated.inspector_id)

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

      // Board ownership: the check-in's officer must be that board's assigned
      // officer (managers may check in on any board). The UI never exposes other
      // teams' items — this blocks hand-crafted requests that would otherwise
      // mutate another board's item stage via the service client below.
      if (item && !isAdminOrDispatcher) {
        const { data: board } = await serviceClient
          .from('boards')
          .select('settings')
          .eq('id', item.board_id)
          .maybeSingle()
        const assignedOfficer = (board?.settings as any)?.assigned_officer_id ?? null
        if (assignedOfficer !== validated.inspector_id)
          return NextResponse.json(
            { error: 'Cannot check in on an object outside your board' },
            { status: 403 }
          )
      }

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
          // The cell may hold multiple coordinates — geofence against the
          // nearest one so the inspector can check in near any of them.
          const targets = parseCoordinatesList((item.data as Record<string, any>)[coordsColumnId])
          const nearest = nearestWithinRadius(
            validated.lat,
            validated.lng,
            targets,
            validated.accuracy,
            checkinRadius()
          )
          if (nearest) {
            distanceFromLocation = nearest.distance
            if (!nearest.within && !geofenceBypass) {
              return NextResponse.json(
                {
                  error: `თქვენ იმყოფებით ${distanceFromLocation}მ მანძილზე. ჩეკ-ინისთვის საჭიროა ${checkinRadius()}მ რადიუსში ყოფნა.`,
                  distance: distanceFromLocation,
                  max_radius: checkinRadius(),
                },
                { status: 422 }
              )
            }
          }
          // If there are no parseable targets: no geofence, GPS-only mode
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
          if (
            !isWithinRadius(distanceFromLocation, validated.accuracy, checkinRadius()) &&
            !geofenceBypass
          ) {
            return NextResponse.json(
              {
                error: `თქვენ იმყოფებით ${distanceFromLocation}მ მანძილზე კომპანიის ლოკაციიდან. ჩეკ-ინისთვის საჭიროა ${checkinRadius()}მ რადიუსში ყოფნა.`,
                distance: distanceFromLocation,
                max_radius: checkinRadius(),
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

    // Day rule (env CHECKIN_ANY_DAY=false): a planned stop can only be checked
    // in on its planned day. Deferred (skipped) stops and unplanned items —
    // items not actively planned for another day this week — are exempt.
    if (process.env.CHECKIN_ANY_DAY !== 'true' && validated.board_item_id) {
      const gsvc = createServiceClient() as any
      const today = georgiaToday()
      const monday = georgiaMonday(0)
      const sunday = new Date(new Date(monday).getTime() + 6 * 86400000).toISOString().slice(0, 10)
      const { data: prs } = await gsvc
        .from('routes')
        .select('date, route_stops(board_item_id, status)')
        .eq('inspector_id', validated.inspector_id)
        .gte('date', monday)
        .lte('date', sunday)
      const activeDays = new Set<string>()
      for (const r of prs || [])
        for (const s of r.route_stops || [])
          if (s.board_item_id === validated.board_item_id && s.status !== 'skipped')
            activeDays.add(r.date)
      if (activeDays.size > 0 && !activeDays.has(today))
        return NextResponse.json(
          { error: 'ჩექინი მხოლოდ დაგეგმილ დღეს შეიძლება', wrongDay: true },
          { status: 422 }
        )
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
        photo_path: validated.photo_path || null,
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

    // Check-in puts the planned stop "in progress" (yellow). Check-out (PATCH)
    // later marks it "visited" (green). Legacy clients may pass route_stop_id
    // directly; board check-ins resolve the stop via board_item_id + today.
    if (validated.route_stop_id) {
      await supabase
        .from('route_stops')
        .update({
          status: 'in_progress',
          actual_arrival_time: georgiaTimeOfDay(),
        })
        .eq('id', validated.route_stop_id)
    } else {
      await markPlannedStop(validated.inspector_id, validated.board_item_id, 'in_progress')
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
    const locationMatch = isWithinRadius(checkoutDistance, validated.accuracy, checkinRadius())

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

    // Check-out marks the planned stop done (green) + departure time.
    if ((checkin as any).route_stop_id) {
      await supabase
        .from('route_stops')
        .update({
          status: 'completed',
          actual_departure_time: georgiaTimeOfDay(),
        })
        .eq('id', (checkin as any).route_stop_id)
    } else {
      await markPlannedStop(
        (checkin as any).inspector_id,
        (checkin as any).board_item_id,
        'completed'
      )
    }

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
