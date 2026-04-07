export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { UnauthorizedError, ForbiddenError } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const inspectorId = searchParams.get('inspector_id')
    const since = searchParams.get('since')

    if (!inspectorId) {
      return NextResponse.json({ error: 'inspector_id is required' }, { status: 400 })
    }

    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // PostGIS table not in generated types
    const { data, error } = await (supabase as any)
      .from('inspector_location_history')
      .select('lat, lng, recorded_at, accuracy, speed')
      .eq('inspector_id', inspectorId)
      .gte('recorded_at', sinceDate)
      .order('recorded_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    console.error('Location history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
