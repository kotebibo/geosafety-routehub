export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: false,
      authentication: false,
    },
  }

  try {
    // Test database connection
    const { error: dbError } = await supabase.from('service_types').select('id').limit(1)
    checks.checks.database = !dbError

    // Test auth service
    const { error: authError } = await supabase.auth.getSession()
    checks.checks.authentication = !authError

    // Determine overall health
    const isHealthy = checks.checks.database && checks.checks.authentication

    if (!isHealthy) {
      checks.status = 'degraded'
      return NextResponse.json(checks, { status: 503 })
    }

    return NextResponse.json(checks, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    })
  } catch {
    return NextResponse.json({ ...checks, status: 'error' }, { status: 500 })
  }
}
