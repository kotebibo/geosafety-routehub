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

import { GET } from '../../../../app/api/documents/download/route'

/** Helper: create a mock Blob with working arrayBuffer() */
function createMockBlob(content: number[] = [0x50, 0x4b, 0x03, 0x04]): Blob {
  const uint8 = new Uint8Array(content)
  const blob = new Blob([uint8])
  // Ensure arrayBuffer works in jsdom
  if (!blob.arrayBuffer) {
    ;(blob as any).arrayBuffer = () => Promise.resolve(uint8.buffer)
  }
  return blob
}

describe('GET /api/documents/download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(authError)

    const request = new NextRequest('http://localhost/api/documents/download?id=doc-1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 400 when document ID is missing', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = new NextRequest('http://localhost/api/documents/download')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Document ID is required')
  })

  it('should return 404 when document not found', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'not found' },
          }),
        }),
      }),
    })

    const request = new NextRequest('http://localhost/api/documents/download?id=doc-1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Document not found')
  })

  it('should return 500 when file download from storage fails', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { file_path: 'path/to/file.docx', file_name: 'report.docx' },
            error: null,
          }),
        }),
      }),
    })
    mockStorageDownload.mockResolvedValue({ data: null, error: new Error('Storage error') })

    const request = new NextRequest('http://localhost/api/documents/download?id=doc-1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to download file')
  })

  it('should return file as binary download for .docx', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { file_path: 'path/to/file.docx', file_name: 'report.docx' },
            error: null,
          }),
        }),
      }),
    })

    mockStorageDownload.mockResolvedValue({ data: createMockBlob(), error: null })

    const request = new NextRequest('http://localhost/api/documents/download?id=doc-1')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="report.docx"')
  })

  it('should set correct content type for .xlsx files', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { file_path: 'path/to/file.xlsx', file_name: 'report.xlsx' },
            error: null,
          }),
        }),
      }),
    })

    mockStorageDownload.mockResolvedValue({ data: createMockBlob(), error: null })

    const request = new NextRequest('http://localhost/api/documents/download?id=doc-1')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  })

  it('should set correct content type for .xls files', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { file_path: 'path/to/file.xls', file_name: 'report.xls' },
            error: null,
          }),
        }),
      }),
    })

    mockStorageDownload.mockResolvedValue({ data: createMockBlob([0xd0, 0xcf]), error: null })

    const request = new NextRequest('http://localhost/api/documents/download?id=doc-1')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/vnd.ms-excel')
  })
})
