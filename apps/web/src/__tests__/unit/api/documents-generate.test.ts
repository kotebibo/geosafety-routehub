import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth middleware
const mockRequireAuth = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))

// Mock Supabase
const mockFrom = vi.fn()
const mockStorageDownload = vi.fn()
const mockStorageUpload = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: vi.fn(() => ({
        download: mockStorageDownload,
        upload: mockStorageUpload,
      })),
    },
  })),
}))

// Mock document libraries
vi.mock('pizzip', () => ({
  default: vi.fn(() => ({
    generate: vi.fn(() => Buffer.from('generated')),
  })),
}))

vi.mock('docxtemplater', () => ({
  default: vi.fn(() => ({
    render: vi.fn(),
    getZip: vi.fn(() => ({
      generate: vi.fn(() => Buffer.from('generated-docx')),
    })),
  })),
}))

vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn(() => Promise.resolve({ value: '<p>Preview</p>' })),
  },
}))

vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn(() => ({
      xlsx: {
        load: vi.fn(),
        writeBuffer: vi.fn(() => Promise.resolve(Buffer.from('xlsx'))),
      },
      eachSheet: vi.fn(),
    })),
  },
}))

import { POST } from '../../../../app/api/documents/generate/route'

// Valid RFC 4122 UUID (version 4, variant 1)
const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const validUUID2 = 'b1ffcd00-1d1c-4f09-ab7e-7cc0ce491b22'
const validUUID3 = 'c2aade11-2e2d-4a1a-bc8f-8dd1df5a2c33'

function createRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/documents/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/documents/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(authError)

    const request = createRequest({
      templateId: validUUID,
      itemId: validUUID2,
      boardId: validUUID3,
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 400 on validation failure - missing fields', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = createRequest({ templateId: 'not-a-uuid' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('should return 400 on validation failure - invalid uuid', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = createRequest({
      templateId: 'invalid',
      itemId: 'invalid',
      boardId: 'invalid',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should return 404 when template not found', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    })

    const request = createRequest({
      templateId: validUUID,
      itemId: validUUID2,
      boardId: validUUID3,
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Template not found')
  })

  it('should return 404 when board item not found', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Template found
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: validUUID,
                  name: 'Template',
                  file_path: 'path/file.docx',
                  file_name: 'file.docx',
                  tag_mapping: {},
                },
                error: null,
              }),
            }),
          }),
        }
      }
      // Item not found
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }
    })

    const request = createRequest({
      templateId: validUUID,
      itemId: validUUID2,
      boardId: validUUID3,
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Board item not found')
  })

  it('should return 500 when template file download fails', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Template
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: validUUID,
                  name: 'Template',
                  file_path: 'path/file.docx',
                  file_name: 'file.docx',
                  tag_mapping: {},
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (callCount === 2) {
        // Board item
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: validUUID2, name: 'Item 1', data: {} },
                error: null,
              }),
            }),
          }),
        }
      }
      // Columns
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    })

    mockStorageDownload.mockResolvedValue({ data: null, error: new Error('Download failed') })

    const request = createRequest({
      templateId: validUUID,
      itemId: validUUID2,
      boardId: validUUID3,
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to download template file')
  })
})
