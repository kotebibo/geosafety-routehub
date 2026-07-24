/**
 * @swagger
 * /api/payments/debtors:
 *   get:
 *     summary: Debtor list with aging and payer categorization
 *     description: Joins contract terms (boards) with bank transactions into a per-tax-id ledger, FIFO-ages unpaid months, resolves the responsible person and categorizes each payer (good/average/bad) using the manager-editable criteria. Also returns the plan-vs-actual monthly breakdown for the period.
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: months_back
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 24
 *           default: 6
 *     responses:
 *       200:
 *         description: Debtors, summary, per-month plan-vs-actual, and the criteria used
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher access required
 *       500:
 *         description: Internal server error
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'
import { readPayerCriteria } from '@/lib/payments/payer-criteria'
import { financialAnalyticsService, type SelectFn } from '@/services/financial-analytics.service'

const querySchema = z.object({
  months_back: z.coerce.number().int().min(1).max(24).default(6),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const { months_back } = querySchema.parse({
      months_back: request.nextUrl.searchParams.get('months_back') ?? undefined,
    })

    const supabase = createServerClient() as any
    const select: SelectFn = (table, columns, opts) => supabase.from(table).select(columns, opts)

    const now = new Date()
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months_back - 1), 1))
      .toISOString()
      .slice(0, 10)
    const to = now.toISOString().slice(0, 10)

    const criteria = await readPayerCriteria(supabase)
    const result = await financialAnalyticsService.getDebtorsDetailed(select, {
      from,
      to,
      criteria,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    console.error('payments debtors GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
