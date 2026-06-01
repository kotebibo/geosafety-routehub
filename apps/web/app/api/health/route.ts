/**
 * Health Check API - Admin only
 * GET /api/health
 *
 * Runs parallel checks against Supabase and returns timed results.
 * Includes: DB ping, table counts, auth latency, RLS performance, storage.
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

interface HealthCheck {
  name: string
  status: 'ok' | 'slow' | 'error'
  time_ms: number
  result: any
  error?: string
}

type OverallStatus = 'healthy' | 'degraded' | 'unhealthy'

const SLOW_THRESHOLD_MS = 2000

async function runCheck(name: string, fn: () => Promise<any>): Promise<HealthCheck> {
  const start = performance.now()
  try {
    const result = await fn()
    const time_ms = Math.round(performance.now() - start)
    return { name, status: time_ms > SLOW_THRESHOLD_MS ? 'slow' : 'ok', time_ms, result }
  } catch (err: any) {
    const time_ms = Math.round(performance.now() - start)
    return { name, status: 'error', time_ms, result: null, error: err.message || String(err) }
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const supabase = createServerClient() as any

    // Core DB checks
    const checks = await Promise.all([
      runCheck('db_ping', async () => {
        const { data, error } = await supabase.from('users').select('id').limit(1)
        if (error) throw error
        return 'pong'
      }),

      runCheck('board_items_count', async () => {
        const { count, error } = await supabase
          .from('board_items')
          .select('*', { count: 'exact', head: true })
        if (error) throw error
        return count
      }),

      runCheck('bank_transactions_count', async () => {
        const { count, error } = await supabase
          .from('bank_transactions')
          .select('*', { count: 'exact', head: true })
        if (error) throw error
        return count
      }),

      runCheck('active_inspectors', async () => {
        const { count, error } = await supabase
          .from('inspectors')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
        if (error) throw error
        return count
      }),

      runCheck('boards_count', async () => {
        const { count, error } = await supabase
          .from('boards')
          .select('*', { count: 'exact', head: true })
        if (error) throw error
        return count
      }),

      runCheck('users_count', async () => {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
        if (error) throw error
        return count
      }),

      runCheck('recent_checkins', async () => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count, error } = await supabase
          .from('location_checkins')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo)
        if (error) throw error
        return count
      }),

      // Auth latency — how long does Supabase auth take
      runCheck('auth_latency', async () => {
        const start = performance.now()
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        return `${Math.round(performance.now() - start)}ms`
      }),

      // RLS performance — query board_items through RLS (not service role)
      runCheck('rls_query', async () => {
        const { data, error } = await supabase.from('board_items').select('id').limit(5)
        if (error) throw error
        return `${data?.length || 0} rows`
      }),

      // Storage check
      runCheck('storage', async () => {
        const { data, error } = await supabase.storage.listBuckets()
        if (error) throw error
        return `${data?.length || 0} buckets`
      }),
    ])

    // Team2/Team3 instance pings (if configured)
    const instanceChecks: Promise<HealthCheck>[] = []
    if (process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2 && process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2) {
      instanceChecks.push(
        runCheck('team2_ping', async () => {
          const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2!,
            process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2!
          )
          const { error } = await client.from('users').select('id').limit(1)
          if (error) throw error
          return 'pong'
        })
      )
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM3 && process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM3) {
      instanceChecks.push(
        runCheck('team3_ping', async () => {
          const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM3!,
            process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM3!
          )
          const { error } = await client.from('users').select('id').limit(1)
          if (error) throw error
          return 'pong'
        })
      )
    }

    const extraChecks = await Promise.all(instanceChecks)
    const allChecks = [...checks, ...extraChecks]

    const failed = allChecks.filter(c => c.status === 'error').length
    const slow = allChecks.filter(c => c.status === 'slow').length
    const ok = allChecks.filter(c => c.status === 'ok').length

    let status: OverallStatus = 'healthy'
    if (failed > 0) status = 'unhealthy'
    else if (slow > 0) status = 'degraded'

    const response = {
      status,
      timestamp: new Date().toISOString(),
      checks: allChecks,
      summary: {
        total: allChecks.length,
        ok,
        slow,
        failed,
      },
    }

    // Persist to health_check_logs (fire-and-forget, don't block response)
    const avgMs =
      allChecks.length > 0
        ? Math.round(allChecks.reduce((s, c) => s + c.time_ms, 0) / allChecks.length)
        : 0
    const maxMs = allChecks.length > 0 ? Math.max(...allChecks.map(c => c.time_ms)) : 0
    supabase
      .from('health_check_logs')
      .insert({
        status,
        avg_ms: avgMs,
        max_ms: maxMs,
        checks: allChecks.map(c => ({ name: c.name, status: c.status, time_ms: c.time_ms })),
        region: process.env.VERCEL_REGION || 'local',
      })
      .then(({ error: logErr }) => {
        if (logErr) console.warn('Failed to log health check:', logErr.message)
      })

    return NextResponse.json(response)
  } catch (error: any) {
    if (error?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    console.error('Health check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
