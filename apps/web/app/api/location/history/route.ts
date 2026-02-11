import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { UnauthorizedError, ForbiddenError } from '@/middleware/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()

    const { searchParams } = new URL(request.url)
    const inspectorId = searchParams.get('inspector_id')
    const since = searchParams.get('since')

    if (!inspectorId) {
      return NextResponse.json({ error: 'inspector_id is required' }, { status: 400 })
    }

    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
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
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Location history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
