import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockGenerateLink = vi.fn()
const mockCheckAuthRateLimit = vi.fn()
const mockLogAuthEvent = vi.fn()
const mockMaybeSingle = vi.fn()
const mockSendPasswordRecoveryEmail = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
      })),
    })),
    auth: { admin: { generateLink: mockGenerateLink } },
  }),
}))

vi.mock('@/lib/auth/auditLog', () => ({
  logAuthEvent: (...args: any[]) => mockLogAuthEvent(...args),
}))

vi.mock('@/lib/email', () => ({
  sendPasswordRecoveryEmail: (...args: any[]) => mockSendPasswordRecoveryEmail(...args),
}))

vi.mock('@/lib/auth/rateLimit', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/auth/rateLimit')>()
  return {
    ...actual,
    checkAuthRateLimit: (...args: any[]) => mockCheckAuthRateLimit(...args),
  }
})

import { POST } from '../../../../app/api/auth/recovery/request/route'

// --- Helpers ---

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/recovery/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// --- Tests ---

describe('POST /api/auth/recovery/request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckAuthRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
    mockGenerateLink.mockResolvedValue({
      data: { properties: { email_otp: '123456' } },
      error: null,
    })
    mockSendPasswordRecoveryEmail.mockResolvedValue(true)
    mockMaybeSingle.mockResolvedValue({ data: { id: 'user-1' }, error: null })
  })

  it('generates a recovery code, emails it, and logs the audit event', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(mockGenerateLink).toHaveBeenCalledWith({ type: 'recovery', email: 'user@example.com' })
    expect(mockSendPasswordRecoveryEmail).toHaveBeenCalledWith('user@example.com', '123456')
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'password_reset_requested', userId: 'user-1' })
    )
  })

  it('returns identical success for unknown accounts without sending anything (no enumeration)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const res = await POST(makeRequest({ email: 'nobody@example.com' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(mockGenerateLink).not.toHaveBeenCalled()
    expect(mockSendPasswordRecoveryEmail).not.toHaveBeenCalled()
    expect(mockLogAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'password_reset_requested', userId: null })
    )
  })

  it('still succeeds when code generation fails (no enumeration oracle)', async () => {
    mockGenerateLink.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    expect(mockSendPasswordRecoveryEmail).not.toHaveBeenCalled()
  })

  it('still succeeds when the email send fails (no enumeration oracle)', async () => {
    mockSendPasswordRecoveryEmail.mockResolvedValue(false)

    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
  })

  it('returns 429 with retryAfterSeconds when rate limited', async () => {
    mockCheckAuthRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 540 })

    const res = await POST(makeRequest({ email: 'user@example.com' }))
    const data = await res.json()

    expect(res.status).toBe(429)
    expect(data.retryAfterSeconds).toBe(540)
    expect(mockGenerateLink).not.toHaveBeenCalled()
  })

  it('returns 400 on an invalid email', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(mockGenerateLink).not.toHaveBeenCalled()
  })
})
