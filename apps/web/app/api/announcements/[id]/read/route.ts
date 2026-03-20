export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/middleware/auth'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const supabase = createServerClient()

    const { error } = await supabase.from('announcement_reads').upsert(
      {
        announcement_id: params.id,
        user_id: session.user.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: 'announcement_id,user_id' }
    )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
