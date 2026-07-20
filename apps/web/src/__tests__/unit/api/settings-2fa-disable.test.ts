import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'

const mockRequireAuth = vi.fn()
vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))

const mockCheckAuthRateLimit = vi.fn()
vi.mock('@/lib/auth/rateLimit', () => ({
  checkAuthRateLimit: (...args: any[]) => mockCheckAuthRateLimit(...args),
  getClientIp: () => '203.0.113.1',
  ipOrNull: (ip: string) => (ip === 'unknown' ? null : ip),
  LOGIN_RATE_LIMIT: { max: 5, windowSeconds: 900, lockoutSeconds: 900 },
}))

const mockThrowawaySignIn = vi.fn()
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase/server', () => ({
  createNonPersistingClient: () => ({
    auth: { signInWithPassword: (...args: any[]) => mockThrowawaySignIn(...args) },
  }),
  createServerClient: () => ({
    from: () => ({
      update: (patch: any) => ({ eq: (...args: any[]) => mockUpdateEq(patch, ...args) }),
    }),
  }),
}))

const mockLogAuthEvent = vi.fn()
vi.mock('@/lib/auth/auditLog', () => ({
  logAuthEvent: (...args: any[]) => mockLogAuthEvent(...args),
}))

import { POST } from '../../../../app/api/settings/2fa/disable/route'

function makeRequest(body: any) {
  return new NextRequest('http://localhost:3000/api/settings/2fa/disable', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/settings/2fa/disable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ user: { id: USER_ID, email: 'a@example.com' } })
    mockCheckAuthRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
    mockUpdateEq.mockResolvedValue({ error: null })
  })

  it('returns 400 for a missing password', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    expect(mockThrowawaySignIn).not.toHaveBeenCalled()
  })

  it('returns 429 without checking the password once the disable rate limit trips', async () => {
    mockCheckAuthRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 })
    const res = await POST(makeRequest({ password: 'whatever' }))

    expect(res.status).toBe(429)
    expect(mockThrowawaySignIn).not.toHaveBeenCalled()
  })

  it('returns 401 and leaves 2FA on when the password is wrong', async () => {
    mockThrowawaySignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })

    const res = await POST(makeRequest({ password: 'wrong' }))
    expect(res.status).toBe(401)
    expect(mockUpdateEq).not.toHaveBeenCalled()
  })

  it('disables 2FA on a correct password', async () => {
    mockThrowawaySignIn.mockResolvedValue({ error: null })

    const res = await POST(makeRequest({ password: 'correct' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(mockUpdateEq).toHaveBeenCalledWith(
      expect.objectContaining({ mfa_enabled: false }),
      'id',
      USER_ID
    )
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: '2fa_disabled' })
    )
  })
})
