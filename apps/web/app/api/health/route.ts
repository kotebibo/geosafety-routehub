import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: false,
      authentication: false,
      storage: false,
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  }

  try {
    // Test database connection
    const { error: dbError } = await supabase
      .from('service_types')
      .select('id')
      .limit(1)
    
    checks.checks.database = !dbError
    
    // Test auth service
    const { error: authError } = await supabase.auth.getSession()
    checks.checks.authentication = !authError
    
    // Test storage (if configured)
    try {
      const { error: storageError } = await supabase.storage.listBuckets()
      checks.checks.storage = !storageError
    } catch {
      // Storage might not be configured
      checks.checks.storage = false
    }
    
    // Determine overall health
    const isHealthy = checks.checks.database && checks.checks.authentication
    
    if (!isHealthy) {
      checks.status = 'degraded'
      return NextResponse.json(checks, { status: 503 })
    }
    
    // Short cache for health checks - don't hammer the endpoint
    return NextResponse.json(checks, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    })
  } catch (err) {
    return NextResponse.json({
      ...checks,
      status: 'error', 
      message: 'Health check failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
