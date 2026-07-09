import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mock setup ---

const mockRequireAdminOrDispatcher = vi.fn().mockResolvedValue({
  session: { user: { id: 'admin-1' } },
  userRole: 'admin',
})

vi.mock('@/middleware/auth', () => ({
  requireAdminOrDispatcher: (...args: any[]) => mockRequireAdminOrDispatcher(...args),
  UnauthorizedError: class extends Error {
    constructor(msg: string) {
      super(msg)
      this.name = 'UnauthorizedError'
    }
  },
  ForbiddenError: class extends Error {
    constructor(msg: string) {
      super(msg)
      this.name = 'ForbiddenError'
    }
  },
}))

import { UnauthorizedError, ForbiddenError } from '@/middleware/auth'

// Build a chainable mock where every method returns the chain,
// and the chain itself is a thenable that resolves to `resolvedValue`.
function createChainableMock(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {}
  const methods = [
    'select',
    'insert',
    'update',
    'eq',
    'neq',
    'in',
    'is',
    'not',
    'gte',
    'lte',
    'order',
    'limit',
    'single',
    'filter',
  ]
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  // Make the chain thenable so await/Promise.all can resolve it
  chain.then = (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject)
  return chain
}

let mockFromHandlers: Record<string, any> = {}

const mockFrom = vi.fn((table: string) => {
  if (mockFromHandlers[table]) return mockFromHandlers[table]
  return createChainableMock()
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({ from: mockFrom })),
}))

import { GET } from '../../../../app/api/location/active/route'

function makeRequest(params?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/location/active')
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/location/active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminOrDispatcher.mockResolvedValue({
      session: { user: { id: 'admin-1' } },
      userRole: 'admin',
    })
    mockFromHandlers = {}
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAdminOrDispatcher.mockRejectedValue(new UnauthorizedError('Authentication required'))

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Authentication required')
  })

  it('should return 403 when user is not admin or dispatcher', async () => {
    mockRequireAdminOrDispatcher.mockRejectedValue(
      new ForbiddenError('Admin or dispatcher access required')
    )

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Admin or dispatcher access required')
  })

  it('should return empty array when no active inspectors', async () => {
    // The inspectors query chain: .select().not().gte().eq() -> resolves
    const inspectorsChain = createChainableMock({ data: [], error: null })
    mockFromHandlers['inspectors'] = inspectorsChain

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual([])
  })

  it('should return active inspectors with location data', async () => {
    const inspectors = [
      {
        id: 'insp-1',
        full_name: 'Inspector One',
        phone: '+995555000001',
        last_location_update: new Date().toISOString(),
      },
    ]

    // inspectors chain resolves with data
    const inspectorsChain = createChainableMock({ data: inspectors, error: null })
    mockFromHandlers['inspectors'] = inspectorsChain

    // Location history chain — used inside Promise.all, must be thenable
    const locations = [
      { inspector_id: 'insp-1', lat: 41.7, lng: 44.8, recorded_at: new Date().toISOString() },
    ]
    const locationChain = createChainableMock({ data: locations, error: null })
    mockFromHandlers['inspector_location_history'] = locationChain

    // Routes chain — no active routes
    const routesChain = createChainableMock({ data: [], error: null })
    mockFromHandlers['routes'] = routesChain

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json.length).toBe(1)
    expect(json[0].id).toBe('insp-1')
    expect(json[0].full_name).toBe('Inspector One')
    expect(json[0].lat).toBe(41.7)
    expect(json[0].lng).toBe(44.8)
    expect(json[0].active_route).toBeNull()
  })

  it('should include active route info when available', async () => {
    const inspectors = [
      {
        id: 'insp-1',
        full_name: 'Inspector One',
        phone: '+995555000001',
        last_location_update: new Date().toISOString(),
      },
    ]

    const inspectorsChain = createChainableMock({ data: inspectors, error: null })
    mockFromHandlers['inspectors'] = inspectorsChain

    const locations = [
      { inspector_id: 'insp-1', lat: 41.7, lng: 44.8, recorded_at: new Date().toISOString() },
    ]
    const locationChain = createChainableMock({ data: locations, error: null })
    mockFromHandlers['inspector_location_history'] = locationChain

    const routes = [
      {
        id: 'route-1',
        name: 'Route A',
        status: 'in_progress',
        inspector_id: 'insp-1',
        route_stops: [
          { id: 's1', status: 'completed' },
          { id: 's2', status: 'planned' },
          { id: 's3', status: 'planned' },
        ],
      },
    ]
    const routesChain = createChainableMock({ data: routes, error: null })
    mockFromHandlers['routes'] = routesChain

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json[0].active_route).toBeDefined()
    expect(json[0].active_route.id).toBe('route-1')
    expect(json[0].active_route.name).toBe('Route A')
    expect(json[0].active_route.total_stops).toBe(3)
    expect(json[0].active_route.completed_stops).toBe(1)
  })

  it('should filter out inspectors without location data', async () => {
    const inspectors = [
      {
        id: 'insp-1',
        full_name: 'Inspector One',
        phone: '+995555000001',
        last_location_update: new Date().toISOString(),
      },
      {
        id: 'insp-2',
        full_name: 'Inspector Two',
        phone: '+995555000002',
        last_location_update: new Date().toISOString(),
      },
    ]

    const inspectorsChain = createChainableMock({ data: inspectors, error: null })
    mockFromHandlers['inspectors'] = inspectorsChain

    // Only insp-1 has location
    const locations = [
      { inspector_id: 'insp-1', lat: 41.7, lng: 44.8, recorded_at: new Date().toISOString() },
    ]
    const locationChain = createChainableMock({ data: locations, error: null })
    mockFromHandlers['inspector_location_history'] = locationChain

    const routesChain = createChainableMock({ data: [], error: null })
    mockFromHandlers['routes'] = routesChain

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.length).toBe(1)
    expect(json[0].id).toBe('insp-1')
  })

  it('should return 500 on database error', async () => {
    // The inspectors query throws (error is truthy, so `throw inspError`)
    const inspectorsChain = createChainableMock({
      data: null,
      error: { message: 'DB error' },
    })
    // Override: the API does `if (inspError) throw inspError`, but inspError
    // is destructured from the resolved value. We need the chain to resolve
    // with an error field, then the route throws it.
    // Actually the route does: const { data, error } = await supabase...
    // then `if (inspError) throw inspError` — so the throw makes it hit catch.
    // But the catch only handles UnauthorizedError/ForbiddenError, otherwise 500.
    mockFromHandlers['inspectors'] = inspectorsChain

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })
})
