/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: List bank transactions
 *     description: Returns paginated bank transactions with optional filters for status, company, date range, and text search.
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [matched, unmatched, ignored]
 *         description: Filter by transaction status
 *       - name: companyId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by matched company ID
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
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Free-text search across sender name, tax ID, purpose, and doc key
 *       - name: matchSource
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, paused, ended, one_time]
 *         description: Filter by contract match source
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-based)
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Paginated list of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher access required
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Manually match or ignore a transaction
 *     description: Admin-only action to manually match a transaction to a company or mark it as ignored. Creates an audit trail for matches.
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, transactionId]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [match, ignore, unignore]
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               companyId:
 *                 type: string
 *                 format: uuid
 *                 description: Required when action is "match"
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Action completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 action:
 *                   type: string
 *       400:
 *         description: Validation failed or missing companyId for match action
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin, requireAdminOrDispatcher } from '@/middleware/auth'

const manualMatchSchema = z.object({
  action: z.enum(['match', 'ignore', 'unignore']),
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
    const search = searchParams.get('search')
    const matchSource = searchParams.get('matchSource') // 'active', 'paused', 'ended', 'one_time'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('bank_transactions')
      .select('*', { count: 'exact' })
      .order('entry_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (matchSource) {
      query = query.eq('match_source', matchSource)
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
    if (search) {
      // Escape PostgREST or()-filter syntax characters so search terms like
      // "Ltd, Tbilisi" or "(Note)" don't break the filter parser or get
      // interpreted as extra clauses.
      const escapedSearch = search.replace(/[\\,()]/g, '\\$&')
      query = query.or(
        `sender_name.ilike.%${escapedSearch}%,sender_inn.ilike.%${escapedSearch}%,purpose.ilike.%${escapedSearch}%,doc_key.ilike.%${escapedSearch}%`
      )
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

    if (action === 'unignore') {
      const { error } = await supabase
        .from('bank_transactions')
        .update({ status: 'unmatched' })
        .eq('id', transactionId)

      if (error) throw error

      return NextResponse.json({ success: true, action: 'unignored' })
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
