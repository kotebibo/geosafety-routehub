/**
 * Health Check API - Admin only
 * GET /api/health
 *
 * Runs parallel DB checks against Supabase and returns timed results.
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'

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
          .from('checkins')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo)
        if (error) throw error
        return count
      }),
    ])

    const failed = checks.filter(c => c.status === 'error').length
    const slow = checks.filter(c => c.status === 'slow').length
    const ok = checks.filter(c => c.status === 'ok').length

    let status: OverallStatus = 'healthy'
    if (failed > 0) status = 'unhealthy'
    else if (slow > 0) status = 'degraded'

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checks.length,
        ok,
        slow,
        failed,
      },
    })
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
