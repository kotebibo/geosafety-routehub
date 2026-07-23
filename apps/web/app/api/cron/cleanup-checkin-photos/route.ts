export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'checkin-photos'
const RETENTION_DAYS = 14

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Header only — never
  // accept the secret via query string (it would leak into access logs).
  return request.headers.get('authorization') === `Bearer ${secret}`
}

// Delete check-in photos older than ~14 days from Storage and clear their
// photo_path. Runs daily via Vercel Cron; each deployment prunes its own bucket.
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const svc = createServiceClient() as any
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: rows } = await svc
      .from('location_checkins')
      .select('id, photo_path')
      .not('photo_path', 'is', null)
      .lt('created_at', cutoff)

    const paths = (rows || []).map((r: any) => r.photo_path).filter(Boolean)
    if (paths.length > 0) {
      await svc.storage.from(BUCKET).remove(paths)
      await svc
        .from('location_checkins')
        .update({ photo_path: null })
        .in(
          'id',
          (rows || []).map((r: any) => r.id)
        )
    }

    return NextResponse.json({
      success: true,
      deleted: paths.length,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('checkin-photos cleanup cron failed:', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
