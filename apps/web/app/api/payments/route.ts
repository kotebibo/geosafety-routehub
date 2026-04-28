/**
 * Payments API
 * List, filter, and manage bank transactions
 * Protected: Admin or Dispatcher
 * - GET: List transactions with filters
 * - POST: Manual match or ignore transaction
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin, requireAdminOrDispatcher } from '@/middleware/auth'

const manualMatchSchema = z.object({
  action: z.enum(['match', 'ignore']),
  transactionId: z.string().uuid(),
  companyId: z.string().uuid().optional(), // required if action = 'match'
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAdminOrDispatcher()
    const supabase = createServerClient() as any
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status') // 'matched', 'unmatched', 'ignored', or null for all
    const companyId = searchParams.get('companyId')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('bank_transactions')
      .select('*, companies:matched_company_id(id, name, tax_id)', { count: 'exact' })
      .order('entry_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (companyId) {
      query = query.eq('matched_company_id', companyId)
    }
    if (fromDate) {
      query = query.gte('entry_date', fromDate)
    }
    if (toDate) {
      query = query.lte('entry_date', toDate)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      transactions: data,
      total: count,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('Error fetching payments:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAdmin()
    const supabase = createServerClient() as any

    const body = await request.json()
    const { action, transactionId, companyId, notes } = manualMatchSchema.parse(body)

    if (action === 'match') {
      if (!companyId) {
        return NextResponse.json(
          { error: 'companyId is required for match action' },
          { status: 400 }
        )
      }

      // Update transaction
      const { error: updateError } = await supabase
        .from('bank_transactions')
        .update({
          matched_company_id: companyId,
          match_method: 'manual',
          match_confidence: 1.0,
          status: 'matched',
        })
        .eq('id', transactionId)

      if (updateError) throw updateError

      // Create audit trail
      const { error: auditError } = await supabase.from('payment_matches').insert({
        transaction_id: transactionId,
        company_id: companyId,
        matched_by: session.user.id,
        match_method: 'manual',
        confidence: 1.0,
        notes: notes || null,
      })

      if (auditError) throw auditError

      return NextResponse.json({ success: true, action: 'matched' })
    }

    if (action === 'ignore') {
      const { error } = await supabase
        .from('bank_transactions')
        .update({ status: 'ignored' })
        .eq('id', transactionId)

      if (error) throw error

      return NextResponse.json({ success: true, action: 'ignored' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error processing payment action:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
