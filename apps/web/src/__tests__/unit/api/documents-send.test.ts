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

// Mock Supabase
const mockFrom = vi.fn()
const mockStorageDownload = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: vi.fn(() => ({
        download: mockStorageDownload,
      })),
    },
  })),
}))

import { POST } from '../../../../app/api/documents/send/route'

// Valid RFC 4122 UUID (version 4, variant 1)
const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function createRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/documents/send', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Helper: create a mock Blob with working arrayBuffer() */
function createMockBlob(content: number[] = [0x50, 0x4b]): Blob {
  const uint8 = new Uint8Array(content)
  const blob = new Blob([uint8])
  // Ensure arrayBuffer works in jsdom
  if (!blob.arrayBuffer) {
    ;(blob as any).arrayBuffer = () => Promise.resolve(uint8.buffer)
  }
  return blob
}

describe('POST /api/documents/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set env var for RESEND
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(authError)

    const request = createRequest({
      documentId: validUUID,
      to: ['test@example.com'],
      subject: 'Test',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 400 on validation failure - missing required fields', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = createRequest({})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should return 400 on validation failure - invalid email', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = createRequest({
      documentId: validUUID,
      to: ['not-an-email'],
      subject: 'Test',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should return 400 on validation failure - empty to array', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = createRequest({
      documentId: validUUID,
      to: [],
      subject: 'Test',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should return 400 on validation failure - invalid documentId', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = createRequest({
      documentId: 'not-a-uuid',
      to: ['test@example.com'],
      subject: 'Test',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should return 404 when document not found', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    })

    const request = createRequest({
      documentId: validUUID,
      to: ['test@example.com'],
      subject: 'Test Subject',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Document not found')
  })

  it('should return 500 when file download fails', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: validUUID,
              file_path: 'path/to/file.docx',
              file_name: 'report.docx',
            },
            error: null,
          }),
        }),
      }),
    })
    mockStorageDownload.mockResolvedValue({ data: null, error: new Error('Storage error') })

    const request = createRequest({
      documentId: validUUID,
      to: ['test@example.com'],
      subject: 'Test Subject',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to download document')
  })

  it('should return 503 when RESEND_API_KEY is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    delete process.env.RESEND_API_KEY

    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: validUUID,
              file_path: 'path/to/file.docx',
              file_name: 'report.docx',
            },
            error: null,
          }),
        }),
      }),
    })

    mockStorageDownload.mockResolvedValue({ data: createMockBlob(), error: null })

    const request = createRequest({
      documentId: validUUID,
      to: ['test@example.com'],
      subject: 'Test Subject',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.error).toBe('Email not configured (RESEND_API_KEY missing)')
  })

  it('should return 500 when sendEmail fails', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: validUUID,
              file_path: 'path/to/file.docx',
              file_name: 'report.docx',
            },
            error: null,
          }),
        }),
      }),
    })

    mockStorageDownload.mockResolvedValue({ data: createMockBlob(), error: null })
    mockSendEmail.mockResolvedValue(null) // sendEmail returns falsy

    const request = createRequest({
      documentId: validUUID,
      to: ['test@example.com'],
      subject: 'Test Subject',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to send email')
  })

  it('should send email and update document record on success', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Fetch document
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: validUUID,
                  file_path: 'path/to/file.docx',
                  file_name: 'report.docx',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      // Update document
      return { update: mockUpdate }
    })

    mockStorageDownload.mockResolvedValue({ data: createMockBlob(), error: null })
    mockSendEmail.mockResolvedValue({ id: 'email-123' })

    const request = createRequest({
      documentId: validUUID,
      to: ['test@example.com'],
      subject: 'Test Subject',
      message: 'Hello',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['test@example.com'],
        subject: 'Test Subject',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: 'report.docx',
          }),
        ]),
      })
    )
  })
})
