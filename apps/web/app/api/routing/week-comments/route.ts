export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notify'
import { notifyManagers } from '@/features/routing/lib/routing-notify'

const postSchema = z.object({
  inspectorId: z.string().uuid(),
  weekStart: z.string(),
  body: z.string().trim().min(1).max(2000),
})

async function roleOf(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
  return data?.role ?? null
}

// GET ?inspectorId=&weekStart= — comments on an officer's week (oldest first).
// Officer sees own; managers any.
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
    if (!isManager && inspectorId !== session.user.id)
      return NextResponse.json({ error: 'Cannot view another officer’s comments' }, { status: 403 })

    const svc = createServiceClient() as any
    const { data: rows } = await svc
      .from('week_plan_comments')
      .select('id, author_id, body, created_at')
      .eq('inspector_id', inspectorId)
      .eq('week_start', weekStart)
      .order('created_at', { ascending: true })

    // Resolve author display names from public.users (never auth.users).
    const authorIds = [...new Set((rows || []).map((r: any) => r.author_id).filter(Boolean))]
    const nameOf = new Map<string, string>()
    if (authorIds.length) {
      const { data: users } = await svc
        .from('users')
        .select('id, full_name, email')
        .in('id', authorIds)
      for (const u of users || []) nameOf.set(u.id, u.full_name || u.email)
    }

    const comments = (rows || []).map((r: any) => ({
      id: r.id,
      authorId: r.author_id,
      authorName: r.author_id ? (nameOf.get(r.author_id) ?? null) : null,
      isMine: r.author_id === session.user.id,
      body: r.body,
      createdAt: r.created_at,
    }))
    return NextResponse.json({ inspectorId, weekStart, comments })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('week-comments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST { inspectorId, weekStart, body } — add a comment (author = caller).
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { inspectorId, weekStart, body } = postSchema.parse(await request.json())

    const supabase = createServerClient() as any
    const role = await roleOf(supabase, session.user.id)
    const isManager = role === 'admin' || role === 'dispatcher'
    if (!isManager && inspectorId !== session.user.id)
      return NextResponse.json(
        { error: 'Cannot comment on another officer’s plan' },
        { status: 403 }
      )

    const svc = createServiceClient() as any
    const { data: row, error } = await svc
      .from('week_plan_comments')
      .insert({
        inspector_id: inspectorId,
        week_start: weekStart,
        author_id: session.user.id,
        body,
      })
      .select('id, created_at')
      .single()
    if (error) throw error

    // Notify the counterpart in-app: a manager's comment pings the officer; the
    // officer's comment pings managers.
    const { data: me } = await svc
      .from('users')
      .select('full_name, email')
      .eq('id', session.user.id)
      .maybeSingle()
    const who = me?.full_name || me?.email || (isManager ? 'მენეჯერი' : 'ოფიცერი')
    if (isManager && inspectorId !== session.user.id) {
      await notifyUser({
        supabase: svc,
        userId: inspectorId,
        type: 'week_plan_comment',
        title: 'ახალი კომენტარი გეგმაზე',
        message: `${who}: ${body.slice(0, 80)}`,
        data: { weekStart },
        email: false,
      })
    } else {
      await notifyManagers(svc, {
        type: 'week_plan_comment',
        title: 'ახალი კომენტარი გეგმაზე',
        message: `${who}: ${body.slice(0, 80)}`,
        data: { inspectorId, weekStart },
        email: false,
      })
    }

    return NextResponse.json({ success: true, id: row.id, createdAt: row.created_at })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('week-comments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
