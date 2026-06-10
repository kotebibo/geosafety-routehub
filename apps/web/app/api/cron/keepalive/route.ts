/**
 * @swagger
 * /api/cron/keepalive:
 *   get:
 *     summary: Ping all Supabase instances to prevent cold starts
 *     description: >
 *       Pings team1, team2, and team3 Supabase instances in parallel to keep
 *       connections warm. Reports per-instance latency and overall health status.
 *       Runs every 4 minutes via Vercel Cron.
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
 *         description: Ping results for all instances
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ok, degraded]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       instance:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [ok, error]
 *                       time_ms:
 *                         type: integer
 *                       error:
 *                         type: string
 *       401:
 *         description: Invalid or missing CRON_SECRET
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 10

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // Allow in dev
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  const url = new URL(request.url)
  return url.searchParams.get('secret') === secret
}

interface PingResult {
  instance: string
  status: 'ok' | 'error'
  time_ms: number
  error?: string
}

async function pingInstance(name: string, url?: string, key?: string): Promise<PingResult> {
  if (!url || !key) {
    return { instance: name, status: 'ok', time_ms: 0, error: 'not configured' }
  }
  const start = performance.now()
  try {
    const client = createClient(url, key)
    const { error } = await client.from('users').select('id').limit(1)
    const time_ms = Math.round(performance.now() - start)
    if (error) throw error
    return { instance: name, status: 'ok', time_ms }
  } catch (err: any) {
    const time_ms = Math.round(performance.now() - start)
    return { instance: name, status: 'error', time_ms, error: err.message }
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await Promise.all([
    pingInstance('team1', process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY),
    pingInstance(
      'team2',
      process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2,
      process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2
    ),
    pingInstance(
      'team3',
      process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM3,
      process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM3
    ),
  ])

  const allOk = results.every(r => r.status === 'ok' || r.error === 'not configured')

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    results,
  })
}
