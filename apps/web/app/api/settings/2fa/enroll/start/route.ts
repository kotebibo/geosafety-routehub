export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createChallenge } from '@/lib/auth/twoFactor'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { sendTwoFactorEmail } from '@/lib/email'
import {
  checkAuthRateLimit,
  getClientIp,
  ipOrNull,
  CHALLENGE_RATE_LIMIT,
} from '@/lib/auth/rateLimit'

export async function POST(request: NextRequest) {
  const ip = ipOrNull(getClientIp(request))
  const userAgent = request.headers.get('user-agent')

  try {
    const { user } = await requireAuth()
    if (!user.email) {
      return NextResponse.json({ error: 'Account has no email on file' }, { status: 400 })
    }

    const limit = await checkAuthRateLimit({
      scope: '2fa_enroll_challenge',
      identifier: user.id,
      ...CHALLENGE_RATE_LIMIT,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many attempts. Please try again later.',
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        { status: 429 }
      )
    }

    // Enrollment only supports the typed code (the user is already in an
    // authenticated browser session, so a click-through link adds nothing) —
    // the link half of the challenge is simply unused here.
    const { code } = await createChallenge({
      userId: user.id,
      purpose: 'enroll',
      ip,
      userAgent,
    })

    await sendTwoFactorEmail(user.email, { code })

    await logAuthEvent({
      userId: user.id,
      eventType: '2fa_challenge_sent',
      ip,
      userAgent,
      metadata: { purpose: 'enroll' },
    })

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('2FA enroll start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
