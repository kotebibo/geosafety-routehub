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

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { GET, PUT, DELETE } from '../../../../app/api/announcements/[id]/route'

const params = { id: 'ann-123' }

function createRequest(method: string, body?: any): NextRequest {
  return new NextRequest('http://localhost/api/announcements/ann-123', {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

describe('GET /api/announcements/[id]', () => {
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

  it('should return announcement by id', async () => {
    const mockAnnouncement = { id: 'ann-123', title: 'Test', content: 'Content' }
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockAnnouncement, error: null }),
        }),
      }),
    })

    const request = createRequest('GET')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('ann-123')
  })

  it('should return 404 when announcement not found', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'not found' },
          }),
        }),
      }),
    })

    const request = createRequest('GET')
    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not found')
  })

  it('should return 500 on database error', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'OTHER', message: 'db error' },
          }),
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

describe('PUT /api/announcements/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createRequest('PUT', { title: 'Updated' })
    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 403 when not admin', async () => {
    const authError = new Error('Admin access required')
    authError.name = 'ForbiddenError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createRequest('PUT', { title: 'Updated' })
    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Admin access required')
  })

  it('should return 400 on validation failure', async () => {
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })

    const request = createRequest('PUT', { priority: 'invalid-priority' })
    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should update announcement successfully', async () => {
    const updatedAnnouncement = { id: 'ann-123', title: 'Updated Title', content: 'Content' }
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedAnnouncement, error: null }),
          }),
        }),
      }),
    })

    const request = createRequest('PUT', { title: 'Updated Title' })
    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.title).toBe('Updated Title')
  })

  it('should return 404 when updating non-existent announcement', async () => {
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'not found' },
            }),
          }),
        }),
      }),
    })

    const request = createRequest('PUT', { title: 'Updated' })
    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not found')
  })
})

describe('DELETE /api/announcements/[id]', () => {
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

  it('should delete announcement successfully', async () => {
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    const request = createRequest('DELETE')
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 500 on database delete error', async () => {
    mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } })
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
      }),
    })

    const request = createRequest('DELETE')
    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
