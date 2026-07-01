/**
 * @swagger
 * /api/cron/bank-backfill:
 *   get:
 *     summary: Backfill historical bank transactions from BOG
 *     description: >
 *       Fetches historical transactions from the Bank of Georgia API for a given
 *       date range and ingests them into bank_transactions. Manual trigger only.
 *     tags: [Cron]
 *     security:
 *       - cronSecret: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: secret
 *         schema:
 *           type: string
 *         description: Alternative to Authorization header for manual testing
 *     responses:
 *       200:
 *         description: Backfill completed (or skipped if BOG not configured)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 range:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing required from/to query params
 *       401:
 *         description: Invalid or missing CRON_SECRET
 *       500:
 *         description: Backfill processing failed
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
