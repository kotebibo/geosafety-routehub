/**
 * Server-side password-recovery request.
 *
 * Generates a 6-digit recovery OTP via the admin API and emails it through
 * Resend ourselves — generateLink() creates the token without sending
 * anything, so the flow never depends on the Supabase dashboard email
 * template or SMTP config (which differ per instance and previously sent an
 * unusable link instead of the code the page asks for). The route also adds
 * durable rate limiting (per email + per IP) and a password_reset_requested
 * audit event. The response is identical whether or not the account exists —
 * no user enumeration. The code is verified client-side with
 * verifyOtp({ type: 'recovery' }).
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { resetPasswordRequestSchema } from '@/lib/validations/auth.schema'
import { createServiceClient } from '@/lib/supabase/server'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { sendPasswordRecoveryEmail } from '@/lib/email'
import {
  checkAuthRateLimit,
  getClientIp,
  ipOrNull,
  RECOVERY_RATE_LIMIT,
} from '@/lib/auth/rateLimit'

export async function POST(request: NextRequest) {
  const rawIp = getClientIp(request)
  const ip = ipOrNull(rawIp)
  const userAgent = request.headers.get('user-agent')

  try {
    const body = await request.json()
    const { email } = resetPasswordRequestSchema.parse(body)

    const [emailLimit, ipLimit] = await Promise.all([
      checkAuthRateLimit({ scope: 'recovery', identifier: email, ...RECOVERY_RATE_LIMIT }),
      checkAuthRateLimit({ scope: 'recovery', identifier: `ip:${rawIp}`, ...RECOVERY_RATE_LIMIT }),
    ])
    if (!emailLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many attempts. Please try again later.',
          retryAfterSeconds: Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds),
        },
        { status: 429 }
      )
    }

    // userId resolves only for real accounts; the event is still worth
    // writing without one (it captures the attempted address + IP).
    const service = createServiceClient()
    const { data: account } = await service
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (account) {
      // generateLink creates the recovery OTP without sending any email —
      // we deliver the 6-digit code ourselves via Resend.
      const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
        type: 'recovery',
        email,
      })
      const otp = linkData?.properties?.email_otp
      // Suppress failures — a distinguishable error here would become an
      // enumeration oracle. The user can hit "resend" if nothing arrives.
      if (linkError || !otp) {
        console.error('Recovery link generation failed:', linkError?.message ?? 'no email_otp')
      } else {
        const sent = await sendPasswordRecoveryEmail(email, otp)
        if (!sent) {
          console.error('Recovery code email send failed for', email)
        }
      }
    }
    await logAuthEvent({
      userId: account?.id ?? null,
      eventType: 'password_reset_requested',
      ip,
      userAgent,
      metadata: { email },
    })

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Recovery request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
