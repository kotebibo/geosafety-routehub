import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '../../../../app/api/admin/users/route'

// Mock auth middleware
const mockRequireAdmin = vi.fn()
vi.mock('@/middleware/auth', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// Mock Supabase server client
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'new-user-id' } },
          error: null,
        }),
      },
    },
  })),
}))

function createRequest(method: string, body?: any, url?: string): NextRequest {
  const opts: any = { method }
  if (body) {
    opts.body = JSON.stringify(body)
    opts.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(url || 'http://localhost:3000/api/admin/users', opts)
}

describe('Admin Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(undefined)
  })

  // ─── Auth Tests (shared across methods) ───

  describe('Authentication & Authorization', () => {
    it('GET should return 401 when not authenticated', async () => {
      const error = new Error('Authentication required')
      error.name = 'UnauthorizedError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('GET should return 403 when not admin', async () => {
      const error = new Error('Admin access required')
      error.name = 'ForbiddenError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('POST should return 401 when not authenticated', async () => {
      const error = new Error('Authentication required')
      error.name = 'UnauthorizedError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await POST(
        createRequest('POST', {
          email: 'test@test.com',
          password: '123456',
          full_name: 'Test',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('PUT should return 403 when not admin', async () => {
      const error = new Error('Admin access required')
      error.name = 'ForbiddenError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await PUT(
        createRequest('PUT', {
          userId: '550e8400-e29b-41d4-a716-446655440000',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })
  })

  // ─── GET ───

  describe('GET /api/admin/users', () => {
    it('should return users with roles merged', async () => {
      const users = [
        { id: 'user-1', email: 'a@test.com', created_at: '2024-01-01' },
        { id: 'user-2', email: 'b@test.com', created_at: '2024-01-02' },
      ]
      const roles = [{ user_id: 'user-1', role: 'admin' }]

      const callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: users, error: null }),
            }),
          }
        }
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockResolvedValue({ data: roles, error: null }),
          }
        }
      })

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].role).toEqual({ user_id: 'user-1', role: 'admin' })
      expect(data[1].role).toBeNull()
    })

    it('should return 500 when users query fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
            }),
          }
        }
      })

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should return 500 when roles query fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }
        }
      })

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle empty users list', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
      })

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  // ─── POST ───

  describe('POST /api/admin/users', () => {
    it('should return 400 for invalid email', async () => {
      const response = await POST(
        createRequest('POST', {
          email: 'not-an-email',
          password: '123456',
          full_name: 'Test User',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should return 400 when password is too short', async () => {
      const response = await POST(
        createRequest('POST', {
          email: 'test@example.com',
          password: '123',
          full_name: 'Test User',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should return 400 when full_name is missing', async () => {
      const response = await POST(
        createRequest('POST', {
          email: 'test@example.com',
          password: '123456',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should create user successfully with required fields', async () => {
      // Need to re-mock createServiceClient for this specific test
      const { createServiceClient } = await import('@/lib/supabase/server')
      const mockServiceClient = vi.mocked(createServiceClient)
      mockServiceClient.mockReturnValue({
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'new-user-123' } },
              error: null,
            }),
          },
        },
      } as any)

      const response = await POST(
        createRequest('POST', {
          email: 'newuser@example.com',
          password: 'securepass123',
          full_name: 'New User',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.userId).toBe('new-user-123')
    })

    it('should create user with optional role', async () => {
      const { createServiceClient } = await import('@/lib/supabase/server')
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.mocked(createServiceClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          upsert: mockUpsert,
        }),
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'new-user-456' } },
              error: null,
            }),
          },
        },
      } as any)

      const response = await POST(
        createRequest('POST', {
          email: 'admin@example.com',
          password: 'securepass123',
          full_name: 'Admin User',
          role: 'admin',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
    })

    it('should return 409 when email already exists', async () => {
      const { createServiceClient } = await import('@/lib/supabase/server')
      vi.mocked(createServiceClient).mockReturnValue({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'User has already been registered' },
            }),
          },
        },
      } as any)

      const response = await POST(
        createRequest('POST', {
          email: 'existing@example.com',
          password: 'securepass123',
          full_name: 'Existing User',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('User with this email already exists')
    })

    it('should return 500 on unexpected auth error', async () => {
      const { createServiceClient } = await import('@/lib/supabase/server')
      vi.mocked(createServiceClient).mockReturnValue({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'Some unexpected error' },
            }),
          },
        },
      } as any)

      const response = await POST(
        createRequest('POST', {
          email: 'test@example.com',
          password: 'securepass123',
          full_name: 'Test User',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  // ─── PUT ───

  describe('PUT /api/admin/users', () => {
    it('should return 400 when userId is not a valid UUID', async () => {
      const response = await PUT(
        createRequest('PUT', {
          userId: 'invalid-id',
          full_name: 'Updated Name',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should return 400 when userId is missing', async () => {
      const response = await PUT(
        createRequest('PUT', {
          full_name: 'Updated Name',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should update user successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000'
      const updatedUser = { id: userId, full_name: 'Updated Name', is_active: true }

      mockFrom.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedUser, error: null }),
            }),
          }),
        }),
      }))

      const response = await PUT(
        createRequest('PUT', {
          userId,
          full_name: 'Updated Name',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.full_name).toBe('Updated Name')
    })

    it('should update is_active field', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000'
      const updatedUser = { id: userId, is_active: false }

      mockFrom.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedUser, error: null }),
            }),
          }),
        }),
      }))

      const response = await PUT(
        createRequest('PUT', {
          userId,
          is_active: false,
        })
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.is_active).toBe(false)
    })

    it('should return 500 when update query fails', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000'

      mockFrom.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
            }),
          }),
        }),
      }))

      const response = await PUT(
        createRequest('PUT', {
          userId,
          full_name: 'Test',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
