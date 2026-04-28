/**
 * Payment Stats API
 * Returns summary statistics for the payments dashboard
 * Protected: Admin or Dispatcher
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'

export async function GET() {
  try {
    await requireAdminOrDispatcher()
    const supabase = createServerClient() as any

    // Get counts by status
    const { data: statusCounts, error: countError } = await supabase
      .from('bank_transactions')
      .select('status', { count: 'exact', head: false })

    if (countError) throw countError

    // Get totals with a single query
    const { data: allTxns, error: txnError } = await supabase
      .from('bank_transactions')
      .select('status, amount')

    if (txnError) throw txnError

    const txns: Array<{ status: string; amount: number }> = allTxns || []

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
