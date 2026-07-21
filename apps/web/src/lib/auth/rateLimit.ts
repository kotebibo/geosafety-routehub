/**
 * Durable, Postgres-backed rate limiting for login/2FA endpoints.
 *
 * The existing in-memory limiter (src/middleware/rateLimit.ts) resets per
 * serverless instance/cold-start and was never actually reached by login
 * traffic anyway. These flows need a limiter that survives across instances
 * and regions, so counters live in public.auth_rate_limits and are bumped
 * atomically via the check_and_bump_rate_limit() SQL function — see
 * supabase/migrations/108_auth_login_2fa.sql for why this can't be a
 * read-then-write from the app layer.
 */

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() || real || 'unknown'
}

/** Postgres `inet` columns reject the 'unknown' sentinel — use this at the DB boundary. */
export function ipOrNull(ip: string): string | null {
  return ip && ip !== 'unknown' ? ip : null
}

export interface RateLimitCheck {
  allowed: boolean
  retryAfterSeconds: number
}

// Local-testing bypass — keep false so limits run everywhere; the NODE_ENV
// guard below means this can never disable limits in production either way.
const DISABLE_RATE_LIMITS_FOR_LOCAL_DEV = false

/**
 * On a DB error this fails OPEN (allows the request) rather than locking
 * everyone out because of an infra hiccup — rate limiting here is
 * defense-in-depth on top of password + 2FA, not the sole control.
 */
export async function checkAuthRateLimit(params: {
  scope: string
  identifier: string
  max: number
  windowSeconds: number
  lockoutSeconds: number
}): Promise<RateLimitCheck> {
  if (DISABLE_RATE_LIMITS_FOR_LOCAL_DEV && process.env.NODE_ENV !== 'production') {
    return { allowed: true, retryAfterSeconds: 0 }
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('check_and_bump_rate_limit', {
    p_scope: params.scope,
    p_identifier: params.identifier,
    p_max: params.max,
    p_window_seconds: params.windowSeconds,
    p_lockout_seconds: params.lockoutSeconds,
  })

  if (error) {
    console.error('Auth rate limit check failed, failing open:', error)
    return { allowed: true, retryAfterSeconds: 0 }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: row?.allowed ?? true,
    retryAfterSeconds: row?.retry_after_seconds ?? 0,
  }
}

// Password check: 10 attempts / 5 min per identifier (email or IP), then
// locked for 1 min (re-locks per extra attempt until the window expires).
export const LOGIN_RATE_LIMIT = { max: 10, windowSeconds: 300, lockoutSeconds: 60 }

// 2FA challenge issuance: caps total codes issued per account, which in turn
// bounds total guesses (issuance-count x MAX_VERIFY_ATTEMPTS) an attacker who
// already has the password could accumulate by looping login.
export const CHALLENGE_RATE_LIMIT = { max: 10, windowSeconds: 300, lockoutSeconds: 60 }

// Explicit "resend code" clicks from the 2FA page (the UI adds its own 60s
// cooldown between sends).
export const RESEND_RATE_LIMIT = { max: 10, windowSeconds: 300, lockoutSeconds: 60 }

// Password-recovery email requests (per email and per IP) — on top of
// Supabase's own sending limits, so one address can't be spammed and one IP
// can't sweep many addresses.
export const RECOVERY_RATE_LIMIT = { max: 10, windowSeconds: 300, lockoutSeconds: 60 }
