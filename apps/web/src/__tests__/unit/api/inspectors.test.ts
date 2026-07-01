import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '../../../../app/api/inspectors/route'

// Mock auth middleware
const mockRequireAuth = vi.fn()
const mockRequireAdmin = vi.fn()
vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// Mock validation schemas
vi.mock('@/lib/validations', () => ({
  createInspectorSchema: {
    parse: vi.fn((data: any) => {
      // Minimal validation to simulate Zod behavior
      if (!data.name || data.name.length < 2) {
        const error = new Error('Validation failed')
        error.name = 'ZodError'
        ;(error as any).errors = [{ message: 'Name must be at least 2 characters' }]
        throw error
      }
      return {
        name: data.name,
        email: data.email,
        phone: data.phone,
        is_active: data.is_active ?? true,
        vehicle_type: data.vehicle_type,
        license_plate: data.license_plate,
        notes: data.notes,
      }
    }),
  },
  updateInspectorSchema: {
    parse: vi.fn((data: any) => data),
  },
}))

// Mock Supabase client
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

function createRequest(method: string, body?: any, url?: string): NextRequest {
  const opts: any = { method }
  if (body) {
    opts.body = JSON.stringify(body)
    opts.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(url || 'http://localhost:3000/api/inspectors', opts)
}

describe('Inspectors API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(undefined)
    mockRequireAdmin.mockResolvedValue(undefined)
  })

  // ─── GET ───

  describe('GET /api/inspectors', () => {
    it('should return 401 when not authenticated', async () => {
      const error = new Error('Authentication required')
      error.name = 'UnauthorizedError'
      mockRequireAuth.mockRejectedValue(error)

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return all inspectors ordered by full_name', async () => {
      const inspectors = [
        { id: '1', full_name: 'Alice', status: 'active' },
        { id: '2', full_name: 'Bob', status: 'active' },
      ]

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: inspectors, error: null }),
        }),
      }))

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].full_name).toBe('Alice')
    })

    it('should filter by status when provided', async () => {
      const mockEq = vi
        .fn()
        .mockResolvedValue({ data: [{ id: '1', status: 'inactive' }], error: null })
      const mockOrder = vi.fn().mockReturnValue({ eq: mockEq })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      mockFrom.mockImplementation(() => ({
        select: mockSelect,
      }))

      const response = await GET(
        createRequest('GET', undefined, 'http://localhost:3000/api/inspectors?status=inactive')
      )
      await response.json()

      expect(mockEq).toHaveBeenCalledWith('status', 'inactive')
    })

    it('should not filter when status is "all"', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      mockFrom.mockImplementation(() => ({
        select: mockSelect,
      }))

      const response = await GET(
        createRequest('GET', undefined, 'http://localhost:3000/api/inspectors?status=all')
      )
      await response.json()

      // order should resolve directly, not through eq
      expect(mockOrder).toHaveBeenCalled()
    })

    it('should include cache headers', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }))

      const response = await GET(createRequest('GET'))

      expect(response.headers.get('Cache-Control')).toBe(
        'public, s-maxage=60, stale-while-revalidate=120'
      )
    })

    it('should return 500 on database error', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }))

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  // ─── POST ───

  describe('POST /api/inspectors', () => {
    it('should return 401 when not authenticated', async () => {
      const error = new Error('Authentication required')
      error.name = 'UnauthorizedError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await POST(createRequest('POST', { name: 'Test Inspector' }))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 403 when not admin', async () => {
      const error = new Error('Admin access required')
      error.name = 'ForbiddenError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await POST(createRequest('POST', { name: 'Test Inspector' }))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 400 when validation fails', async () => {
      const response = await POST(createRequest('POST', { name: '' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('should create inspector successfully', async () => {
      const createdInspector = {
        id: 'insp-1',
        full_name: 'Test Inspector',
        status: 'active',
      }

      mockFrom.mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createdInspector, error: null }),
          }),
        }),
      }))

      const response = await POST(
        createRequest('POST', {
          name: 'Test Inspector',
          email: 'test@test.com',
          is_active: true,
        })
      )
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.full_name).toBe('Test Inspector')
    })

    it('should return 409 on duplicate email', async () => {
      mockFrom.mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'unique constraint' },
            }),
          }),
        }),
      }))

      const response = await POST(
        createRequest('POST', {
          name: 'Test Inspector',
          email: 'duplicate@test.com',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(409)
    })

    it('should return 500 on unexpected DB error', async () => {
      mockFrom.mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42000', message: 'some error' },
            }),
          }),
        }),
      }))

      const response = await POST(
        createRequest('POST', {
          name: 'Test Inspector',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  // ─── PUT ───

  describe('PUT /api/inspectors', () => {
    it('should return 401 when not authenticated', async () => {
      const error = new Error('Authentication required')
      error.name = 'UnauthorizedError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await PUT(createRequest('PUT', { id: '1', name: 'Updated' }))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 403 when not admin', async () => {
      const error = new Error('Admin access required')
      error.name = 'ForbiddenError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await PUT(createRequest('PUT', { id: '1', name: 'Updated' }))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 400 when id is missing', async () => {
      const response = await PUT(createRequest('PUT', { name: 'Updated' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Inspector ID is required')
    })

    it('should update inspector successfully', async () => {
      const updatedInspector = { id: 'insp-1', full_name: 'Updated Name' }

      mockFrom.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedInspector, error: null }),
            }),
          }),
        }),
      }))

      const response = await PUT(
        createRequest('PUT', {
          id: 'insp-1',
          name: 'Updated Name',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.full_name).toBe('Updated Name')
    })

    it('should return 500 on database error', async () => {
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
          id: 'insp-1',
          name: 'Updated Name',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  // ─── DELETE ───

  describe('DELETE /api/inspectors', () => {
    it('should return 401 when not authenticated', async () => {
      const error = new Error('Authentication required')
      error.name = 'UnauthorizedError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await DELETE(
        createRequest('DELETE', undefined, 'http://localhost:3000/api/inspectors?id=1')
      )
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 403 when not admin', async () => {
      const error = new Error('Admin access required')
      error.name = 'ForbiddenError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await DELETE(
        createRequest('DELETE', undefined, 'http://localhost:3000/api/inspectors?id=1')
      )
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 400 when id is missing', async () => {
      const response = await DELETE(createRequest('DELETE'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Inspector ID is required')
    })

    it('should delete inspector successfully', async () => {
      mockFrom.mockImplementation(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }))

      const response = await DELETE(
        createRequest('DELETE', undefined, 'http://localhost:3000/api/inspectors?id=insp-1')
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 500 on database error', async () => {
      mockFrom.mockImplementation(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
        }),
      }))

      const response = await DELETE(
        createRequest('DELETE', undefined, 'http://localhost:3000/api/inspectors?id=insp-1')
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
