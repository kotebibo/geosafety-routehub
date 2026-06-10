import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth middleware
const mockRequireAuth = vi.fn()
const mockRequireAdmin = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// Mock Supabase
const mockFrom = vi.fn()
const mockStorageUpload = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
      })),
    },
  })),
}))

// Mock document parsing libraries
vi.mock('pizzip', () => ({
  default: vi.fn(() => ({})),
}))

vi.mock('docxtemplater', () => ({
  default: vi.fn(() => ({
    getFullText: vi.fn(() => ''),
  })),
}))

vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn(() => ({
      xlsx: { load: vi.fn() },
      eachSheet: vi.fn(),
    })),
  },
}))

vi.mock('xlsx', () => ({
  read: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
  utils: { sheet_to_json: vi.fn(() => []) },
}))

import { GET, POST } from '../../../../app/api/documents/templates/route'

/**
 * Helper to create a NextRequest with a mocked formData() method.
 * This avoids jsdom issues with File objects in FormData + NextRequest.
 */
function createPostRequestWithFormData(fields: Record<string, any>): NextRequest {
  const request = new NextRequest('http://localhost/api/documents/templates', {
    method: 'POST',
  })
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  }
  // Override formData() to return our pre-built FormData
  ;(request as any).formData = () => Promise.resolve(formData)
  return request
}

describe('GET /api/documents/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(authError)

    const request = new NextRequest('http://localhost/api/documents/templates?boardId=board-1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 400 when boardId is missing', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const request = new NextRequest('http://localhost/api/documents/templates')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('boardId is required')
  })

  it('should return templates for a board', async () => {
    const mockTemplates = [{ id: 'tpl-1', name: 'Template 1', board_id: 'board-1' }]
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
          }),
        }),
      }),
    })

    const request = new NextRequest('http://localhost/api/documents/templates?boardId=board-1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockTemplates)
  })

  it('should return empty array when no templates found', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })

    const request = new NextRequest('http://localhost/api/documents/templates?boardId=board-1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should return 500 on database error', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      }),
    })

    const request = new NextRequest('http://localhost/api/documents/templates?boardId=board-1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('POST /api/documents/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createPostRequestWithFormData({
      name: 'Test Template',
      file: new File(['content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 403 when not admin', async () => {
    const authError = new Error('Admin access required')
    authError.name = 'ForbiddenError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createPostRequestWithFormData({
      name: 'Test Template',
      file: new File(['content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Admin access required')
  })

  it('should return 400 when file is missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: 'admin-1' } },
    })

    const request = createPostRequestWithFormData({
      name: 'Test Template',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('File and name are required')
  })

  it('should return 400 when name is missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: 'admin-1' } },
    })

    const request = createPostRequestWithFormData({
      file: new File(['content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('File and name are required')
  })

  it('should return 400 for unsupported file extensions', async () => {
    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: 'admin-1' } },
    })

    const request = createPostRequestWithFormData({
      name: 'Test Template',
      file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Only .docx, .xlsx, and .xls files are supported')
  })
})
