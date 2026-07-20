export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import {
  createChallenge,
  findUserIdForPendingLoginCookie,
  CHALLENGE_TTL_SECONDS,
} from '@/lib/auth/twoFactor'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { sendTwoFactorEmail } from '@/lib/email'
import { PENDING_2FA_COOKIE } from '@/lib/auth/constants'
import { checkAuthRateLimit, getClientIp, ipOrNull, RESEND_RATE_LIMIT } from '@/lib/auth/rateLimit'

export async function POST(request: NextRequest) {
  const ip = ipOrNull(getClientIp(request))
  const userAgent = request.headers.get('user-agent')

  try {
    const cookieToken = cookies().get(PENDING_2FA_COOKIE)?.value
    if (!cookieToken) {
      return NextResponse.json({ error: 'No pending login to resend a code for' }, { status: 401 })
    }

    const userId = await findUserIdForPendingLoginCookie(cookieToken)
    if (!userId) {
      return NextResponse.json({ error: 'No pending login to resend a code for' }, { status: 401 })
    }

    const resendLimit = await checkAuthRateLimit({
      scope: '2fa_resend',
      identifier: userId,
      ...RESEND_RATE_LIMIT,
    })
    if (!resendLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many attempts. Please try again later.',
          retryAfterSeconds: resendLimit.retryAfterSeconds,
        },
        { status: 429 }
      )
    }

    const service = createServiceClient()
    const { data: profile } = await service
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle()
    if (!profile?.email) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const {
      code,
      linkToken,
      cookieToken: newCookieToken,
    } = await createChallenge({
      userId,
      purpose: 'login',
      ip,
      userAgent,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const verifyLink = `${appUrl}/auth/2fa?link=${encodeURIComponent(linkToken)}`
    await sendTwoFactorEmail(profile.email, { code, verifyLink })

    cookies().set(PENDING_2FA_COOKIE, newCookieToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CHALLENGE_TTL_SECONDS,
    })

    await logAuthEvent({ userId, eventType: '2fa_resend', ip, userAgent })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('2FA resend error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
