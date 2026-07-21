export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireAdminOrDispatcher } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'

const KEY = 'fuel_price_per_liter'

// GET — the global fuel price (₾/L). Any authenticated user.
export async function GET() {
  try {
    await requireAuth()
    const svc = createServiceClient() as any
    const { data } = await svc.from('app_settings').select('value').eq('key', KEY).maybeSingle()
    const price = data?.value != null && data.value !== '' ? Number(data.value) : null
    return NextResponse.json({ price: price != null && !isNaN(price) ? price : null })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('fuel-price GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const putSchema = z.object({ price: z.number().min(0).max(100).nullable() })

// PUT — set the global fuel price. Admin or dispatcher.
export async function PUT(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const { price } = putSchema.parse(await request.json())

    const svc = createServiceClient() as any
    const { error } = await svc
      .from('app_settings')
      .upsert(
        {
          key: KEY,
          value: price == null ? null : String(price),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
    if (error) throw error
    return NextResponse.json({ success: true, price })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('fuel-price PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
