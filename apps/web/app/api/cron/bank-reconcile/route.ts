/**
 * Bank Reconciliation Cron Job
 * Re-runs matching on all unmatched transactions (nightly)
 * Schedule: Once daily at 02:00 (configured in vercel.json)
 * Protected: CRON_SECRET header
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { reconcileUnmatched } from '@/lib/bog/matcher'
import { isBogConfigured } from '@/lib/bog/client'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (header or query param for manual testing)
    const authHeader = request.headers.get('authorization')
    const secretParam = new URL(request.url).searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isBogConfigured()) {
      return NextResponse.json({ error: 'BOG API not configured', skipped: true }, { status: 200 })
    }

    const result = await reconcileUnmatched()

    console.log('[bank-reconcile]', result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[bank-reconcile] Error:', error)
    return NextResponse.json(
      { error: 'Reconciliation failed', message: error.message },
      { status: 500 }
    )
  }
}
