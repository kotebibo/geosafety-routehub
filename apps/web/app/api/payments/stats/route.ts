/**
 * Payment Stats API
 * Returns summary statistics for the payments dashboard
 * Supports date range filtering (from/to query params)
 * Protected: Admin or Dispatcher
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

    // Fetch ALL transactions (Supabase default limit is 1000, so paginate)
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
