export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'

const schema = z.object({
  itemId: z.string().uuid(),
  coordsColumnId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

// PATCH — write "lat, lng" into a board item's coordinates column. Object
// coordinates are open to any authenticated user (unlike officer locations),
// and the write goes through the service client so board_items RLS doesn't
// silently drop it (the browser client update returns 0 rows for boards the
// user isn't a member of).
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth()
    const { itemId, coordsColumnId, lat, lng } = schema.parse(await request.json())

    const svc = createServiceClient() as any
    const { data: item, error: gErr } = await svc
      .from('board_items')
      .select('data')
      .eq('id', itemId)
      .single()
    if (gErr || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const data = { ...(item.data ?? {}), [coordsColumnId]: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
    const { error: uErr } = await svc.from('board_items').update({ data }).eq('id', itemId)
    if (uErr) throw uErr

    return NextResponse.json({ success: true, coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}` })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('item-coords PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
