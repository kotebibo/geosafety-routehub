import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'

const mockRequireAuth = vi.fn()
vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))

vi.mock('@/lib/auth/rateLimit', () => ({
  getClientIp: () => '203.0.113.1',
  ipOrNull: (ip: string) => (ip === 'unknown' ? null : ip),
}))

const mockVerifyEnrollChallenge = vi.fn()
vi.mock('@/lib/auth/twoFactor', () => ({
  verifyEnrollChallenge: (...args: any[]) => mockVerifyEnrollChallenge(...args),
}))

const mockLogAuthEvent = vi.fn()
vi.mock('@/lib/auth/auditLog', () => ({
  logAuthEvent: (...args: any[]) => mockLogAuthEvent(...args),
}))

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: () => ({
      update: (patch: any) => ({ eq: (...args: any[]) => mockUpdateEq(patch, ...args) }),
    }),
  }),
}))

import { POST } from '../../../../app/api/settings/2fa/enroll/confirm/route'

function makeRequest(body: any) {
  return new NextRequest('http://localhost:3000/api/settings/2fa/enroll/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/settings/2fa/enroll/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ user: { id: USER_ID, email: 'a@example.com' } })
    mockUpdateEq.mockResolvedValue({ error: null })
  })

  it('returns 400 for a malformed code', async () => {
    const res = await POST(makeRequest({ code: 'abc' }))
    expect(res.status).toBe(400)
    expect(mockVerifyEnrollChallenge).not.toHaveBeenCalled()
  })

  it('returns 401 on an invalid code and does not enable 2FA', async () => {
    mockVerifyEnrollChallenge.mockResolvedValue({ ok: false, reason: 'invalid_code' })

    const res = await POST(makeRequest({ code: '000000' }))
    expect(res.status).toBe(401)
    expect(mockUpdateEq).not.toHaveBeenCalled()
  })

  it('enables mfa_enabled on a correct code', async () => {
    mockVerifyEnrollChallenge.mockResolvedValue({ ok: true, userId: USER_ID })

    const res = await POST(makeRequest({ code: '123456' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(mockUpdateEq).toHaveBeenCalledWith(
      expect.objectContaining({ mfa_enabled: true }),
      'id',
      USER_ID
    )
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: '2fa_enabled' })
    )
  })
})
