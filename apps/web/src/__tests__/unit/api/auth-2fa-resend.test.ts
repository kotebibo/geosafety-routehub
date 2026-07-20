import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'

const mockCookieGet = vi.fn()
const mockCookieSet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: () => ({ get: mockCookieGet, set: mockCookieSet }),
}))

const mockCheckAuthRateLimit = vi.fn()
vi.mock('@/lib/auth/rateLimit', () => ({
  checkAuthRateLimit: (...args: any[]) => mockCheckAuthRateLimit(...args),
  getClientIp: () => '203.0.113.1',
  ipOrNull: (ip: string) => (ip === 'unknown' ? null : ip),
  RESEND_RATE_LIMIT: { max: 3, windowSeconds: 900, lockoutSeconds: 900 },
}))

const mockFindUserId = vi.fn()
const mockCreateChallenge = vi.fn()
vi.mock('@/lib/auth/twoFactor', () => ({
  findUserIdForPendingLoginCookie: (...args: any[]) => mockFindUserId(...args),
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

const mockUsersMaybeSingle = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => mockUsersMaybeSingle() }) }) }),
  }),
}))

import { POST } from '../../../../app/api/auth/2fa/resend/route'

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/auth/2fa/resend', { method: 'POST' })
}

describe('POST /api/auth/2fa/resend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieGet.mockReturnValue({ value: 'pending-cookie' })
    mockCheckAuthRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
    mockFindUserId.mockResolvedValue(USER_ID)
    mockUsersMaybeSingle.mockResolvedValue({ data: { email: 'a@example.com' } })
    mockCreateChallenge.mockResolvedValue({
      challengeId: 'c2',
      code: '654321',
      linkToken: 'link-2',
      cookieToken: 'new-cookie-token',
    })
  })

  it('returns 401 with no pending cookie', async () => {
    mockCookieGet.mockReturnValue(undefined)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    expect(mockCreateChallenge).not.toHaveBeenCalled()
  })

  it('returns 401 when the cookie does not resolve to a user', async () => {
    mockFindUserId.mockResolvedValue(null)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 429 and issues no new code once the resend limit trips', async () => {
    mockCheckAuthRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 120 })
    const res = await POST(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.retryAfterSeconds).toBe(120)
    expect(mockCreateChallenge).not.toHaveBeenCalled()
  })

  it('issues a fresh challenge, re-emails it, and rotates the pending cookie', async () => {
    const res = await POST(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(mockCreateChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, purpose: 'login' })
    )
    expect(mockSendTwoFactorEmail).toHaveBeenCalledWith(
      'a@example.com',
      expect.objectContaining({ code: '654321' })
    )
    expect(mockCookieSet).toHaveBeenCalledWith(
      'pending_2fa',
      'new-cookie-token',
      expect.objectContaining({ httpOnly: true })
    )
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: '2fa_resend' })
    )
  })
})
