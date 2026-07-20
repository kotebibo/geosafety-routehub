export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'

const schema = z.object({
  officerId: z.string().uuid(),
  // null clears the override → officer falls back to the global price.
  price: z.number().min(0).max(100).nullable(),
})

// PATCH — set (or clear) an officer's fuel-price override. Admin or dispatcher.
export async function PATCH(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const { officerId, price } = schema.parse(await request.json())

    const svc = createServiceClient() as any
    const { error } = await svc
      .from('officer_transport')
      .upsert(
        { user_id: officerId, fuel_price_per_liter: price, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
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
    console.error('officer-fuel-price PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
