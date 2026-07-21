/**
 * "Remember this device" for email 2FA.
 *
 * After a successful 2FA verify the user can opt to trust the browser for 30
 * days: an opaque 32-byte token is set as an httpOnly cookie and only its
 * SHA-256 lands in public.trusted_devices. The login route then skips the
 * email challenge when the cookie resolves to a live row for the same user —
 * the token itself is the credential, so there is no code to guess.
 */

import crypto from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/server'

export const TRUSTED_DEVICE_COOKIE = 'trusted_device'
export const TRUSTED_DEVICE_TTL_SECONDS = 30 * 24 * 60 * 60

function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/** Issue a new trusted-device token for the user; returns the plaintext token for the cookie. */
export async function createTrustedDevice(params: {
  userId: string
  ip?: string | null
  userAgent?: string | null
}): Promise<string> {
  const supabase = createServiceClient()
  const token = crypto.randomBytes(32).toString('base64url')

  const { error } = await supabase.from('trusted_devices').insert({
    user_id: params.userId,
    token_hash: hashSecret(token),
    expires_at: new Date(Date.now() + TRUSTED_DEVICE_TTL_SECONDS * 1000).toISOString(),
    ip: params.ip ?? null,
    user_agent: params.userAgent ?? null,
  })
  if (error) throw error

  return token
}

/**
 * True when the cookie token belongs to this user and hasn't expired.
 * Bumps last_used_at on success so stale-but-valid devices are visible.
 */
export async function isTrustedDevice(userId: string, cookieToken: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: row } = await supabase
    .from('trusted_devices')
    .select('id, user_id, expires_at')
    .eq('token_hash', hashSecret(cookieToken))
    .maybeSingle()

  if (!row || row.user_id !== userId) return false
  if (new Date(row.expires_at).getTime() < Date.now()) return false

  await supabase
    .from('trusted_devices')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)

  return true
}

/** Revoke every trusted device — on 2FA disable and on password reset. */
export async function revokeTrustedDevicesForUser(userId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('trusted_devices').delete().eq('user_id', userId)
  if (error) {
    console.error('Failed to revoke trusted devices:', error)
  }
}
