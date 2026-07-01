import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '../../../../app/api/service-types/route'

// Mock auth middleware
const mockRequireAdmin = vi.fn()
vi.mock('@/middleware/auth', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// Mock validation schemas
vi.mock('@/lib/validations/service-type.schema', () => ({
  createServiceTypeSchema: {
    parse: vi.fn((data: any) => {
      if (!data.name || !data.name_ka) {
        const error = new Error('Validation failed')
        error.name = 'ZodError'
        ;(error as any).errors = [{ message: 'Name is required' }]
        throw error
      }
      return data
    }),
  },
  updateServiceTypeSchema: {
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
  return new NextRequest(url || 'http://localhost:3000/api/service-types', opts)
}

describe('Service Types API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(undefined)
  })

  // ─── GET ───

  describe('GET /api/service-types', () => {
    it('should return service types (no auth required)', async () => {
      const serviceTypes = [
        { id: '1', name: 'Type A', name_ka: 'ტიპი A' },
        { id: '2', name: 'Type B', name_ka: 'ტიპი B' },
      ]

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: serviceTypes, error: null }),
        }),
      }))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe('Type A')
    })

    it('should include cache headers', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }))

      const response = await GET()

      expect(response.headers.get('Cache-Control')).toBe(
        'public, s-maxage=300, stale-while-revalidate=600'
      )
    })

    it('should return 500 on database error', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should return empty array when no service types exist', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  // ─── POST ───

  describe('POST /api/service-types', () => {
    it('should return 401 when not authenticated', async () => {
      const error = new Error('Authentication required')
      error.name = 'UnauthorizedError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await POST(createRequest('POST', { name: 'Test', name_ka: 'ტესტი' }))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 403 when not admin', async () => {
      const error = new Error('Admin access required')
      error.name = 'ForbiddenError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await POST(createRequest('POST', { name: 'Test', name_ka: 'ტესტი' }))
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

    it('should create service type successfully', async () => {
      const created = { id: 'st-1', name: 'Inspection', name_ka: 'ინსპექცია' }

      mockFrom.mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: created, error: null }),
          }),
        }),
      }))

      const response = await POST(
        createRequest('POST', {
          name: 'Inspection',
          name_ka: 'ინსპექცია',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Inspection')
    })

    it('should return 500 on database error', async () => {
      mockFrom.mockImplementation(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      }))

      const response = await POST(
        createRequest('POST', {
          name: 'Inspection',
          name_ka: 'ინსპექცია',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  // ─── PUT ───

  describe('PUT /api/service-types', () => {
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
      expect(data.error).toBe('ID is required')
    })

    it('should update service type successfully', async () => {
      const updated = { id: 'st-1', name: 'Updated Type', name_ka: 'განახლებული' }

      mockFrom.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updated, error: null }),
            }),
          }),
        }),
      }))

      const response = await PUT(
        createRequest('PUT', {
          id: 'st-1',
          name: 'Updated Type',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Type')
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
          id: 'st-1',
          name: 'Updated',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  // ─── DELETE ───

  describe('DELETE /api/service-types', () => {
    it('should return 401 when not authenticated', async () => {
      const error = new Error('Authentication required')
      error.name = 'UnauthorizedError'
      mockRequireAdmin.mockRejectedValue(error)

      const response = await DELETE(
        createRequest('DELETE', undefined, 'http://localhost:3000/api/service-types?id=1')
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
        createRequest('DELETE', undefined, 'http://localhost:3000/api/service-types?id=1')
      )
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 400 when id is missing', async () => {
      const response = await DELETE(createRequest('DELETE'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ID is required')
    })

    it('should delete service type successfully', async () => {
      mockFrom.mockImplementation(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }))

      const response = await DELETE(
        createRequest('DELETE', undefined, 'http://localhost:3000/api/service-types?id=st-1')
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
        createRequest('DELETE', undefined, 'http://localhost:3000/api/service-types?id=st-1')
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
