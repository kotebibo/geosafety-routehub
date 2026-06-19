/**
 * Keepalive Cron - Prevents Supabase cold starts
 * Pings all configured Supabase instances every 4 minutes.
 * GET /api/cron/keepalive
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 10

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
