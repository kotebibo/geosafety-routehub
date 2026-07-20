/**
 * Server-side login.
 *
 * Credentials are checked with a non-persisting Supabase client first — this
 * is what makes 2FA gating possible at all: if we checked the password with
 * the cookie-writing client, a valid session would already be sitting in the
 * browser the instant the password matched, regardless of whether 2FA is
 * required. Only once we know 2FA is NOT required do we re-run the check on
 * the real cookie-writing client to actually establish the session.
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { signInSchema } from '@/lib/validations/auth.schema'
import {
  createServerClient,
  createServiceClient,
  createNonPersistingClient,
} from '@/lib/supabase/server'
import { createChallenge, CHALLENGE_TTL_SECONDS } from '@/lib/auth/twoFactor'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { sendTwoFactorEmail } from '@/lib/email'
import { PENDING_2FA_COOKIE } from '@/lib/auth/constants'
import {
  checkAuthRateLimit,
  getClientIp,
  ipOrNull,
  LOGIN_RATE_LIMIT,
  CHALLENGE_RATE_LIMIT,
} from '@/lib/auth/rateLimit'

export async function POST(request: NextRequest) {
  const rawIp = getClientIp(request)
  const ip = ipOrNull(rawIp)
  const userAgent = request.headers.get('user-agent')

  try {
    const body = await request.json()
    const { email, password } = signInSchema.parse(body)

    const [emailLimit, ipLimit] = await Promise.all([
      checkAuthRateLimit({ scope: 'login', identifier: email, ...LOGIN_RATE_LIMIT }),
      checkAuthRateLimit({ scope: 'login', identifier: `ip:${rawIp}`, ...LOGIN_RATE_LIMIT }),
    ])

    if (!emailLimit.allowed || !ipLimit.allowed) {
      await logAuthEvent({ eventType: 'login_locked', ip, userAgent, metadata: { email } })
      return NextResponse.json(
        {
          error: 'Too many attempts. Please try again later.',
          retryAfterSeconds: Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds),
        },
        { status: 429 }
      )
    }

    const throwaway = createNonPersistingClient()
    const { data: signInData, error: signInError } = await throwaway.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !signInData.user) {
      await logAuthEvent({ eventType: 'login_failed', ip, userAgent, metadata: { email } })
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const userId = signInData.user.id
    const service = createServiceClient()
    const { data: profile } = await service
      .from('users')
      .select('mfa_enabled')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.mfa_enabled) {
      const supabase = createServerClient()
      const { error: establishError } = await supabase.auth.signInWithPassword({ email, password })
      if (establishError) throw establishError

      await service
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId)
      await logAuthEvent({ userId, eventType: 'login_success', ip, userAgent })

      return NextResponse.json({ status: 'ok' })
    }

    const challengeLimit = await checkAuthRateLimit({
      scope: '2fa_challenge',
      identifier: userId,
      ...CHALLENGE_RATE_LIMIT,
    })
    if (!challengeLimit.allowed) {
      await logAuthEvent({ userId, eventType: 'login_locked', ip, userAgent })
      return NextResponse.json(
        {
          error: 'Too many attempts. Please try again later.',
          retryAfterSeconds: challengeLimit.retryAfterSeconds,
        },
        { status: 429 }
      )
    }

    const { code, linkToken, cookieToken } = await createChallenge({
      userId,
      purpose: 'login',
      ip,
      userAgent,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const verifyLink = `${appUrl}/auth/2fa?link=${encodeURIComponent(linkToken)}`
    await sendTwoFactorEmail(email, { code, verifyLink })

    cookies().set(PENDING_2FA_COOKIE, cookieToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CHALLENGE_TTL_SECONDS,
    })

    await logAuthEvent({ userId, eventType: '2fa_challenge_sent', ip, userAgent })

    return NextResponse.json({ status: 'mfa_required' })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
