/**
 * Email-based 2FA challenge issuance and verification.
 *
 * A challenge is issued for either 'login' (gates establishing a real
 * Supabase session after password check) or 'enroll' (confirms mailbox
 * ownership before flipping users.mfa_enabled on). Only hashes of the code,
 * link token, and — for 'login' — the opaque pending-session cookie value
 * are ever persisted; plaintext secrets exist only in memory long enough to
 * email/cookie them.
 */

import crypto from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/server'

export const CHALLENGE_TTL_SECONDS = 10 * 60
export const MAX_VERIFY_ATTEMPTS = 5

export type ChallengePurpose = 'login' | 'enroll'

function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export interface IssuedChallenge {
  challengeId: string
  code: string
  linkToken: string
  cookieToken: string | null
}

/**
 * Issue a fresh challenge, invalidating any prior un-consumed challenge for
 * the same user+purpose so only one code/link is ever valid at a time (a
 * stale code from an earlier attempt must not keep working).
 */
export async function createChallenge(params: {
  userId: string
  purpose: ChallengePurpose
  ip?: string | null
  userAgent?: string | null
}): Promise<IssuedChallenge> {
  const supabase = createServiceClient()

  await supabase
    .from('login_2fa_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', params.userId)
    .eq('purpose', params.purpose)
    .is('consumed_at', null)

  const code = generateOtpCode()
  const linkToken = generateRandomToken()
  const cookieToken = params.purpose === 'login' ? generateRandomToken() : null
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000).toISOString()

  const { data, error } = await supabase
    .from('login_2fa_challenges')
    .insert({
      user_id: params.userId,
      purpose: params.purpose,
      code_hash: hashSecret(code),
      link_token_hash: hashSecret(linkToken),
      cookie_token_hash: cookieToken ? hashSecret(cookieToken) : null,
      expires_at: expiresAt,
      ip: params.ip ?? null,
      user_agent: params.userAgent ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw error ?? new Error('Failed to create 2FA challenge')
  }

  return { challengeId: data.id, code, linkToken, cookieToken }
}

/**
 * Resolve the user behind a pending-login cookie without consuming or
 * mutating the challenge — used by the resend endpoint to know who to
 * re-issue a challenge for.
 */
export async function findUserIdForPendingLoginCookie(cookieToken: string): Promise<string | null> {
  const supabase = createServiceClient()
  const cookieHash = hashSecret(cookieToken)

  const { data: row } = await supabase
    .from('login_2fa_challenges')
    .select('user_id, expires_at')
    .eq('cookie_token_hash', cookieHash)
    .eq('purpose', 'login')
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row || isExpired(row)) return null
  return row.user_id
}

export type VerifyFailureReason = 'not_found' | 'expired' | 'locked' | 'invalid_code'
export type VerifyResult = { ok: true; userId: string } | { ok: false; reason: VerifyFailureReason }

type ChallengeRow = {
  id: string
  user_id: string
  code_hash: string
  attempt_count: number
  expires_at: string
  consumed_at: string | null
}

function isExpired(row: Pick<ChallengeRow, 'expires_at'>): boolean {
  return new Date(row.expires_at).getTime() < Date.now()
}

/**
 * Verify a login-time challenge by the opaque pending-session cookie value
 * plus the user-entered code. Used by POST /api/auth/2fa/verify.
 */
export async function verifyLoginChallengeByCookie(
  cookieToken: string,
  code: string
): Promise<VerifyResult> {
  const supabase = createServiceClient()
  const cookieHash = hashSecret(cookieToken)

  const { data: row } = await supabase
    .from('login_2fa_challenges')
    .select('id, user_id, code_hash, attempt_count, expires_at, consumed_at')
    .eq('cookie_token_hash', cookieHash)
    .eq('purpose', 'login')
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return { ok: false, reason: 'not_found' }
  if (isExpired(row)) return { ok: false, reason: 'expired' }
  if (row.attempt_count >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: 'locked' }

  if (!safeEqualHex(hashSecret(code), row.code_hash)) {
    await supabase
      .from('login_2fa_challenges')
      .update({ attempt_count: row.attempt_count + 1 })
      .eq('id', row.id)
    return { ok: false, reason: 'invalid_code' }
  }

  await supabase
    .from('login_2fa_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id)

  return { ok: true, userId: row.user_id }
}

/**
 * Verify a login-time challenge by the one-click email link token alone —
 * the link is meant to work even when opened on a different device/browser
 * than the one that started the login, so no cookie is required. The
 * 32-byte token itself is the credential; there's no meaningful "attempt
 * limit" to apply to guessing it.
 */
export async function verifyLoginChallengeByLinkToken(linkToken: string): Promise<VerifyResult> {
  const supabase = createServiceClient()
  const linkHash = hashSecret(linkToken)

  const { data: row } = await supabase
    .from('login_2fa_challenges')
    .select('id, user_id, code_hash, attempt_count, expires_at, consumed_at')
    .eq('link_token_hash', linkHash)
    .eq('purpose', 'login')
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return { ok: false, reason: 'not_found' }
  if (isExpired(row)) return { ok: false, reason: 'expired' }

  await supabase
    .from('login_2fa_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id)

  return { ok: true, userId: row.user_id }
}

/**
 * Verify a settings-enrollment challenge for an already-authenticated user
 * (confirms mailbox ownership before mfa_enabled is set true).
 */
export async function verifyEnrollChallenge(userId: string, code: string): Promise<VerifyResult> {
  const supabase = createServiceClient()

  const { data: row } = await supabase
    .from('login_2fa_challenges')
    .select('id, user_id, code_hash, attempt_count, expires_at, consumed_at')
    .eq('user_id', userId)
    .eq('purpose', 'enroll')
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return { ok: false, reason: 'not_found' }
  if (isExpired(row)) return { ok: false, reason: 'expired' }
  if (row.attempt_count >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: 'locked' }

  if (!safeEqualHex(hashSecret(code), row.code_hash)) {
    await supabase
      .from('login_2fa_challenges')
      .update({ attempt_count: row.attempt_count + 1 })
      .eq('id', row.id)
    return { ok: false, reason: 'invalid_code' }
  }

  await supabase
    .from('login_2fa_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id)

  return { ok: true, userId: row.user_id }
}
