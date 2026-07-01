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
const mockStorageRemove = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: vi.fn(() => ({
        remove: mockStorageRemove,
      })),
    },
  })),
}))

import { GET, PUT, DELETE } from '../../../../app/api/documents/templates/[id]/route'

const params = { id: 'tpl-123' }

function createRequest(method: string, body?: any): NextRequest {
  return new NextRequest('http://localhost/api/documents/templates/tpl-123', {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

describe('GET /api/documents/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(authError)

    const request = createRequest('GET')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return template by id', async () => {
    const mockTemplate = { id: 'tpl-123', name: 'Template 1', tags: ['name', 'date'] }
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
        }),
      }),
    })

    const request = createRequest('GET')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('tpl-123')
    expect(data.name).toBe('Template 1')
  })

  it('should return 500 on database error', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    })

    const request = createRequest('GET')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('PUT /api/documents/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createRequest('PUT', { name: 'Updated' })
    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 403 when not admin', async () => {
    const authError = new Error('Admin access required')
    authError.name = 'ForbiddenError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createRequest('PUT', { name: 'Updated' })
    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Admin access required')
  })

  it('should return 400 when no valid fields provided', async () => {
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })

    const request = createRequest('PUT', { invalid_field: 'value' })
    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No valid fields to update')
  })

  it('should update template with allowed fields', async () => {
    const updatedTemplate = { id: 'tpl-123', name: 'Updated Name', description: 'New desc' }
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedTemplate, error: null }),
          }),
        }),
      }),
    })

    const request = createRequest('PUT', { name: 'Updated Name', description: 'New desc' })
    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Updated Name')
  })

  it('should only pass allowed fields to update', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'tpl-123', name: 'Updated' },
            error: null,
          }),
        }),
      }),
    })
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const request = createRequest('PUT', {
      name: 'Updated',
      description: 'Desc',
      tag_mapping: { tag1: 'col1' },
      is_active: false,
      file_path: 'should-be-ignored',
      created_by: 'should-be-ignored',
    })

    await PUT(request, { params })

    expect(mockUpdate).toHaveBeenCalledWith({
      name: 'Updated',
      description: 'Desc',
      tag_mapping: { tag1: 'col1' },
      is_active: false,
    })
  })
})

describe('DELETE /api/documents/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createRequest('DELETE')
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 403 when not admin', async () => {
    const authError = new Error('Admin access required')
    authError.name = 'ForbiddenError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createRequest('DELETE')
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Admin access required')
  })

  it('should delete template and storage file successfully', async () => {
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })
    mockStorageRemove.mockResolvedValue({ error: null })

    // First call: fetch template to get file_path
    // Second call: delete record
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { file_path: 'templates/test.docx' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    })

    const request = createRequest('DELETE')
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 500 when fetch for delete fails', async () => {
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Fetch failed'),
          }),
        }),
      }),
    })

    const request = createRequest('DELETE')
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
