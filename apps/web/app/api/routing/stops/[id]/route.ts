export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { notifyManagers } from '@/features/routing/lib/routing-notify'

const patchSchema = z.object({
  status: z.enum(['pending', 'visited', 'skipped']),
  // Only meaningful when status = 'skipped' (deferred/deviation).
  skipReason: z.enum(['empty', 'closed', 'refused', 'other']).nullable().optional(),
  skipNote: z.string().max(500).nullable().optional(),
})

// PATCH — mark a single route stop visited/skipped/pending. Authorized against
// the parent route's inspector (owner) or a manager. Stamps actual_arrival_time
// when marking visited, clears it when reverting to pending.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const { status, skipReason, skipNote } = patchSchema.parse(await request.json())

    const supabase = createServerClient() as any
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
    const isManager = roleRow?.role === 'admin' || roleRow?.role === 'dispatcher'

    const svc = createServiceClient() as any
    const { data: stop, error: sErr } = await svc
      .from('route_stops')
      .select('id, route_id, board_item_id, routes(inspector_id)')
      .eq('id', params.id)
      .single()
    if (sErr || !stop) return NextResponse.json({ error: 'Stop not found' }, { status: 404 })

    const ownerId = stop.routes?.inspector_id
    if (ownerId !== session.user.id && !isManager)
      return NextResponse.json({ error: 'Cannot modify another officer’s route' }, { status: 403 })

    // API vocabulary uses 'visited'; the route_stops.status constraint only
    // allows 'completed' for the done state, so translate on write.
    const dbStatus = status === 'visited' ? 'completed' : status
    const now = new Date().toISOString()
    const patch: Record<string, any> = { status: dbStatus, updated_at: now }
    patch.actual_arrival_time = status === 'visited' ? now : null
    // Deferral (deviation): record the reason + when; clear it on visit/revert.
    if (status === 'skipped') {
      patch.skip_reason = skipReason ?? null
      patch.skip_note = skipNote ?? null
      patch.deferred_at = now
    } else {
      patch.skip_reason = null
      patch.skip_note = null
      patch.deferred_at = null
    }

    const { data: updated, error: uErr } = await svc
      .from('route_stops')
      .update(patch)
      .eq('id', params.id)
      .select('id, status, actual_arrival_time')
      .single()
    if (uErr) throw uErr

    // Deferral is a plan deviation → notify managers in-app.
    if (status === 'skipped') {
      const [{ data: officer }, { data: item }] = await Promise.all([
        ownerId
          ? svc.from('users').select('full_name, email').eq('id', ownerId).maybeSingle()
          : Promise.resolve({ data: null }),
        stop.board_item_id
          ? svc.from('board_items').select('name').eq('id', stop.board_item_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      const who = officer?.full_name || officer?.email || 'ოფიცერი'
      await notifyManagers(svc, {
        type: 'stop_deferred',
        title: 'გეგმიდან გადახვევა',
        message: `${who} — ${item?.name || 'ობიექტი'}${skipReason ? ` (${skipReason})` : ''}`,
        data: { stopId: params.id, inspectorId: ownerId, boardItemId: stop.board_item_id },
        email: false,
      })
    }

    return NextResponse.json({ success: true, stop: updated })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('stop PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
