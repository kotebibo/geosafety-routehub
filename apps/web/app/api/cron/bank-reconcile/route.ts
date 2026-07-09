/**
 * @swagger
 * /api/cron/bank-reconcile:
 *   get:
 *     summary: Reconcile unmatched bank transactions
 *     description: >
 *       Re-runs the matching algorithm on all unmatched bank transactions.
 *       Scheduled nightly at 02:00 via Vercel Cron to catch newly added
 *       companies or updated tax IDs.
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
 *         description: Reconciliation completed (or skipped if BOG not configured)
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
 *         description: Reconciliation processing failed
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
