/**
 * Disabling 2FA requires re-entering the current password — a step-up check
 * against a hijacked-but-unlocked browser session. A fresh OTP on top would
 * not add a real second factor here (it's the same email channel already
 * trusted by this flow), so password alone is the right-sized bar.
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createNonPersistingClient } from '@/lib/supabase/server'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { revokeTrustedDevicesForUser } from '@/lib/auth/trustedDevice'
import { checkAuthRateLimit, getClientIp, ipOrNull, LOGIN_RATE_LIMIT } from '@/lib/auth/rateLimit'

const disableSchema = z.object({
  password: z.string().min(1, 'Password required'),
})

export async function POST(request: NextRequest) {
  const ip = ipOrNull(getClientIp(request))
  const userAgent = request.headers.get('user-agent')

  try {
    const { user } = await requireAuth()
    if (!user.email) {
      return NextResponse.json({ error: 'Account has no email on file' }, { status: 400 })
    }

    const body = await request.json()
    const { password } = disableSchema.parse(body)

    const limit = await checkAuthRateLimit({
      scope: 'settings_2fa_disable',
      identifier: user.id,
      ...LOGIN_RATE_LIMIT,
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

    const throwaway = createNonPersistingClient()
    const { error: passwordError } = await throwaway.auth.signInWithPassword({
      email: user.email,
      password,
    })
    if (passwordError) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('users')
      .update({ mfa_enabled: false, mfa_enrolled_at: null })
      .eq('id', user.id)
    if (error) throw error

    // Trusted devices only exist to skip a 2FA that no longer applies.
    await revokeTrustedDevicesForUser(user.id)
    await logAuthEvent({ userId: user.id, eventType: '2fa_disabled', ip, userAgent })

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('2FA disable error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
