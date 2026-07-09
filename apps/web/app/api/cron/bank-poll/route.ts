/**
 * @swagger
 * /api/cron/bank-poll:
 *   get:
 *     summary: Poll today's bank transactions from BOG
 *     description: >
 *       Fetches today's transactions from the Bank of Georgia API and runs
 *       auto-matching against known companies by tax ID. Scheduled every 30
 *       minutes during business hours via Vercel Cron.
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
 *         description: Poll completed (or skipped if BOG not configured)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Invalid or missing CRON_SECRET
 *       500:
 *         description: Bank poll processing failed
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { ingestTodayTransactions } from '@/lib/bog/matcher'
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
