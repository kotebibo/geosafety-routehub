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
import { isTrustedDevice, TRUSTED_DEVICE_COOKIE } from '@/lib/auth/trustedDevice'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { sendTwoFactorEmail, sendLockoutEmail } from '@/lib/email'
import { PENDING_2FA_COOKIE } from '@/lib/auth/constants'
import {
  checkAuthRateLimit,
  getClientIp,
  ipOrNull,
  LOGIN_RATE_LIMIT,
  CHALLENGE_RATE_LIMIT,
} from '@/lib/auth/rateLimit'

/**
 * Email the account owner the first time a lockout window starts — an active
 * brute-force signal they'd otherwise never see. Guards: only for the
 * email-scoped limit (an IP-scoped lock must not let an attacker trigger
 * mail to arbitrary typed-in addresses), only for real accounts, and only
 * once per window (an earlier login_locked event for this email within the
 * lockout period means the notice already went out).
 */
async function notifyLockoutOnce(
  email: string,
  emailLimit: { allowed: boolean; retryAfterSeconds: number },
  ip: string | null
): Promise<void> {
  try {
    if (emailLimit.allowed) return

    const service = createServiceClient()
    const { data: account } = await service
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (!account) return

    const windowStart = new Date(Date.now() - LOGIN_RATE_LIMIT.lockoutSeconds * 1000).toISOString()
    const { data: priorLock } = await service
      .from('auth_audit_log')
      .select('id')
      .eq('event_type', 'login_locked')
      .contains('metadata', { email })
      .gte('created_at', windowStart)
      .limit(1)
      .maybeSingle()
    if (priorLock) return

    await sendLockoutEmail(email, Math.max(1, Math.ceil(emailLimit.retryAfterSeconds / 60)))
  } catch (error) {
    // Notification is best-effort — never block or fail the login response.
    console.error('Failed to send lockout notification:', error)
  }
}

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
      await notifyLockoutOnce(email, emailLimit, ip)
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

    // A device the user chose to remember after a previous 2FA verify skips
    // the email challenge — the 32-byte cookie token is the second factor.
    const trustedToken = cookies().get(TRUSTED_DEVICE_COOKIE)?.value
    if (trustedToken && (await isTrustedDevice(userId, trustedToken))) {
      const supabase = createServerClient()
      const { error: establishError } = await supabase.auth.signInWithPassword({ email, password })
      if (establishError) throw establishError

      await service
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId)
      await logAuthEvent({ userId, eventType: '2fa_trusted_device_used', ip, userAgent })
      await logAuthEvent({
        userId,
        eventType: 'login_success',
        ip,
        userAgent,
        metadata: { trusted_device: true },
      })

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
