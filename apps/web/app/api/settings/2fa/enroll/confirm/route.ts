export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import { createServerClient } from '@/lib/supabase/server'
import { verifyEnrollChallenge } from '@/lib/auth/twoFactor'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { getClientIp, ipOrNull } from '@/lib/auth/rateLimit'

const confirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export async function POST(request: NextRequest) {
  const ip = ipOrNull(getClientIp(request))
  const userAgent = request.headers.get('user-agent')

  try {
    const { user } = await requireAuth()
    const body = await request.json()
    const { code } = confirmSchema.parse(body)

    const result = await verifyEnrollChallenge(user.id, code)
    if (!result.ok) {
      await logAuthEvent({
        userId: user.id,
        eventType: '2fa_verify_failed',
        ip,
        userAgent,
        metadata: { purpose: 'enroll', reason: result.reason },
      })
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('users')
      .update({ mfa_enabled: true, mfa_enrolled_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) throw error

    await logAuthEvent({ userId: user.id, eventType: '2fa_enabled', ip, userAgent })

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
    console.error('2FA enroll confirm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
