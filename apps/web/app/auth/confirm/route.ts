import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Verifies a token_hash from an auth email (password recovery, invite,
 * email change) and establishes the session in cookies server-side.
 *
 * Unlike the PKCE ?code= flow, token_hash verification does not depend on
 * a code verifier stored in the requesting browser — so the email link
 * works no matter where it's opened (different browser, phone mail app).
 * The recovery email template links here via the caller's origin (so the
 * link works on localhost and on each deployed domain):
 *   {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
 * where redirectTo is passed to resetPasswordForEmail as
 * `${window.location.origin}/auth/confirm` (must be in the allowlist).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = createServerClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      const next = type === 'recovery' ? '/auth/reset-password' : '/'
      return NextResponse.redirect(new URL(next, url.origin))
    }
    console.error('Token verification failed:', error.message)
  }

  return NextResponse.redirect(new URL('/auth/login?error=invalid_link', url.origin))
}
