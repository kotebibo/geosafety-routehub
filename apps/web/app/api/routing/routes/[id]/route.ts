export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

const patchSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
})

// PATCH — transition a route's status. Officers may act on their own routes,
// admin/dispatcher on any. Sets start_time on first in_progress, end_time on
// completion.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const { status } = patchSchema.parse(await request.json())

    const supabase = createServerClient() as any
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
    const isManager = roleRow?.role === 'admin' || roleRow?.role === 'dispatcher'

    const svc = createServiceClient() as any
    const { data: route, error: rErr } = await svc
      .from('routes')
      .select('id, inspector_id, start_time')
      .eq('id', params.id)
      .single()
    if (rErr || !route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

    if (route.inspector_id !== session.user.id && !isManager)
      return NextResponse.json({ error: 'Cannot modify another officer’s route' }, { status: 403 })

    const now = new Date().toISOString()
    const patch: Record<string, any> = { status, updated_at: now }
    if (status === 'in_progress' && !route.start_time) patch.start_time = now
    if (status === 'completed') patch.end_time = now

    const { data: updated, error: uErr } = await svc
      .from('routes')
      .update(patch)
      .eq('id', params.id)
      .select('id, status, start_time, end_time')
      .single()
    if (uErr) throw uErr

    return NextResponse.json({ success: true, route: updated })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('route PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
