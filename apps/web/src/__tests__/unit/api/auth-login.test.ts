import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'

const mockCookieSet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: () => ({ set: mockCookieSet }),
}))

const mockCheckAuthRateLimit = vi.fn()
vi.mock('@/lib/auth/rateLimit', () => ({
  checkAuthRateLimit: (...args: any[]) => mockCheckAuthRateLimit(...args),
  getClientIp: () => '203.0.113.1',
  ipOrNull: (ip: string) => (ip === 'unknown' ? null : ip),
  LOGIN_RATE_LIMIT: { max: 5, windowSeconds: 900, lockoutSeconds: 900 },
  CHALLENGE_RATE_LIMIT: { max: 5, windowSeconds: 900, lockoutSeconds: 900 },
}))

const mockSignInWithPassword = vi.fn()
const mockThrowawaySignInWithPassword = vi.fn()
const mockUsersMaybeSingle = vi.fn()
const mockUsersUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

vi.mock('@/lib/supabase/server', () => ({
  createNonPersistingClient: () => ({
    auth: { signInWithPassword: (...args: any[]) => mockThrowawaySignInWithPassword(...args) },
  }),
  createServerClient: () => ({
    auth: { signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args) },
  }),
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => mockUsersMaybeSingle() }),
      }),
      update: (patch: any) => mockUsersUpdate(patch),
    }),
  }),
}))

const mockCreateChallenge = vi.fn()
vi.mock('@/lib/auth/twoFactor', () => ({
  createChallenge: (...args: any[]) => mockCreateChallenge(...args),
  CHALLENGE_TTL_SECONDS: 600,
}))

const mockLogAuthEvent = vi.fn()
vi.mock('@/lib/auth/auditLog', () => ({
  logAuthEvent: (...args: any[]) => mockLogAuthEvent(...args),
}))

const mockSendTwoFactorEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendTwoFactorEmail: (...args: any[]) => mockSendTwoFactorEmail(...args),
}))

import { POST } from '../../../../app/api/auth/login/route'

function makeRequest(body: any) {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckAuthRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
    mockUsersUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  it('returns 400 for an invalid body', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
    expect(mockThrowawaySignInWithPassword).not.toHaveBeenCalled()
  })

  it('returns 429 and never checks the password when rate-limited', async () => {
    mockCheckAuthRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 42 })

    const res = await POST(makeRequest({ email: 'a@example.com', password: 'x' }))
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.retryAfterSeconds).toBe(42)
    expect(mockThrowawaySignInWithPassword).not.toHaveBeenCalled()
  })

  it('returns 401 for invalid credentials', async () => {
    mockThrowawaySignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const res = await POST(makeRequest({ email: 'a@example.com', password: 'wrong' }))
    expect(res.status).toBe(401)
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'login_failed' })
    )
  })

  it('establishes a real session when 2FA is disabled', async () => {
    mockThrowawaySignInWithPassword.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    })
    mockUsersMaybeSingle.mockResolvedValue({ data: { mfa_enabled: false } })
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })

    const res = await POST(makeRequest({ email: 'a@example.com', password: 'correct' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: 'correct',
    })
    expect(mockCreateChallenge).not.toHaveBeenCalled()
    expect(mockCookieSet).not.toHaveBeenCalled()
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'login_success' })
    )
  })

  it('gates on 2FA without ever establishing a session', async () => {
    mockThrowawaySignInWithPassword.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    })
    mockUsersMaybeSingle.mockResolvedValue({ data: { mfa_enabled: true } })
    mockCreateChallenge.mockResolvedValue({
      challengeId: 'c1',
      code: '123456',
      linkToken: 'link-token',
      cookieToken: 'cookie-token',
    })
    mockSendTwoFactorEmail.mockResolvedValue(true)

    const res = await POST(makeRequest({ email: 'a@example.com', password: 'correct' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('mfa_required')
    expect(mockSignInWithPassword).not.toHaveBeenCalled() // never establishes the real session
    expect(mockCookieSet).toHaveBeenCalledWith(
      'pending_2fa',
      'cookie-token',
      expect.objectContaining({ httpOnly: true })
    )
    expect(mockSendTwoFactorEmail).toHaveBeenCalledWith(
      'a@example.com',
      expect.objectContaining({ code: '123456' })
    )
  })

  it('bumps the 2fa_challenge rate limit on every successful-password 2FA branch (closes the challenge-churn bypass)', async () => {
    mockThrowawaySignInWithPassword.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    })
    mockUsersMaybeSingle.mockResolvedValue({ data: { mfa_enabled: true } })
    mockCreateChallenge.mockResolvedValue({
      challengeId: 'c1',
      code: '123456',
      linkToken: 'link-token',
      cookieToken: 'cookie-token',
    })

    await POST(makeRequest({ email: 'a@example.com', password: 'correct' }))

    expect(mockCheckAuthRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ scope: '2fa_challenge', identifier: USER_ID })
    )
  })

  it('returns 429 without issuing a new challenge once the 2fa_challenge limit trips', async () => {
    mockThrowawaySignInWithPassword.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    })
    mockUsersMaybeSingle.mockResolvedValue({ data: { mfa_enabled: true } })
    mockCheckAuthRateLimit.mockImplementation(async ({ scope }: { scope: string }) =>
      scope === '2fa_challenge'
        ? { allowed: false, retryAfterSeconds: 300 }
        : { allowed: true, retryAfterSeconds: 0 }
    )

    const res = await POST(makeRequest({ email: 'a@example.com', password: 'correct' }))

    expect(res.status).toBe(429)
    expect(mockCreateChallenge).not.toHaveBeenCalled()
    expect(mockSendTwoFactorEmail).not.toHaveBeenCalled()
  })
})
