export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { georgiaToday } from '@/lib/time'
import { notifyManagers } from '@/features/routing/lib/routing-notify'

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
      .select('inspector_id, date, route_stops(id, status)')
      .lte('date', today)

    const stopIds: string[] = []
    const missedByOfficer = new Map<string, number>() // inspector_id → count auto-deferred
    for (const r of routes || [])
      for (const s of r.route_stops || [])
        if (s.status === 'pending') {
          stopIds.push(s.id)
          if (r.inspector_id)
            missedByOfficer.set(r.inspector_id, (missedByOfficer.get(r.inspector_id) || 0) + 1)
        }

    if (stopIds.length > 0) {
      await svc
        .from('route_stops')
        .update({ status: 'skipped', deferred_at: new Date().toISOString() })
        .in('id', stopIds)

      // A planned object with no check-in by day's end is a missed visit —
      // alert managers (in-app) per officer. The stops now show red in the UI.
      const officerIds = [...missedByOfficer.keys()]
      const { data: users } = await svc
        .from('users')
        .select('id, full_name, email')
        .in('id', officerIds)
      const nameOf = new Map<string, string>(
        (users || []).map((u: any) => [u.id, u.full_name || u.email || 'ოფიცერი'])
      )
      for (const [inspectorId, count] of missedByOfficer) {
        await notifyManagers(svc, {
          type: 'stops_auto_deferred',
          title: 'ვიზიტები ვერ შესრულდა',
          message: `${nameOf.get(inspectorId) ?? 'ოფიცერი'} — ${count} ობიექტი დღეს ვერ მოინახულა`,
          data: { inspectorId, count },
          email: false,
        })
      }
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
