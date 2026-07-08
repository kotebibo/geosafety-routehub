import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth middleware
const mockRequireAuth = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))

// Mock email
const mockSendEmail = vi.fn()

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}))

// Mock email templates
const mockGenerateNotificationEmail = vi.fn()

vi.mock('@/lib/email-templates', () => ({
  generateNotificationEmail: (...args: any[]) => mockGenerateNotificationEmail(...args),
}))

// Mock Supabase createClient
const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

import { POST } from '../../../../app/api/notifications/send-email/route'

function createRequest(body: any, headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/notifications/send-email', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

describe('POST /api/notifications/send-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_KEY', 'test-service-key')
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret')
  })

  it('should return 401 when not authenticated and no internal secret', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(authError)

    const request = createRequest({
      user_id: 'user-1',
      type: 'test',
      title: 'Test',
    })

    const res = await POST(request)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Authentication required')
  })

  it('should bypass auth when internal secret header is provided', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { email: 'user@test.com', full_name: 'Test User' },
            error: null,
          }),
        }),
      }),
    })

    mockGenerateNotificationEmail.mockReturnValue({
      subject: 'Notification',
      text: 'text',
      html: '<p>html</p>',
    })
    mockSendEmail.mockResolvedValue({ id: 'email-1' })

    const request = createRequest(
      {
        user_id: 'user-1',
        type: 'test',
        title: 'Test Notification',
        message: 'Test message',
      },
      { 'x-internal-secret': 'test-internal-secret' }
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockRequireAuth).not.toHaveBeenCalled()
    expect(data.email).toBe('user@test.com')
  })

  it('should return 400 when required fields are missing', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = createRequest({ user_id: 'user-1' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('should return 400 when user_id is missing', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = createRequest({ type: 'test', title: 'Test' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('should return 400 when title is missing', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = createRequest({ user_id: 'user-1', type: 'test' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('should return 404 when user email not found', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const request = createRequest({
      user_id: 'nonexistent-user',
      type: 'test',
      title: 'Test',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User email not found')
  })

  it('should return 404 when user exists but has no email', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { email: null, full_name: 'No Email User' },
            error: null,
          }),
        }),
      }),
    })

    const request = createRequest({
      user_id: 'user-no-email',
      type: 'test',
      title: 'Test',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User email not found')
  })

  it('should send email successfully with authenticated user', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'sender-1' } })
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { email: 'recipient@test.com', full_name: 'Recipient' },
            error: null,
          }),
        }),
      }),
    })

    mockGenerateNotificationEmail.mockReturnValue({
      subject: 'New Notification',
      text: 'You have a notification',
      html: '<p>You have a notification</p>',
    })
    mockSendEmail.mockResolvedValue({ id: 'email-123' })

    const request = createRequest({
      user_id: 'recipient-1',
      type: 'comment',
      title: 'New Comment',
      message: 'Someone commented on your item',
      data: { item_id: 'item-1' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.email).toBe('recipient@test.com')
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@test.com',
        subject: 'New Notification',
      })
    )
    expect(mockGenerateNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'comment',
        title: 'New Comment',
        message: 'Someone commented on your item',
        data: { item_id: 'item-1' },
      })
    )
  })

  it('should return 500 when sendEmail throws', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { email: 'user@test.com', full_name: 'User' },
            error: null,
          }),
        }),
      }),
    })

    mockGenerateNotificationEmail.mockReturnValue({
      subject: 'Test',
      text: 'text',
      html: '<p>html</p>',
    })
    mockSendEmail.mockRejectedValue(new Error('SMTP error'))

    const request = createRequest({
      user_id: 'user-1',
      type: 'test',
      title: 'Test',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to send email')
  })

  it('should accept CRON_SECRET as fallback for internal secret', async () => {
    delete process.env.INTERNAL_API_SECRET
    vi.stubEnv('CRON_SECRET', 'cron-secret-value')

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { email: 'user@test.com', full_name: 'User' },
            error: null,
          }),
        }),
      }),
    })

    mockGenerateNotificationEmail.mockReturnValue({
      subject: 'Test',
      text: 'text',
      html: '<p>html</p>',
    })
    mockSendEmail.mockResolvedValue({ id: 'email-1' })

    const request = createRequest(
      {
        user_id: 'user-1',
        type: 'test',
        title: 'Test',
      },
      { 'x-internal-secret': 'cron-secret-value' }
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockRequireAuth).not.toHaveBeenCalled()
  })
})
