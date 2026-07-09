/**
 * @swagger
 * /api/payments/stats:
 *   get:
 *     summary: Get payment statistics
 *     description: Returns aggregated payment statistics including totals, match rates, and amounts. Uses a DB-side RPC for performance with a client-side fallback.
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for date range filter
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for date range filter
 *       - name: matchSource
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, paused, ended, one_time]
 *         description: Filter by contract match source
 *     responses:
 *       200:
 *         description: Payment statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_transactions:
 *                   type: integer
 *                 total_amount:
 *                   type: number
 *                 matched_count:
 *                   type: integer
 *                 matched_amount:
 *                   type: number
 *                 unmatched_count:
 *                   type: integer
 *                 unmatched_amount:
 *                   type: number
 *                 ignored_count:
 *                   type: integer
 *                 match_rate:
 *                   type: integer
 *                   description: Percentage of matched transactions (0-100)
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher access required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const supabase = createServerClient() as any
    const { searchParams } = new URL(request.url)

    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const matchSource = searchParams.get('matchSource')

    // Try DB-side aggregation first (migration 086)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_payment_stats', {
      p_from_date: fromDate || null,
      p_to_date: toDate || null,
      p_match_source: matchSource || null,
    })

    if (!rpcError && rpcResult) {
      return NextResponse.json(rpcResult)
    }

    // Fallback: client-side aggregation if RPC not available yet
    let allTxns: Array<{ status: string; amount: number }> = []
    const PAGE = 1000
    let from = 0

    while (true) {
      let query = supabase
        .from('bank_transactions')
        .select('status, amount')
        .range(from, from + PAGE - 1)

      if (fromDate) query = query.gte('entry_date', fromDate)
      if (toDate) query = query.lte('entry_date', toDate)
      if (matchSource) query = query.eq('match_source', matchSource)

      const { data, error: txnError } = await query
      if (txnError) throw txnError
      if (!data || data.length === 0) break
      allTxns = allTxns.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }

    const txns = allTxns

    const stats = {
      total_transactions: txns.length,
      total_amount: txns.reduce((sum, t) => sum + Number(t.amount), 0),
      matched_count: txns.filter(t => t.status === 'matched').length,
      matched_amount: txns
        .filter(t => t.status === 'matched')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      unmatched_count: txns.filter(t => t.status === 'unmatched').length,
      unmatched_amount: txns
        .filter(t => t.status === 'unmatched')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      ignored_count: txns.filter(t => t.status === 'ignored').length,
      match_rate:
        txns.length > 0
          ? Math.round((txns.filter(t => t.status === 'matched').length / txns.length) * 100)
          : 0,
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error fetching payment stats:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
