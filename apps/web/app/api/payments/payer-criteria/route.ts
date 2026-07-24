/**
 * @swagger
 * /api/payments/payer-criteria:
 *   get:
 *     summary: Get payer-categorization thresholds
 *     description: Returns the manager-editable good/average/bad payer criteria, merged with defaults.
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current criteria
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher access required
 *   put:
 *     summary: Update payer-categorization thresholds
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Criteria saved
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher access required
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminOrDispatcher } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { PAYER_CRITERIA_KEY, readPayerCriteria } from '@/lib/payments/payer-criteria'

export async function GET() {
  try {
    await requireAdminOrDispatcher()
    const svc = createServiceClient() as any
    const criteria = await readPayerCriteria(svc)
    return NextResponse.json({ criteria })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (error.name === 'ForbiddenError')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    console.error('payer-criteria GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const putSchema = z.object({
  good_grace_days: z.number().int().min(0).max(31),
  bad_months_overdue: z.number().int().min(1).max(24),
  bad_debt_ratio: z.number().min(0).max(1000),
})

export async function PUT(request: NextRequest) {
  try {
    await requireAdminOrDispatcher()
    const criteria = putSchema.parse(await request.json())

    const svc = createServiceClient() as any
    const { error } = await svc.from('app_settings').upsert(
      {
        key: PAYER_CRITERIA_KEY,
        value: JSON.stringify(criteria),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    if (error) throw error
    return NextResponse.json({ success: true, criteria })
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
    console.error('payer-criteria PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
