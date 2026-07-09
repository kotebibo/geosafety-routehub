import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../../../../app/api/admin/assign-role/route'

// Mock auth middleware
const mockRequireAdmin = vi.fn()
vi.mock('@/middleware/auth', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// Mock Supabase client
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

function createRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/assign-role', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Admin Assign Role API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(undefined)
  })

  it('should return 401 when user is not authenticated', async () => {
    const error = new Error('Authentication required')
    error.name = 'UnauthorizedError'
    mockRequireAdmin.mockRejectedValue(error)

    const request = createRequest({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      roleName: 'admin',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 403 when user is not an admin', async () => {
    const error = new Error('Admin access required')
    error.name = 'ForbiddenError'
    mockRequireAdmin.mockRejectedValue(error)

    const request = createRequest({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      roleName: 'admin',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Admin access required')
  })

  it('should return 400 when userId is not a valid UUID', async () => {
    const request = createRequest({ userId: 'not-a-uuid', roleName: 'admin' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should return 400 when roleName is empty', async () => {
    const request = createRequest({ userId: '550e8400-e29b-41d4-a716-446655440000', roleName: '' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should return 400 when required fields are missing', async () => {
    const request = createRequest({})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should update existing role when user already has one', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000'
    const existingRole = { id: 'role-1' }
    const updatedRole = { id: 'role-1', user_id: userId, role: 'dispatcher' }

    // First call: select existing role
    mockFrom.mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingRole, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedRole, error: null }),
            }),
          }),
        }),
      }
    })

    const request = createRequest({ userId, roleName: 'dispatcher' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.role).toBe('dispatcher')
    expect(mockFrom).toHaveBeenCalledWith('user_roles')
  })

  it('should insert new role when user has no existing role', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000'
    const newRole = { id: 'role-2', user_id: userId, role: 'admin' }

    mockFrom.mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newRole, error: null }),
          }),
        }),
      }
    })

    const request = createRequest({ userId, roleName: 'admin' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.role).toBe('admin')
    expect(data.user_id).toBe(userId)
  })

  it('should return 500 when update query fails', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000'

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'role-1' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      }),
    }))

    const request = createRequest({ userId, roleName: 'admin' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should return 500 when insert query fails', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000'

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    }))

    const request = createRequest({ userId, roleName: 'admin' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
