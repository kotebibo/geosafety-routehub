export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'

const upsertSchema = z.object({
  user_id: z.string().uuid(),
  car_model: z.string().max(120).nullable().optional(),
  engine: z.string().max(120).nullable().optional(),
  consumption_l_per_100km: z.number().min(0).max(100).nullable().optional(),
  home_lat: z.number().min(-90).max(90).nullable().optional(),
  home_lng: z.number().min(-180).max(180).nullable().optional(),
  home_address: z.string().max(300).nullable().optional(),
  start_lat: z.number().min(-90).max(90).nullable().optional(),
  start_lng: z.number().min(-180).max(180).nullable().optional(),
  start_address: z.string().max(300).nullable().optional(),
})

// GET ?userId= — officer transport (RLS: own for officers, any for admin/dispatcher)
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const userId = new URL(request.url).searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const supabase = createServerClient() as any
    const { data, error } = await supabase
      .from('officer_transport')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return NextResponse.json(data ?? null)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('officer-transport GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT — admin sets an officer's vehicle/consumption
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const v = upsertSchema.parse(body)

    const supabase = createServerClient() as any
    const { data, error } = await supabase
      .from('officer_transport')
      .upsert(
        {
          user_id: v.user_id,
          car_model: v.car_model ?? null,
          engine: v.engine ?? null,
          consumption_l_per_100km: v.consumption_l_per_100km ?? null,
          home_lat: v.home_lat ?? null,
          home_lng: v.home_lng ?? null,
          home_address: v.home_address ?? null,
          start_lat: v.start_lat ?? null,
          start_lng: v.start_lng ?? null,
          start_address: v.start_address ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('officer-transport PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
