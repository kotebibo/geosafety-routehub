import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../../../../app/api/companies/services/route'

// --- Mocks ---

const mockRequireAdminOrDispatcher = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAdminOrDispatcher: (...args: any[]) => mockRequireAdminOrDispatcher(...args),
}))

function createQueryBuilder(resolvedValue: { data: any; error: any }) {
  const builder: any = {}
  const methods = [
    'select',
    'eq',
    'or',
    'gte',
    'lte',
    'order',
    'range',
    'in',
    'is',
    'limit',
    'single',
    'insert',
    'update',
    'delete',
  ]
  for (const m of methods) {
    builder[m] = vi.fn(() => builder)
  }
  builder.then = (resolve: any) => resolve(resolvedValue)
  return builder
}

let mockFromResults: Record<string, any[]> = {}
let callCounts: Record<string, number> = {}

const mockFrom = vi.fn((table: string) => {
  const results = mockFromResults[table] || []
  const idx = callCounts[table] || 0
  callCounts[table] = idx + 1
  const result = results[idx] || results[0] || { data: [], error: null }
  return createQueryBuilder(result)
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// We need to mock the schema - import will use the real one
// since it's a pure zod schema with no external dependencies

function makeRequest(body: any) {
  return new NextRequest(new URL('/api/companies/services', 'http://localhost:3000'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validCompanyId = '550e8400-e29b-41d4-a716-446655440000'
const validServiceTypeId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const validInspectorId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

// --- Tests ---

describe('Companies Services API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminOrDispatcher.mockResolvedValue({ session: { user: { id: 'u1' } } })
    mockFromResults = {}
    callCounts = {}
  })

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await POST(makeRequest({ companyId: validCompanyId, services: [] }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Authentication required')
  })

  it('returns 403 when not admin/dispatcher', async () => {
    const err = new Error('Forbidden')
    err.name = 'ForbiddenError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await POST(makeRequest({ companyId: validCompanyId, services: [] }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin or dispatcher access required')
  })

  it('returns 400 on validation failure - invalid companyId', async () => {
    const res = await POST(makeRequest({ companyId: 'not-a-uuid', services: [] }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('returns 400 on validation failure - invalid service_type_id', async () => {
    const res = await POST(
      makeRequest({
        companyId: validCompanyId,
        services: [{ service_type_id: 'bad-uuid' }],
      })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('returns 400 on validation failure - invalid priority', async () => {
    const res = await POST(
      makeRequest({
        companyId: validCompanyId,
        services: [{ service_type_id: validServiceTypeId, priority: 'extreme' }],
      })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('inserts new services when none exist', async () => {
    // No existing services
    mockFromResults['company_services'] = [
      { data: [], error: null }, // select existing
      { data: null, error: null }, // insert
    ]

    const res = await POST(
      makeRequest({
        companyId: validCompanyId,
        services: [{ service_type_id: validServiceTypeId, priority: 'high', status: 'active' }],
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.inserted).toBe(1)
    expect(body.updated).toBe(0)
    expect(body.deleted).toBe(0)
  })

  it('updates existing services and deletes removed ones', async () => {
    // Existing services: one to keep/update, one to delete
    mockFromResults['company_services'] = [
      {
        data: [
          { id: 'existing-1', service_type_id: validServiceTypeId },
          { id: 'existing-2', service_type_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
        ],
        error: null,
      },
      { data: null, error: null }, // delete
      { data: null, error: null }, // update
    ]

    const res = await POST(
      makeRequest({
        companyId: validCompanyId,
        services: [{ service_type_id: validServiceTypeId, priority: 'low', status: 'active' }],
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.updated).toBe(1)
    expect(body.deleted).toBe(1)
    expect(body.inserted).toBe(0)
  })

  it('handles empty services array (deletes all)', async () => {
    mockFromResults['company_services'] = [
      {
        data: [{ id: 'existing-1', service_type_id: validServiceTypeId }],
        error: null,
      },
      { data: null, error: null }, // delete
    ]

    const res = await POST(
      makeRequest({
        companyId: validCompanyId,
        services: [],
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.deleted).toBe(1)
    expect(body.inserted).toBe(0)
    expect(body.updated).toBe(0)
  })

  it('returns 500 on database error', async () => {
    mockFromResults['company_services'] = [{ data: null, error: new Error('DB error') }]

    const res = await POST(
      makeRequest({
        companyId: validCompanyId,
        services: [{ service_type_id: validServiceTypeId }],
      })
    )
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })

  it('accepts valid optional fields', async () => {
    mockFromResults['company_services'] = [
      { data: [], error: null },
      { data: null, error: null },
    ]

    const res = await POST(
      makeRequest({
        companyId: validCompanyId,
        services: [
          {
            service_type_id: validServiceTypeId,
            inspection_frequency_days: 30,
            priority: 'medium',
            status: 'active',
            assigned_inspector_id: validInspectorId,
            notes: 'Test note',
          },
        ],
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.inserted).toBe(1)
  })
})
