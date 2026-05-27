/**
 * Server-side notification helper.
 * Creates an in-app notification AND sends an email.
 *
 * Use this from API routes and server-side code instead of
 * calling create_notification RPC directly.
 */

import { sendEmail } from '@/lib/email'
import { generateNotificationEmail } from '@/lib/email-templates'

interface NotifyOptions {
  supabase: any // Supabase client (service or session)
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
}

/**
 * Create in-app notification and send email (fire-and-forget).
 */
export async function notifyUser(options: NotifyOptions): Promise<string | null> {
  const { supabase, userId, type, title, message, data = {} } = options

  // 1. Create in-app notification
  const { data: notificationId, error } = await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_data: data,
  })

  if (error) {
    console.error('Failed to create notification:', error)
    return null
  }

  // 2. Send email (fire-and-forget, don't block on failure)
  sendNotificationEmail({ supabase, userId, type, title, message, data }).catch(err => {
    console.error('Email notification failed:', err)
  })

  return notificationId
}

/**
 * Send email for a notification. Looks up user email and sends.
 */
async function sendNotificationEmail(options: {
  supabase: any
  userId: string
  type: string
  title: string
  message: string
  data: Record<string, any>
}): Promise<boolean> {
  const { supabase, userId, type, title, message, data } = options

  // Get user email
  const { data: user } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (!user?.email) return false

  const email = generateNotificationEmail({ type, title, message, data })

  return sendEmail({
    to: user.email,
    subject: email.subject,
    text: email.text,
    html: email.html,
  })
}

/**
 * Notify multiple users at once (e.g., for announcements).
 * Creates in-app notifications and sends emails in parallel.
 */
export async function notifyUsers(
  supabase: any,
  userIds: string[],
  type: string,
  title: string,
  message: string,
  data: Record<string, any> = {}
): Promise<void> {
  await Promise.allSettled(
    userIds.map(userId => notifyUser({ supabase, userId, type, title, message, data }))
  )
}
