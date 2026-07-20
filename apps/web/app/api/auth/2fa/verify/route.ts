/**
 * Finishes a gated login: verifies the code (via the pending_2fa cookie) or
 * the emailed link token, then finalizes the real Supabase session using
 * admin.generateLink + verifyOtp — the same idiomatic "confirm a link
 * server-side" pattern already used by apps/web/app/auth/confirm/route.ts —
 * so we never have to store or relay raw access/refresh tokens ourselves.
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { verifyLoginChallengeByCookie, verifyLoginChallengeByLinkToken } from '@/lib/auth/twoFactor'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { PENDING_2FA_COOKIE } from '@/lib/auth/constants'
import { getClientIp, ipOrNull } from '@/lib/auth/rateLimit'

const verifySchema = z
  .object({
    code: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    linkToken: z.string().min(1).optional(),
  })
  .refine(v => !!v.code || !!v.linkToken, { message: 'code or linkToken is required' })

export async function POST(request: NextRequest) {
  const ip = ipOrNull(getClientIp(request))
  const userAgent = request.headers.get('user-agent')

  try {
    const body = await request.json()
    const { code, linkToken } = verifySchema.parse(body)

    const result = linkToken
      ? await verifyLoginChallengeByLinkToken(linkToken)
      : await (async () => {
          const cookieToken = cookies().get(PENDING_2FA_COOKIE)?.value
          if (!cookieToken) return { ok: false as const, reason: 'not_found' as const }
          return verifyLoginChallengeByCookie(cookieToken, code!)
        })()

    if (!result.ok) {
      await logAuthEvent({
        eventType: '2fa_verify_failed',
        ip,
        userAgent,
        metadata: { reason: result.reason },
      })
      // Never reveal whether it was wrong-code vs expired vs already-consumed.
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    const userId = result.userId
    const service = createServiceClient()
    const { data: profile } = await service
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.email) {
      throw new Error('User profile not found while finalizing 2FA login')
    }

    // Never let hashed_token/email_otp leave this scope (no logging, no
    // echoing in the response) — they're live bearer credentials.
    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      throw linkError ?? new Error('Failed to finalize session')
    }

    const supabase = createServerClient()
    const { error: finalizeError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: linkData.properties.hashed_token,
    })
    if (finalizeError) throw finalizeError

    cookies().delete(PENDING_2FA_COOKIE)
    await service.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', userId)
    await logAuthEvent({ userId, eventType: '2fa_verify_success', ip, userAgent })
    await logAuthEvent({ userId, eventType: 'login_success', ip, userAgent })

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('2FA verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
