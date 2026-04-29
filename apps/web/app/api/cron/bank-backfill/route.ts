/**
 * Bank Backfill - Fetch historical transactions from BOG
 * Manual trigger only (not scheduled)
 * Usage: GET /api/cron/bank-backfill?from=2025-01-01&to=2026-04-29
 * Protected: CRON_SECRET header or query param
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { ingestHistoricalTransactions } from '@/lib/bog/matcher'
import { isBogConfigured } from '@/lib/bog/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Verify cron secret (header or query param for easy manual testing)
    const authHeader = request.headers.get('authorization')
    const secretParam = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isBogConfigured()) {
      return NextResponse.json({ error: 'BOG API not configured', skipped: true }, { status: 200 })
    }

    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Missing required query params: from, to (format: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const result = await ingestHistoricalTransactions(fromDate, toDate)

    console.log('[bank-backfill]', result)

    return NextResponse.json({
      success: true,
      ...result,
      range: { from: fromDate, to: toDate },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[bank-backfill] Error:', error)
    return NextResponse.json({ error: 'Backfill failed', message: error.message }, { status: 500 })
  }
}
