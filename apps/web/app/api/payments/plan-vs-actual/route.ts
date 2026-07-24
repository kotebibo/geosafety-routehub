/**
 * @swagger
 * /api/payments/plan-vs-actual:
 *   get:
 *     summary: Planned (contracts) vs actual (bank) income by month
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Per-month expected/received/difference plus period totals
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
import { financialAnalyticsService, type SelectFn } from '@/services/financial-analytics.service'

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const { year } = querySchema.parse({
      year: request.nextUrl.searchParams.get('year') ?? undefined,
    })

    const supabase = createServerClient() as any
    const select: SelectFn = (table, columns, opts) => supabase.from(table).select(columns, opts)

    const today = new Date().toISOString().slice(0, 10)
    const targetYear = year ?? Number(today.slice(0, 4))
    const from = `${targetYear}-01-01`
    // Don't project future months of the current year — they'd show expected
    // income with no received yet and skew the totals.
    const to = `${targetYear}-12-31` < today ? `${targetYear}-12-31` : today

    const result = await financialAnalyticsService.getPlanVsActual(select, { from, to })

    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    return response
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
    console.error('plan-vs-actual GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
