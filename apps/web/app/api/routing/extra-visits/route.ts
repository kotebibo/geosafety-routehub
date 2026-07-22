export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

async function roleOf(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
  return data?.role ?? null
}

function weekRange(weekStart: string): { from: string; to: string } {
  const [y, m, d] = weekStart.split('-').map(Number)
  const to = new Date(Date.UTC(y, m - 1, d + 6)).toISOString().slice(0, 10)
  return { from: weekStart, to }
}

// GET ?inspectorId=&weekStart= — an officer's extra (unplanned) visits for a week,
// with resolved object names. Officers see own; managers see any.
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const url = new URL(request.url)
    const inspectorId = url.searchParams.get('inspectorId')
    const weekStart = url.searchParams.get('weekStart')
    if (!inspectorId || !weekStart)
      return NextResponse.json({ error: 'inspectorId and weekStart required' }, { status: 400 })

    const supabase = createServerClient() as any
    const role = await roleOf(supabase, session.user.id)
    const isManager = role === 'admin' || role === 'dispatcher'
    if (inspectorId !== session.user.id && !isManager)
      return NextResponse.json({ error: 'Cannot view another officer’s visits' }, { status: 403 })

    const svc = createServiceClient() as any
    const { from, to } = weekRange(weekStart)
    const { data: rows } = await svc
      .from('extra_visits')
      .select('*')
      .eq('inspector_id', inspectorId)
      .gte('visit_date', from)
      .lte('visit_date', to)
      .order('created_at', { ascending: true })

    // Resolve object names (no FK embed — item-centric).
    const itemIds = [...new Set((rows || []).map((r: any) => r.board_item_id).filter(Boolean))]
    const nameById = new Map<string, string>()
    if (itemIds.length) {
      const { data: items } = await svc.from('board_items').select('id, name').in('id', itemIds)
      for (const it of items || []) nameById.set(it.id, it.name)
    }

    const visits = (rows || []).map((r: any, i: number) => ({
      id: r.id,
      number: i + 1,
      boardItemId: r.board_item_id,
      name: r.board_item_id ? (nameById.get(r.board_item_id) ?? null) : null,
      date: r.visit_date,
      distanceKm: r.distance_km,
      reason: r.reason,
      status: r.status,
    }))
    return NextResponse.json({ inspectorId, weekStart, visits })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('extra-visits GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  inspectorId: z.string().uuid(),
  boardId: z.string().uuid().nullable().optional(),
  boardItemId: z.string().uuid(),
  visitDate: z.string(), // YYYY-MM-DD
  distanceKm: z.number().nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
})

// POST — request an extra visit (officer own, or admin on their behalf).
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient() as any
    const session = await requireAuth()
    const v = createSchema.parse(await request.json())

    const role = await roleOf(supabase, session.user.id)
    const isManager = role === 'admin' || role === 'dispatcher'
    if (v.inspectorId !== session.user.id && !isManager)
      return NextResponse.json({ error: 'Cannot add for another officer' }, { status: 403 })

    const svc = createServiceClient() as any
    const { data, error } = await svc
      .from('extra_visits')
      .insert({
        inspector_id: v.inspectorId,
        board_id: v.boardId ?? null,
        board_item_id: v.boardItemId,
        visit_date: v.visitDate,
        distance_km: v.distanceKm ?? null,
        reason: v.reason ?? null,
        status: 'requested',
        created_by: session.user.id,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, visit: data })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('extra-visits POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const patchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
})

// PATCH — admin approves/rejects an extra-visit request.
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient() as any
    const session = await requireAuth()
    const { id, action } = patchSchema.parse(await request.json())

    if ((await roleOf(supabase, session.user.id)) !== 'admin')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const svc = createServiceClient() as any
    const { data, error } = await svc
      .from('extra_visits')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, visit: data })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('extra-visits PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
