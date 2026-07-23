export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { georgiaToday, georgiaTimeOfDay, georgiaMonday } from '@/lib/time'

// GET — the server's authoritative Georgia (UTC+4) clock. The client reads day/
// week from here instead of the device clock, so a wrong or drifting local time
// can't shift which day a check-in belongs to or which week is "next".
export async function GET() {
  try {
    await requireAuth()
    return NextResponse.json({
      nowUtc: new Date().toISOString(),
      georgiaDate: georgiaToday(),
      georgiaTime: georgiaTimeOfDay(),
      weekStart: georgiaMonday(0),
      nextWeekStart: georgiaMonday(1),
    })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
