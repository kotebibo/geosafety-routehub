/**
 * Admin recovery path for a user who lost access to the email their 2FA
 * depends on. Always notifies the affected user by email — a security
 * control silently disabled on someone's account should never be silent to
 * that person.
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { sendEmail } from '@/lib/email'
import { getClientIp, ipOrNull } from '@/lib/auth/rateLimit'

const disableUser2faSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
})

export async function POST(request: NextRequest) {
  const ip = ipOrNull(getClientIp(request))
  const userAgent = request.headers.get('user-agent')

  try {
    const { session } = await requireAdmin()
    const body = await request.json()
    const { userId } = disableUser2faSchema.parse(body)

    const service = createServiceClient()
    const { data: target, error: fetchError } = await service
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()
    if (fetchError || !target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error } = await service
      .from('users')
      .update({ mfa_enabled: false, mfa_enrolled_at: null })
      .eq('id', userId)
    if (error) throw error

    await logAuthEvent({
      userId,
      eventType: '2fa_disabled_by_admin',
      ip,
      userAgent,
      metadata: { adminId: session.user.id },
    })

    if (target.email) {
      await sendEmail({
        to: target.email,
        subject: 'RouteHub — ორფაქტორიანი ავთენტიფიკაცია გამორთულია',
        text: 'თქვენს ანგარიშზე ორფაქტორიანი ავთენტიფიკაცია გამორთო ადმინისტრატორმა. თუ ეს თქვენ არ მოგითხოვიათ, დაუკავშირდით მხარდაჭერას.',
      })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Admin disable-user-2fa error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
