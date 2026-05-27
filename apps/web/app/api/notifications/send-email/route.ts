export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { generateNotificationEmail } from '@/lib/email-templates'

/**
 * POST /api/notifications/send-email
 *
 * Sends an email notification to a user. Called internally after
 * creating an in-app notification.
 *
 * Body: { user_id, type, title, message, data }
 *
 * Protected by internal secret — not meant for client-side calls.
 */

export async function POST(request: NextRequest) {
  // Verify internal secret
  const authHeader = request.headers.get('x-internal-secret')
  const secret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET
  if (!secret || authHeader !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { user_id, type, title, message, data } = await request.json()

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
