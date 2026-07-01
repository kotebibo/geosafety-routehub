import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth middleware
const mockRequireAuth = vi.fn()
const mockRequireAdmin = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// Mock email
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(() => Promise.resolve(true)),
  generateAnnouncementEmail: vi.fn(() => ({ text: 'text', html: '<p>html</p>' })),
}))

// Mock Supabase
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

import { GET, POST } from '../../../../app/api/announcements/route'

function createRequest(body?: any): NextRequest {
  return new NextRequest('http://localhost/api/announcements', {
    method: body ? 'POST' : 'GET',
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

describe('GET /api/announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(authError)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return published announcements on success', async () => {
    const mockAnnouncements = [{ id: '1', title: 'Test', content: 'Content', priority: 'normal' }]
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockAnnouncements, error: null }),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockAnnouncements)
    expect(mockFrom).toHaveBeenCalledWith('announcements')
  })

  it('should return empty array when no announcements', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should return 500 on database error', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('POST /api/announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createRequest({ title: 'Test', content: 'Content' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 403 when not admin', async () => {
    const authError = new Error('Admin access required')
    authError.name = 'ForbiddenError'
    mockRequireAdmin.mockRejectedValue(authError)

    const request = createRequest({ title: 'Test', content: 'Content' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Admin access required')
  })

  it('should return 400 on validation failure', async () => {
    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: 'admin-1' } },
    })

    const request = createRequest({ title: '', content: '' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('should create announcement on success', async () => {
    const mockAnnouncement = {
      id: 'ann-1',
      title: 'New Announcement',
      content: 'Some content here',
      priority: 'normal',
      is_published: true,
      author_id: 'admin-1',
    }

    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: 'admin-1' } },
    })

    // Mock insert chain
    mockFrom.mockImplementation((table: string) => {
      if (table === 'announcements') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockAnnouncement, error: null }),
            }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'Admin User', email: 'admin@test.com' },
                error: null,
              }),
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    const request = createRequest({
      title: 'New Announcement',
      content: 'Some content here',
      priority: 'normal',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('ann-1')
    expect(data.title).toBe('New Announcement')
  })

  it('should return 400 when title exceeds max length', async () => {
    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: 'admin-1' } },
    })

    const request = createRequest({
      title: 'a'.repeat(201),
      content: 'Valid content',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should return 500 on database insert error', async () => {
    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: 'admin-1' } },
    })

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
        }),
      }),
    })

    const request = createRequest({
      title: 'Test',
      content: 'Content',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
