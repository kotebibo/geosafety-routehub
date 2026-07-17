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
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const STALE_ALERT_TYPE = 'bank_ingestion_stale'
const DEFAULT_STALE_BUSINESS_DAYS = 3

function subtractBusinessDays(from: Date, businessDays: number): Date {
  const d = new Date(from)
  let remaining = businessDays
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() - 1)
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) remaining--
  }
  return d
}

async function checkBankIngestionStale(request: NextRequest) {
  const staleBusinessDaysParam = new URL(request.url).searchParams.get('staleBusinessDays')
  const staleBusinessDays = staleBusinessDaysParam
    ? Number(staleBusinessDaysParam)
    : DEFAULT_STALE_BUSINESS_DAYS

  const supabase = createServiceClient() as any

  const { data: latest, error: latestError } = await supabase
    .from('bank_transactions')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) throw latestError

  const now = new Date()
  const cutoff = subtractBusinessDays(now, staleBusinessDays)
  const maxCreatedAt = latest?.created_at ? new Date(latest.created_at) : null
  const isStale = !maxCreatedAt || maxCreatedAt < cutoff

  if (!isStale) {
    return { stale: false as const }
  }

  // Dedup guard: skip if we already alerted today (UTC).
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const { data: existingAlert, error: existingAlertError } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', STALE_ALERT_TYPE)
    .gte('created_at', startOfToday.toISOString())
    .limit(1)
    .maybeSingle()

  if (existingAlertError) throw existingAlertError

  if (existingAlert) {
    return { stale: true as const, alreadyAlertedToday: true }
  }

  // Look up admins to notify (same pattern as contract-expiry-alerts)
  const { data: adminRoles, error: adminRolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')

  if (adminRolesError) throw adminRolesError

  const adminIds = (adminRoles || []).map((r: any) => r.user_id)

  let adminEmails: string[] = []
  if (adminIds.length > 0) {
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('id, email')
      .in('id', adminIds)

    if (adminsError) throw adminsError
    adminEmails = (admins || []).filter((u: any) => u.email).map((u: any) => u.email)
  }

  const lastIngestedLabel = maxCreatedAt ? maxCreatedAt.toISOString() : 'არასდროს'

  const title = 'საბანკო ტრანზაქციები არ ჩაიტვირთა'
  const message = maxCreatedAt
    ? `ბოლო ტრანზაქცია ჩაიტვირთა ${maxCreatedAt.toLocaleDateString('ka-GE')}-ს — ${staleBusinessDays}+ სამუშაო დღეა არაფერი ახალი არ შემოსულა.`
    : `ბაზაში საერთოდ არ არის საბანკო ტრანზაქცია.`

  await Promise.all(
    adminIds.map((userId: string) =>
      (supabase as any).rpc('create_notification', {
        p_user_id: userId,
        p_type: STALE_ALERT_TYPE,
        p_title: title,
        p_message: message,
        p_data: { last_ingested_at: maxCreatedAt?.toISOString() ?? null, staleBusinessDays },
      })
    )
  )

  if (adminEmails.length > 0) {
    await sendEmail({
      to: adminEmails,
      subject: `⚠️ საბანკო ტრანზაქციები არ ჩაიტვირთა — RouteHub`,
      text: `${title}\n\nბოლო ტრანზაქციის დრო: ${lastIngestedLabel}\n${message}`,
      html: `<p><strong>${title}</strong></p><p>ბოლო ტრანზაქციის დრო: ${lastIngestedLabel}</p><p>${message}</p>`,
    })
  }

  return {
    stale: true as const,
    alreadyAlertedToday: false,
    lastIngestedAt: maxCreatedAt?.toISOString() ?? null,
    emailsSent: adminEmails.length,
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (header or query param for manual testing)
    const authHeader = request.headers.get('authorization')
    const secretParam = new URL(request.url).searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staleCheck = await checkBankIngestionStale(request)

    if (!isBogConfigured()) {
      return NextResponse.json(
        { error: 'BOG API not configured', skipped: true, staleCheck },
        { status: 200 }
      )
    }

    const result = await reconcileUnmatched()

    console.log('[bank-reconcile]', result)

    return NextResponse.json({
      success: true,
      ...result,
      staleCheck,
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
