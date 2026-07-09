/**
 * @swagger
 * /api/notifications/send-email:
 *   post:
 *     summary: Send an email notification to a user
 *     description: >
 *       Looks up the user's email by user_id, generates an email from the
 *       notification type/title/message, and sends it via Resend. Accepts
 *       either a user session cookie or an x-internal-secret header (for
 *       server-side callers like cron jobs).
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, type, title]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 description: Notification type (e.g. item_overdue)
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               data:
 *                 type: object
 *                 description: Additional context passed to email template
 *     responses:
 *       200:
 *         description: Email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sent:
 *                   type: boolean
 *                 email:
 *                   type: string
 *       400:
 *         description: Missing required fields (user_id, type, or title)
 *       401:
 *         description: Authentication required (no session or internal secret)
 *       404:
 *         description: User email not found
 *       500:
 *         description: Failed to send email
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/middleware/auth'
import { sendEmail } from '@/lib/email'
import { generateNotificationEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  // Check internal secret first (for server-side calls like cron)
  const authHeader = request.headers.get('x-internal-secret')
  const secret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET
  const hasInternalSecret = secret && authHeader === secret

  // If no internal secret, verify user is authenticated
  if (!hasInternalSecret) {
    try {
      await requireAuth()
    } catch {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  try {
    const { user_id, type, title, message, data = {} } = await request.json()

    if (!user_id || !type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user email using service client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user_id)
      .maybeSingle()

    if (!user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 })
    }

    // Generate email content from notification data
    const email = generateNotificationEmail({ type, title, message, data })

    const sent = await sendEmail({
      to: user.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    })

    return NextResponse.json({ sent, email: user.email })
  } catch (error) {
    console.error('Notification email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
