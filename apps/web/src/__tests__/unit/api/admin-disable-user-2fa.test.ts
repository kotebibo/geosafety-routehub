import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const ADMIN_ID = 'f1e2d3c4-b5a6-4978-8899-aabbccddeeff'
const TARGET_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'

const mockRequireAdmin = vi.fn()
vi.mock('@/middleware/auth', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/auth/rateLimit', () => ({
  getClientIp: () => '203.0.113.1',
  ipOrNull: (ip: string) => (ip === 'unknown' ? null : ip),
}))

const mockLogAuthEvent = vi.fn()
vi.mock('@/lib/auth/auditLog', () => ({
  logAuthEvent: (...args: any[]) => mockLogAuthEvent(...args),
}))

const mockRevokeTrustedDevices = vi.fn()
vi.mock('@/lib/auth/trustedDevice', () => ({
  revokeTrustedDevicesForUser: (...args: any[]) => mockRevokeTrustedDevices(...args),
}))

const mockSendEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}))

const mockSelectSingle = vi.fn()
const mockUpdateEq = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => mockSelectSingle() }) }),
      update: (patch: any) => ({ eq: (...args: any[]) => mockUpdateEq(patch, ...args) }),
    }),
  }),
}))

import { POST } from '../../../../app/api/admin/disable-user-2fa/route'

function makeRequest(body: any) {
  return new NextRequest('http://localhost:3000/api/admin/disable-user-2fa', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/admin/disable-user-2fa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: ADMIN_ID } } })
    mockSelectSingle.mockResolvedValue({ data: { email: 'target@example.com' }, error: null })
    mockUpdateEq.mockResolvedValue({ error: null })
  })

  it('returns 403 for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(Object.assign(new Error('nope'), { name: 'ForbiddenError' }))
    const res = await POST(makeRequest({ userId: TARGET_ID }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid userId', async () => {
    const res = await POST(makeRequest({ userId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the target user does not exist', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const res = await POST(makeRequest({ userId: TARGET_ID }))
    expect(res.status).toBe(404)
  })

  it('disables 2FA, logs the admin id, and emails the affected user', async () => {
    const res = await POST(makeRequest({ userId: TARGET_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
    expect(mockUpdateEq).toHaveBeenCalledWith(
      expect.objectContaining({ mfa_enabled: false }),
      'id',
      TARGET_ID
    )
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TARGET_ID,
        eventType: '2fa_disabled_by_admin',
        metadata: expect.objectContaining({ adminId: ADMIN_ID }),
      })
    )
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'target@example.com' })
    )
  })
})
