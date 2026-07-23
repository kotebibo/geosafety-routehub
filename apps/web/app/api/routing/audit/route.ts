export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

// GET ?inspectorId=&weekStart=(optional) — routing change history for an officer
// (who/when/what), newest first. Officer sees own; managers any.
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const url = new URL(request.url)
    const inspectorId = url.searchParams.get('inspectorId')
    const weekStart = url.searchParams.get('weekStart')
    if (!inspectorId) return NextResponse.json({ error: 'inspectorId required' }, { status: 400 })

    const supabase = createServerClient() as any
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
    const isManager = roleRow?.role === 'admin' || roleRow?.role === 'dispatcher'
    if (!isManager && inspectorId !== session.user.id)
      return NextResponse.json({ error: 'Cannot view another officer’s history' }, { status: 403 })

    const svc = createServiceClient() as any
    let q = svc
      .from('routing_audit_log')
      .select('id, actor_id, action, entity, week_start, detail, created_at')
      .eq('inspector_id', inspectorId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (weekStart) q = q.eq('week_start', weekStart)
    const { data: rows } = await q

    // Resolve actor display names from public.users.
    const actorIds = [...new Set((rows || []).map((r: any) => r.actor_id).filter(Boolean))]
    const nameOf = new Map<string, string>()
    if (actorIds.length) {
      const { data: users } = await svc
        .from('users')
        .select('id, full_name, email')
        .in('id', actorIds)
      for (const u of users || []) nameOf.set(u.id, u.full_name || u.email)
    }

    const entries = (rows || []).map((r: any) => ({
      id: r.id,
      actorName: r.actor_id ? (nameOf.get(r.actor_id) ?? null) : null,
      action: r.action,
      entity: r.entity,
      weekStart: r.week_start,
      detail: r.detail ?? {},
      createdAt: r.created_at,
    }))
    return NextResponse.json({ inspectorId, weekStart, entries })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('routing audit GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
