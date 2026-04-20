import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

/**
 * Cron endpoint: checks for expiring contracts and sends alerts.
 *
 * Thresholds:
 *   - 30 days: first warning
 *   - 14 days: urgent warning
 *   - 7 days: critical warning
 *   - 0 days (expired): expiry notice
 *
 * Runs daily via Vercel Cron. Protected by CRON_SECRET.
 *
 * GET /api/cron/contract-expiry-alerts
 */

const ALERT_THRESHOLDS = [
  { days: 30, label: '30 დღე', urgency: 'warning' as const },
  { days: 14, label: '14 დღე', urgency: 'urgent' as const },
  { days: 7, label: '7 დღე', urgency: 'critical' as const },
  { days: 0, label: 'ვადა ამოიწურა', urgency: 'expired' as const },
]

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Find the კომპანიები board
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .eq('name', 'კომპანიები')
      .maybeSingle()

    if (!board) {
      return NextResponse.json({ message: 'კომპანიები board not found' })
    }

    // Fetch all items with end dates (paginated)
    let allItems: any[] = []
    let from = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabase
        .from('board_items')
        .select('id, name, data')
        .eq('board_id', board.id)
        .is('deleted_at', null)
        .range(from, from + PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      allItems = allItems.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }

    // Filter to contracts hitting an alert threshold today
    const alerts: {
      item: any
      threshold: (typeof ALERT_THRESHOLDS)[number]
      daysRemaining: number
    }[] = []

    for (const item of allItems) {
      const endDate = item.data?.end_date
      if (!endDate) continue

      const days = daysUntil(endDate)

      // Check if this contract hits any threshold exactly today
      for (const threshold of ALERT_THRESHOLDS) {
        if (days === threshold.days) {
          alerts.push({ item, threshold, daysRemaining: days })
          break
        }
      }
    }

    if (alerts.length === 0) {
      return NextResponse.json({
        message: 'No contracts hitting alert thresholds today',
        checked: allItems.length,
      })
    }

    // Get admin/dispatcher users to notify
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'dispatcher'])

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json({ message: 'No admin/dispatcher users to notify' })
    }

    const userIds = adminRoles.map(r => r.user_id)

    // Get user emails
    const { data: users } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds)

    const userEmails = (users || []).filter(u => u.email).map(u => u.email)

    // Create in-app notifications for each alert
    let notificationsCreated = 0
    for (const alert of alerts) {
      const contractName = alert.item.name
      const amount = alert.item.data?.act_amount || 0
      const urgencyLabel =
        alert.threshold.urgency === 'expired'
          ? 'ვადა ამოიწურა'
          : `ვადის გასვლამდე ${alert.threshold.label}`

      const title =
        alert.threshold.urgency === 'expired'
          ? `კონტრაქტის ვადა ამოიწურა: ${contractName}`
          : `კონტრაქტი იწურება ${alert.threshold.label}-ში: ${contractName}`

      const message = `${contractName} — ₾${amount.toLocaleString()} — ${urgencyLabel}`

      for (const userId of userIds) {
        await supabase.rpc('create_notification', {
          p_user_id: userId,
          p_type: 'contract_expiring',
          p_title: title,
          p_message: message,
          p_data: {
            board_id: board.id,
            item_id: alert.item.id,
            contract_name: contractName,
            end_date: alert.item.data.end_date,
            days_remaining: alert.daysRemaining,
          },
        })
        notificationsCreated++
      }
    }

    // Send summary email
    if (userEmails.length > 0) {
      const { text, html } = generateExpiryEmail(alerts)
      await sendEmail({
        to: userEmails,
        subject: `⚠️ კონტრაქტების ვადის გაფრთხილება (${alerts.length}) — RouteHub`,
        text,
        html,
      })
    }

    return NextResponse.json({
      success: true,
      alerts: alerts.length,
      notifications: notificationsCreated,
      emails_sent_to: userEmails.length,
    })
  } catch (error) {
    console.error('Contract expiry alert error:', error)
    return NextResponse.json({ error: 'Failed to process contract expiry alerts' }, { status: 500 })
  }
}

function generateExpiryEmail(
  alerts: { item: any; threshold: (typeof ALERT_THRESHOLDS)[number]; daysRemaining: number }[]
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://routehub.vercel.app'

  // Group by urgency
  const expired = alerts.filter(a => a.threshold.urgency === 'expired')
  const critical = alerts.filter(a => a.threshold.urgency === 'critical')
  const urgent = alerts.filter(a => a.threshold.urgency === 'urgent')
  const warning = alerts.filter(a => a.threshold.urgency === 'warning')

  const textLines = [
    `კონტრაქტების ვადის გაფრთხილება — ${new Date().toLocaleDateString('ka-GE')}`,
    '',
  ]

  const htmlRows: string[] = []

  const sections = [
    { items: expired, label: 'ვადაგასული', color: '#991b1b', bg: '#fee2e2' },
    { items: critical, label: '7 დღეში იწურება', color: '#9a3412', bg: '#ffedd5' },
    { items: urgent, label: '14 დღეში იწურება', color: '#92400e', bg: '#fef3c7' },
    { items: warning, label: '30 დღეში იწურება', color: '#1e40af', bg: '#dbeafe' },
  ]

  for (const section of sections) {
    if (section.items.length === 0) continue

    textLines.push(`\n--- ${section.label} (${section.items.length}) ---`)
    for (const a of section.items) {
      textLines.push(
        `  ${a.item.name} — ₾${(a.item.data?.act_amount || 0).toLocaleString()} — ${a.item.data?.end_date}`
      )
    }

    htmlRows.push(`
      <tr>
        <td colspan="3" style="padding:12px 16px 6px;font-weight:bold;">
          <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;background:${section.bg};color:${section.color};">
            ${section.label} (${section.items.length})
          </span>
        </td>
      </tr>
    `)

    for (const a of section.items) {
      htmlRows.push(`
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:8px 16px;color:#111;">${a.item.name}</td>
          <td style="padding:8px 16px;text-align:right;color:#111;">₾${(a.item.data?.act_amount || 0).toLocaleString()}</td>
          <td style="padding:8px 16px;text-align:right;color:#6b7280;">${a.item.data?.end_date || ''}</td>
        </tr>
      `)
    }
  }

  const text = textLines.join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:650px;margin:0 auto;padding:24px;">
    <div style="background:#E2445C;color:white;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:20px;">⚠️ კონტრაქტების ვადის გაფრთხილება</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${new Date().toLocaleDateString('ka-GE')} — ${alerts.length} კონტრაქტი</p>
    </div>
    <div style="background:white;border:1px solid #e5e7eb;border-top:none;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb;">
            <th style="padding:12px 16px;text-align:left;color:#6b7280;font-weight:500;">კომპანია</th>
            <th style="padding:12px 16px;text-align:right;color:#6b7280;font-weight:500;">თანხა</th>
            <th style="padding:12px 16px;text-align:right;color:#6b7280;font-weight:500;">ვადა</th>
          </tr>
        </thead>
        <tbody>
          ${htmlRows.join('')}
        </tbody>
      </table>
    </div>
    <div style="background:white;border:1px solid #e5e7eb;border-top:none;padding:16px;border-radius:0 0 12px 12px;">
      <a href="${appUrl}/analytics" style="display:inline-block;padding:12px 24px;background:#6161FF;color:white;text-decoration:none;border-radius:8px;font-size:14px;">ნახე ანალიტიკაში</a>
    </div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
      <p>RouteHub — ავტომატური გაფრთხილება</p>
    </div>
  </div>
</body></html>`

  return { text, html }
}
