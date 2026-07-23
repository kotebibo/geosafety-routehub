export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { georgiaToday } from '@/lib/time'

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Header only — never
  // accept the secret via query string (it would leak into access logs).
  return request.headers.get('authorization') === `Bearer ${secret}`
}

// Auto-defer: a planned stop not visited by the end of its day (runs ~21:00
// Georgia = 17:00 UTC) becomes 'skipped' (no reason yet — the officer/admin
// adds one later). Only past/today dates; future days are left alone.
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const svc = createServiceClient() as any
    const today = georgiaToday()

    const { data: routes } = await svc
      .from('routes')
      .select('date, route_stops(id, status)')
      .lte('date', today)

    const stopIds: string[] = []
    for (const r of routes || [])
      for (const s of r.route_stops || []) if (s.status === 'pending') stopIds.push(s.id)

    if (stopIds.length > 0) {
      await svc
        .from('route_stops')
        .update({ status: 'skipped', deferred_at: new Date().toISOString() })
        .in('id', stopIds)
    }

    return NextResponse.json({
      success: true,
      deferred: stopIds.length,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('auto-defer-stops cron failed:', err)
    return NextResponse.json({ error: 'Auto-defer failed' }, { status: 500 })
  }
}
