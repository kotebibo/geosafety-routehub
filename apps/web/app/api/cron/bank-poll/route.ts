/**
 * Bank Poll Cron Job
 * Fetches today's transactions from BOG and runs auto-matching
 * Schedule: Every 30 minutes during business hours (configured in vercel.json)
 * Protected: CRON_SECRET header
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { ingestTodayTransactions } from '@/lib/bog/matcher'
import { isBogConfigured } from '@/lib/bog/client'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isBogConfigured()) {
      return NextResponse.json({ error: 'BOG API not configured', skipped: true }, { status: 200 })
    }

    const result = await ingestTodayTransactions()

    console.log('[bank-poll]', result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[bank-poll] Error:', error)
    return NextResponse.json({ error: 'Bank poll failed', message: error.message }, { status: 500 })
  }
}
