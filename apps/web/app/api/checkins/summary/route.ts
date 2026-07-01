export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('board_id')

    if (!boardId) {
      return NextResponse.json({ error: 'board_id is required' }, { status: 400 })
    }

    const { data, error } = await (supabase.rpc as any)('get_board_checkin_summary', {
      p_board_id: boardId,
    })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('Checkin summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
