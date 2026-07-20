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
  CHALLENGE_RATE_LIMIT: { max: 5, windowSeconds: 900, lockoutSeconds: 900 },
}))

const mockCreateChallenge = vi.fn()
vi.mock('@/lib/auth/twoFactor', () => ({
  createChallenge: (...args: any[]) => mockCreateChallenge(...args),
}))

const mockLogAuthEvent = vi.fn()
vi.mock('@/lib/auth/auditLog', () => ({
  logAuthEvent: (...args: any[]) => mockLogAuthEvent(...args),
}))

const mockSendTwoFactorEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendTwoFactorEmail: (...args: any[]) => mockSendTwoFactorEmail(...args),
}))

import { POST } from '../../../../app/api/settings/2fa/enroll/start/route'

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/settings/2fa/enroll/start', { method: 'POST' })
}

describe('POST /api/settings/2fa/enroll/start', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ user: { id: USER_ID, email: 'a@example.com' } })
    mockCheckAuthRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
    mockCreateChallenge.mockResolvedValue({
      challengeId: 'e1',
      code: '111222',
      linkToken: 'lt',
      cookieToken: null,
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      Object.assign(new Error('nope'), { name: 'UnauthorizedError' })
    )
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('sends only a code (no click-through link) to the account email', async () => {
    const res = await POST(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(mockCreateChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, purpose: 'enroll' })
    )
    expect(mockSendTwoFactorEmail).toHaveBeenCalledWith('a@example.com', { code: '111222' })
  })

  it('returns 429 without issuing a challenge once the enroll rate limit trips', async () => {
    mockCheckAuthRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 })
    const res = await POST(makeRequest())

    expect(res.status).toBe(429)
    expect(mockCreateChallenge).not.toHaveBeenCalled()
  })
})
