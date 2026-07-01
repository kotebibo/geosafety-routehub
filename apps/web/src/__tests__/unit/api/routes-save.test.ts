import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockSupabaseFrom = vi.fn()
const mockSupabaseRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}))

const mockRequireAdminOrDispatcher = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAdminOrDispatcher: (...args: any[]) => mockRequireAdminOrDispatcher(...args),
}))

// Must import after mocks
import { POST } from '../../../../app/api/routes/save/route'

// --- Helpers ---

function makeRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/routes/save', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function validBody(overrides: Record<string, any> = {}) {
  return {
    name: 'Test Route',
    date: '2026-06-09',
    totalDistance: 12.5,
    stops: [
      {
        companyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        position: 1,
      },
    ],
    ...overrides,
  }
}

// --- Tests ---

describe('POST /api/routes/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminOrDispatcher.mockResolvedValue({
      session: { user: { id: 'user-1' } },
      userRole: 'admin',
    })
  })

  // ---------- Auth ----------

  it('returns 401 when user is not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await POST(makeRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('returns 403 when user lacks admin/dispatcher role', async () => {
    const err = new Error('Insufficient permissions')
    err.name = 'ForbiddenError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await POST(makeRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.error).toBe('Insufficient permissions')
  })

  // ---------- Validation ----------

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest(validBody({ name: '' })))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('returns 400 when date format is invalid', async () => {
    const res = await POST(makeRequest(validBody({ date: '06-09-2026' })))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 400 when stops array is empty', async () => {
    const res = await POST(makeRequest(validBody({ stops: [] })))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 400 when totalDistance is negative', async () => {
    const res = await POST(makeRequest(validBody({ totalDistance: -5 })))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  // ---------- Success ----------

  it('returns success when route is saved without service type', async () => {
    const insertedRoute = { id: 'route-1', name: 'Test Route', date: '2026-06-09' }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'routes') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: insertedRoute, error: null }),
            }),
          }),
        }
      }
      if (table === 'route_stops') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.route.id).toBe('route-1')
    expect(data.route.totalStops).toBe(1)
    expect(data.message).toContain('saved successfully')
  })

  it('returns success and updates company_services when serviceTypeId is provided', async () => {
    const insertedRoute = { id: 'route-2', name: 'Service Route', date: '2026-06-09' }
    const serviceType = { default_frequency_days: 30 }
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const mockInsertHistory = vi.fn().mockResolvedValue({ error: null })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'routes') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: insertedRoute, error: null }),
            }),
          }),
        }
      }
      if (table === 'route_stops') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      if (table === 'service_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: serviceType, error: null }),
            }),
          }),
        }
      }
      if (table === 'company_services') {
        return { update: mockUpdate }
      }
      if (table === 'inspection_history') {
        return { insert: mockInsertHistory }
      }
      return {}
    })

    const body = validBody({
      serviceTypeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      inspectorId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      stops: [
        {
          companyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          companyServiceId: '123e4567-e89b-12d3-a456-426614174000',
          position: 1,
        },
      ],
    })

    const res = await POST(makeRequest(body))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.route.serviceTypeId).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479')
  })

  // ---------- DB Errors ----------

  it('returns 500 when route insert fails', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'routes') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'insert failed' },
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('returns 500 and rolls back route when stops insert fails', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'routes') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'route-fail', name: 'Test' },
                error: null,
              }),
            }),
          }),
          delete: mockDelete,
        }
      }
      if (table === 'route_stops') {
        return {
          insert: vi.fn().mockResolvedValue({ error: { message: 'stops failed' } }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Internal server error')
    // Verify rollback was attempted
    expect(mockDelete).toHaveBeenCalled()
  })
})
