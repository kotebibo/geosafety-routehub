import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'

const mockCookieGet = vi.fn()
const mockCookieDelete = vi.fn()
vi.mock('next/headers', () => ({
  cookies: () => ({ get: mockCookieGet, delete: mockCookieDelete }),
}))

const mockCheckIp = vi.fn(() => '203.0.113.1')
vi.mock('@/lib/auth/rateLimit', () => ({
  getClientIp: () => mockCheckIp(),
  ipOrNull: (ip: string) => (ip === 'unknown' ? null : ip),
}))

const mockVerifyByCookie = vi.fn()
const mockVerifyByLink = vi.fn()
vi.mock('@/lib/auth/twoFactor', () => ({
  verifyLoginChallengeByCookie: (...args: any[]) => mockVerifyByCookie(...args),
  verifyLoginChallengeByLinkToken: (...args: any[]) => mockVerifyByLink(...args),
}))

const mockLogAuthEvent = vi.fn()
vi.mock('@/lib/auth/auditLog', () => ({
  logAuthEvent: (...args: any[]) => mockLogAuthEvent(...args),
}))

const mockUsersMaybeSingle = vi.fn()
const mockUsersUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockGenerateLink = vi.fn()
const mockVerifyOtp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => mockUsersMaybeSingle() }) }),
      update: () => ({ eq: (...args: any[]) => mockUsersUpdateEq(...args) }),
    }),
    auth: { admin: { generateLink: (...args: any[]) => mockGenerateLink(...args) } },
  }),
  createServerClient: () => ({
    auth: { verifyOtp: (...args: any[]) => mockVerifyOtp(...args) },
  }),
}))

import { POST } from '../../../../app/api/auth/2fa/verify/route'

function makeRequest(body: any) {
  return new NextRequest('http://localhost:3000/api/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/auth/2fa/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieGet.mockReturnValue({ value: 'pending-cookie' })
    mockUsersMaybeSingle.mockResolvedValue({ data: { email: 'a@example.com' } })
    mockGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: 'server-side-only-token' } },
      error: null,
    })
    mockVerifyOtp.mockResolvedValue({ error: null })
  })

  it('returns 400 when neither code nor linkToken is provided', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 401 with a generic message when the code is wrong, without leaking the reason', async () => {
    mockVerifyByCookie.mockResolvedValue({ ok: false, reason: 'invalid_code' })

    const res = await POST(makeRequest({ code: '000000' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Invalid or expired code')
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: '2fa_verify_failed' })
    )
  })

  it('returns 401 without a pending cookie even if a code is supplied', async () => {
    mockCookieGet.mockReturnValue(undefined)

    const res = await POST(makeRequest({ code: '123456' }))
    expect(res.status).toBe(401)
    expect(mockVerifyByCookie).not.toHaveBeenCalled()
  })

  it('finalizes the real session via generateLink + verifyOtp on a correct code, and clears the pending cookie', async () => {
    mockVerifyByCookie.mockResolvedValue({ ok: true, userId: USER_ID })

    const res = await POST(makeRequest({ code: '123456' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(mockGenerateLink).toHaveBeenCalledWith({ type: 'magiclink', email: 'a@example.com' })
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: 'magiclink',
      token_hash: 'server-side-only-token',
    })
    expect(mockCookieDelete).toHaveBeenCalledWith('pending_2fa')
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: '2fa_verify_success' })
    )
  })

  it('verifies via the link token path without requiring the pending cookie', async () => {
    mockCookieGet.mockReturnValue(undefined)
    mockVerifyByLink.mockResolvedValue({ ok: true, userId: USER_ID })

    const res = await POST(makeRequest({ linkToken: 'the-link-token' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(mockVerifyByLink).toHaveBeenCalledWith('the-link-token')
  })

  it('never echoes generateLink properties back in the response body', async () => {
    mockVerifyByCookie.mockResolvedValue({ ok: true, userId: USER_ID })

    const res = await POST(makeRequest({ code: '123456' }))
    const text = await res.text()

    expect(text).not.toContain('server-side-only-token')
  })
})
