/**
 * @swagger
 * /api/cron/cleanup-auth:
 *   get:
 *     summary: Delete expired 2FA challenges and stale rate-limit counters
 *     description: >
 *       Calls cleanup_auth_challenges() (see supabase/migrations/109_auth_cleanup.sql)
 *       to purge login_2fa_challenges rows more than 24h past expiry — e.g. codes
 *       requested by users who abandoned the login/enrollment flow —
 *       auth_rate_limits counters whose window and lockout have long passed,
 *       and expired trusted 2FA devices. Runs daily via Vercel Cron; each
 *       deployment cleans its own Supabase instance.
 *     tags: [Cron]
 *     security:
 *       - cronSecret: []
 *     parameters:
 *       - in: query
 *         name: secret
 *         schema:
 *           type: string
 *         description: Alternative to Authorization header for manual testing
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deletedChallenges:
 *                   type: integer
 *                 deletedRateLimits:
 *                   type: integer
 *                 deletedTrustedDevices:
 *                   type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Invalid or missing CRON_SECRET
 *       500:
 *         description: Cleanup failed
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return false
    return true
  }
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  const url = new URL(request.url)
  return url.searchParams.get('secret') === secret
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('cleanup_auth_challenges')
    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data

    return NextResponse.json({
      success: true,
      deletedChallenges: row?.deleted_challenges ?? 0,
      deletedRateLimits: row?.deleted_rate_limits ?? 0,
      deletedTrustedDevices: row?.deleted_trusted_devices ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Auth cleanup cron failed:', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
