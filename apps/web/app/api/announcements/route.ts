import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireAdmin } from '@/middleware/auth'
import { sendEmail, generateAnnouncementEmail } from '@/lib/email'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  priority: z.enum(['normal', 'important', 'urgent']).default('normal'),
  is_published: z.boolean().optional().default(true),
})

export async function GET() {
  try {
    await requireAuth()

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAdmin()
    const body = await request.json()
    const validated = createAnnouncementSchema.parse(body)

    // Create announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        ...validated,
        author_id: session.user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Get author name
    const { data: authorData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', session.user.id)
      .single()

    const authorName = authorData?.full_name || authorData?.email || 'Admin'

    // Send notifications + emails in background (don't block response)
    if (validated.is_published !== false) {
      sendNotificationsAndEmails(announcement.id, validated, authorName).catch(
        (err) => console.error('Background notification/email failed:', err)
      )
    }

    return NextResponse.json(announcement, { status: 201 })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function sendNotificationsAndEmails(
  announcementId: string,
  input: { title: string; content: string; priority: string },
  authorName: string
) {
  // Fetch all active users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('is_active', true)

  if (error || !users?.length) return

  // Create in-app notifications
  const notificationPromises = users.map((user) =>
    supabase.rpc('create_notification', {
      p_user_id: user.id,
      p_type: 'announcement_new',
      p_title: input.title,
      p_message: input.content.substring(0, 200),
      p_data: {
        announcement_id: announcementId,
        announcement_title: input.title,
        priority: input.priority,
      },
    })
  )
  await Promise.allSettled(notificationPromises)

  // Send email
  const emails = users.map((u) => u.email).filter(Boolean)
  if (emails.length > 0) {
    const { text, html } = generateAnnouncementEmail({
      title: input.title,
      content: input.content,
      priority: input.priority,
      author_name: authorName,
    })

    const subjectPrefix = input.priority === 'urgent'
      ? '🚨 სასწრაფო: '
      : input.priority === 'important'
        ? '⚠️ '
        : ''

    await sendEmail({
      to: emails,
      subject: `${subjectPrefix}${input.title} — RouteHub`,
      text,
      html,
    })
  }
}
