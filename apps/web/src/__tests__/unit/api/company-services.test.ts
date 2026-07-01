import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../../../app/api/company-services/route'

// --- Mocks ---

const mockRequireAuth = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
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
  ]
  for (const m of methods) {
    builder[m] = vi.fn(() => builder)
  }
  builder.then = (resolve: any) => resolve(resolvedValue)
  return builder
}

let mockFromBuilders: Record<string, any> = {}

const mockFrom = vi.fn((table: string) => {
  if (mockFromBuilders[table]) return mockFromBuilders[table]
  return createQueryBuilder({ data: [], error: null })
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

function makeRequest(url: string) {
  return new Request(new URL(url, 'http://localhost:3000'))
}

// --- Tests ---

describe('Company Services API (company-services) - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockFromBuilders = {}
  })

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(err)

    const res = await GET(makeRequest('/api/company-services'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Authentication required')
  })

  it('returns company services on success', async () => {
    const services = [
      {
        id: 's1',
        company_id: 'c1',
        service_type_id: 'st1',
        next_inspection_date: '2024-06-01',
        status: 'active',
        company: { id: 'c1', name: 'Acme', address: '123 St', lat: 41.0, lng: 44.0 },
        service_type: { name: 'Fire Safety', name_ka: 'ხანძარსაფრთხილოება' },
      },
    ]
    mockFromBuilders['company_services'] = createQueryBuilder({ data: services, error: null })

    const res = await GET(makeRequest('/api/company-services'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(services)
  })

  it('applies inspector_id filter', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFromBuilders['company_services'] = builder

    await GET(makeRequest('/api/company-services?inspector_id=ins-123'))

    expect(builder.eq).toHaveBeenCalledWith('assigned_inspector_id', 'ins-123')
  })

  it('applies service_type_id filter', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFromBuilders['company_services'] = builder

    await GET(makeRequest('/api/company-services?service_type_id=st-456'))

    expect(builder.eq).toHaveBeenCalledWith('service_type_id', 'st-456')
  })

  it('applies status filter', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFromBuilders['company_services'] = builder

    await GET(makeRequest('/api/company-services?status=active'))

    expect(builder.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('applies multiple filters simultaneously', async () => {
    const builder = createQueryBuilder({ data: [], error: null })
    mockFromBuilders['company_services'] = builder

    await GET(
      makeRequest('/api/company-services?inspector_id=ins-1&service_type_id=st-1&status=active')
    )

    expect(builder.eq).toHaveBeenCalledWith('assigned_inspector_id', 'ins-1')
    expect(builder.eq).toHaveBeenCalledWith('service_type_id', 'st-1')
    expect(builder.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('returns 500 on database error', async () => {
    mockFromBuilders['company_services'] = createQueryBuilder({
      data: null,
      error: new Error('DB error'),
    })

    const res = await GET(makeRequest('/api/company-services'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })
})
