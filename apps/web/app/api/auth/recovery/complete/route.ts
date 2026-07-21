/**
 * Server-side password-recovery completion.
 *
 * The browser holds a recovery session in cookies (set by /auth/confirm for
 * the email-link path, or by the client-side verifyOtp for the typed-code
 * path — createBrowserClient stores sessions in cookies). Moving the actual
 * updateUser here gives the reset what the client call couldn't enforce:
 * the real password policy server-side, a password_reset_completed audit
 * event, a "your password was changed" notice to the mailbox, and revocation
 * of trusted 2FA devices. Ends with a global sign-out so neither the
 * recovery session nor any session on the old password survives.
 */

export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { updatePasswordSchema } from '@/lib/validations/auth.schema'
import { createServerClient } from '@/lib/supabase/server'
import { logAuthEvent } from '@/lib/auth/auditLog'
import { revokeTrustedDevicesForUser } from '@/lib/auth/trustedDevice'
import { sendPasswordChangedEmail } from '@/lib/email'
import { getClientIp, ipOrNull } from '@/lib/auth/rateLimit'

export async function POST(request: NextRequest) {
  const ip = ipOrNull(getClientIp(request))
  const userAgent = request.headers.get('user-agent')

  try {
    const body = await request.json()
    const { password } = updatePasswordSchema.parse(body)

    const supabase = createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      // Surfaced verbatim-ish: the page maps known messages (same password,
      // missing session) to localized errors.
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // An attacker resetting the password via a compromised mailbox must not
    // inherit devices the real owner marked as trusted.
    await revokeTrustedDevicesForUser(user.id)
    await logAuthEvent({ userId: user.id, eventType: 'password_reset_completed', ip, userAgent })
    if (user.email) {
      await sendPasswordChangedEmail(user.email)
    }

    // Kill the recovery session and every other session on the old password.
    await supabase.auth.signOut({ scope: 'global' })

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Recovery complete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
