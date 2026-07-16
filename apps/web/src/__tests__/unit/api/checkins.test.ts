import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mock setup ---

// Use RFC 4122 v4 UUIDs (version nibble = 4, variant nibble = 8/9/a/b)
const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const OTHER_USER_ID = 'd4e5f6a7-b8c9-4d0e-af1a-2b3c4d5e6f7a'
const COMPANY_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6'
const LOCATION_ID = 'c3d4e5f6-a7b8-4c9d-ae0f-1a2b3c4d5e6f'
const CHECKIN_ID = 'e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a8b9'

const mockSession = { user: { id: USER_ID } }

const mockRequireAuth = vi.fn().mockResolvedValue(mockSession)
const mockRequireRole = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
  requireRole: (...args: any[]) => mockRequireRole(...args),
  UnauthorizedError: class extends Error {
    constructor(msg: string) {
      super(msg)
      this.name = 'UnauthorizedError'
    }
  },
}))

// Chainable mock builder for Supabase queries
function createChainableMock(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {}
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'in',
    'is',
    'gte',
    'lte',
    'gt',
    'lt',
    'not',
    'filter',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'head',
  ]
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  // Terminal methods resolve
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  // Make the chain itself thenable for queries that are awaited directly
  chain.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
  return chain
}

let mockFromHandlers: Record<string, any> = {}

const mockFrom = vi.fn((table: string) => {
  if (mockFromHandlers[table]) return mockFromHandlers[table]
  return createChainableMock()
})

const mockSupabase = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabase),
  createServiceClient: vi.fn(() => mockSupabase),
}))

import { GET, POST, PATCH } from '../../../../app/api/checkins/route'

// Helper to create NextRequest
function makeRequest(method: string, body?: any, params?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/checkins')
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

const validCheckinBody = {
  inspector_id: USER_ID,
  company_id: COMPANY_ID,
  company_location_id: LOCATION_ID,
  lat: 41.7151,
  lng: 44.8271,
  accuracy: 10,
}

const validCheckoutBody = {
  checkin_id: CHECKIN_ID,
  lat: 41.7151,
  lng: 44.8271,
}

describe('POST /api/checkins (check-in)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(mockSession)
    mockFromHandlers = {}
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      Object.assign(new Error('Authentication required'), { name: 'UnauthorizedError' })
    )

    const req = makeRequest('POST', validCheckinBody)
    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Authentication required')
  })

  it('should return 400 for invalid body', async () => {
    const req = makeRequest('POST', { inspector_id: 'not-a-uuid' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
    expect(json.details).toBeDefined()
  })

  it('should return 403 when user role not found', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: null, error: null })

    const req = makeRequest('POST', validCheckinBody)
    const res = await POST(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('User role not found')
  })

  it('should return 403 when officer tries to check in as another inspector', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'officer' }, error: null })

    const body = { ...validCheckinBody, inspector_id: OTHER_USER_ID }
    const req = makeRequest('POST', body)
    const res = await POST(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Cannot check in as another inspector')
  })

  it('should return 409 when inspector has active checkin', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'officer' }, error: null })

    // location_checkins is called for active checkin check via .maybeSingle()
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: { id: 'existing' },
      error: null,
    })

    const req = makeRequest('POST', validCheckinBody)
    const res = await POST(req)

    expect(res.status).toBe(409)
  })

  it('should return 422 when inspector is too far from location', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'officer' }, error: null })

    // No active checkin
    const checkinChain = createChainableMock({ data: null, error: null })
    mockFromHandlers['location_checkins'] = checkinChain

    // Company location with coords far away
    mockFromHandlers['company_locations'] = createChainableMock({
      data: { lat: 42.0, lng: 45.0 },
      error: null,
    })

    const req = makeRequest('POST', validCheckinBody)
    const res = await POST(req)

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.distance).toBeDefined()
    expect(json.max_radius).toBe(150)
  })

  // Company location ~200m north of validCheckinBody's lat/lng — used to exercise
  // the distance-minus-accuracy boundary (GPS accuracy is forgiving slack).
  const NEAR_LOCATION_LAT = validCheckinBody.lat + 0.0018 // ~200m away

  function makeAcceptingLocationCheckinsHandler() {
    const handler: any = {
      select: vi.fn().mockImplementation(() => {
        const innerChain: any = {}
        const chainMethods = ['eq', 'is', 'limit', 'order', 'filter']
        for (const m of chainMethods) {
          innerChain[m] = vi.fn().mockReturnValue(innerChain)
        }
        innerChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
        innerChain.single = vi.fn().mockResolvedValue({ data: null, error: null })
        innerChain.then = (resolve: any) =>
          Promise.resolve({ data: null, error: null }).then(resolve)
        return innerChain
      }),
      insert: vi.fn().mockImplementation(() => {
        const insertChain: any = {}
        insertChain.select = vi.fn().mockReturnValue(insertChain)
        insertChain.single = vi.fn().mockResolvedValue({
          data: {
            id: 'new-checkin-id',
            inspector_id: USER_ID,
            company_id: COMPANY_ID,
            company_location_id: LOCATION_ID,
            created_at: new Date().toISOString(),
            lat: validCheckinBody.lat,
            lng: validCheckinBody.lng,
          },
          error: null,
        })
        return insertChain
      }),
    }
    return handler
  }

  it('should return 201 when distance minus accuracy is within radius (indoor GPS slack)', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'officer' }, error: null })
    mockFromHandlers['location_checkins'] = makeAcceptingLocationCheckinsHandler()
    mockFromHandlers['company_locations'] = createChainableMock({
      data: { lat: NEAR_LOCATION_LAT, lng: validCheckinBody.lng },
      error: null,
    })

    // raw distance ~200m, accuracy 60 -> effective distance ~140m <= 150
    const req = makeRequest('POST', { ...validCheckinBody, accuracy: 60 })
    const res = await POST(req)

    expect(res.status).toBe(201)
  })

  it('should return 201 exactly at the distance-minus-accuracy boundary (== 150)', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'officer' }, error: null })
    mockFromHandlers['location_checkins'] = makeAcceptingLocationCheckinsHandler()
    mockFromHandlers['company_locations'] = createChainableMock({
      data: { lat: NEAR_LOCATION_LAT, lng: validCheckinBody.lng },
      error: null,
    })

    // raw distance ~200m, accuracy 50 -> effective distance exactly 150m
    const req = makeRequest('POST', { ...validCheckinBody, accuracy: 50 })
    const res = await POST(req)

    expect(res.status).toBe(201)
  })

  it('should return 422 when distance minus accuracy still exceeds radius', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'officer' }, error: null })
    mockFromHandlers['location_checkins'] = createChainableMock({ data: null, error: null })
    mockFromHandlers['company_locations'] = createChainableMock({
      data: { lat: NEAR_LOCATION_LAT, lng: validCheckinBody.lng },
      error: null,
    })

    // raw distance ~200m, accuracy 10 -> effective distance ~190m > 150
    const req = makeRequest('POST', { ...validCheckinBody, accuracy: 10 })
    const res = await POST(req)

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.distance).toBeDefined()
  })

  it('should return 201 on successful check-in (location has no GPS)', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'officer' }, error: null })

    // No active checkin (maybeSingle returns null)
    // Then insert returns the new checkin (single returns data)
    // The API calls location_checkins twice: once for active check, once for insert
    // Both go through from('location_checkins') so we need a handler that handles both paths
    let locationCheckinsCallCount = 0
    const locationCheckinsHandler: any = {
      select: vi.fn().mockImplementation(() => {
        locationCheckinsCallCount++
        const innerChain: any = {}
        const chainMethods = ['eq', 'is', 'limit', 'order', 'filter']
        for (const m of chainMethods) {
          innerChain[m] = vi.fn().mockReturnValue(innerChain)
        }
        // maybeSingle for active checkin check
        innerChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
        innerChain.single = vi.fn().mockResolvedValue({ data: null, error: null })
        innerChain.then = (resolve: any) =>
          Promise.resolve({ data: null, error: null }).then(resolve)
        return innerChain
      }),
      insert: vi.fn().mockImplementation(() => {
        const insertChain: any = {}
        insertChain.select = vi.fn().mockReturnValue(insertChain)
        insertChain.single = vi.fn().mockResolvedValue({
          data: {
            id: 'new-checkin-id',
            inspector_id: USER_ID,
            company_id: COMPANY_ID,
            company_location_id: LOCATION_ID,
            created_at: new Date().toISOString(),
            lat: validCheckinBody.lat,
            lng: validCheckinBody.lng,
          },
          error: null,
        })
        return insertChain
      }),
    }
    mockFromHandlers['location_checkins'] = locationCheckinsHandler

    // Company location with no GPS coords
    const locationChain = createChainableMock({ data: { lat: null, lng: null }, error: null })
    locationChain.update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    mockFromHandlers['company_locations'] = locationChain

    // boards for sync (empty, no boards to sync to)
    mockFromHandlers['boards'] = createChainableMock({ data: [], error: null })

    const req = makeRequest('POST', validCheckinBody)
    const res = await POST(req)

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.location_updated).toBe(true)
  })

  it('should return 500 on unexpected error', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'admin' }, error: null })

    // Throw from location_checkins
    const errorChain: any = {
      select: vi.fn().mockImplementation(() => {
        throw new Error('DB connection failed')
      }),
    }
    mockFromHandlers['location_checkins'] = errorChain

    const req = makeRequest('POST', validCheckinBody)
    const res = await POST(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })
})

describe('PATCH /api/checkins (check-out)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(mockSession)
    mockFromHandlers = {}
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      Object.assign(new Error('Authentication required'), { name: 'UnauthorizedError' })
    )

    const req = makeRequest('PATCH', validCheckoutBody)
    const res = await PATCH(req)

    expect(res.status).toBe(401)
  })

  it('should return 400 for invalid body', async () => {
    const req = makeRequest('PATCH', { checkin_id: 'not-uuid' })
    const res = await PATCH(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
  })

  it('should return 404 when checkin not found', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: null,
      error: { message: 'not found' },
    })

    const req = makeRequest('PATCH', validCheckoutBody)
    const res = await PATCH(req)

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Check-in not found')
  })

  it('should return 400 when already checked out', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: {
        id: CHECKIN_ID,
        checked_out_at: '2025-01-01T00:00:00Z',
        inspector_id: USER_ID,
        created_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    })

    const req = makeRequest('PATCH', validCheckoutBody)
    const res = await PATCH(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Already checked out')
  })

  it('should return 403 when officer checks out another inspector', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: {
        id: CHECKIN_ID,
        checked_out_at: null,
        inspector_id: OTHER_USER_ID,
        created_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    })

    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'officer' }, error: null })

    const req = makeRequest('PATCH', validCheckoutBody)
    const res = await PATCH(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Cannot check out another inspector')
  })

  it('should return 403 when user role not found on checkout', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: {
        id: CHECKIN_ID,
        checked_out_at: null,
        inspector_id: USER_ID,
        created_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    })

    mockFromHandlers['user_roles'] = createChainableMock({ data: null, error: null })

    const req = makeRequest('PATCH', validCheckoutBody)
    const res = await PATCH(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('User role not found')
  })

  it('should successfully check out and return updated data', async () => {
    const updatedCheckin = {
      id: CHECKIN_ID,
      checked_out_at: new Date().toISOString(),
      inspector_id: USER_ID,
      duration_minutes: 30,
      checkout_distance: 15,
      location_match: true,
    }

    const locationCheckinsHandler: any = {
      select: vi.fn().mockImplementation(() => {
        const chain: any = {}
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: CHECKIN_ID,
            checked_out_at: null,
            inspector_id: USER_ID,
            lat: 41.7151,
            lng: 44.8271,
            created_at: new Date(Date.now() - 30 * 60000).toISOString(),
          },
          error: null,
        })
        return chain
      }),
      update: vi.fn().mockImplementation(() => {
        const chain: any = {}
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.select = vi.fn().mockReturnValue(chain)
        chain.single = vi.fn().mockResolvedValue({
          data: updatedCheckin,
          error: null,
        })
        return chain
      }),
    }
    mockFromHandlers['location_checkins'] = locationCheckinsHandler

    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'admin' }, error: null })

    // Boards for sync (empty)
    mockFromHandlers['boards'] = createChainableMock({ data: [], error: null })

    const req = makeRequest('PATCH', validCheckoutBody)
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe(CHECKIN_ID)
  })
})

describe('GET /api/checkins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(mockSession)
    mockFromHandlers = {}
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      Object.assign(new Error('Authentication required'), { name: 'UnauthorizedError' })
    )

    const req = makeRequest('GET')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('should return 403 when user role not found', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: null, error: null })

    const req = makeRequest('GET')
    const res = await GET(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('User role not found')
  })

  it('should return checkins for admin user', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'admin' }, error: null })

    const mockCheckins = [
      {
        id: 'c1',
        inspector_id: USER_ID,
        companies: { name: 'Acme' },
        company_locations: { name: 'Office' },
      },
    ]

    const checkinsChain: any = {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockCheckins, error: null }),
      }),
    }
    mockFromHandlers['location_checkins'] = checkinsChain

    // Inspector names resolved from public.users (no FK for PostgREST embed)
    mockFromHandlers['users'] = createChainableMock({
      data: [{ id: USER_ID, full_name: 'John', email: 'john@example.com' }],
      error: null,
    })

    const req = makeRequest('GET')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json[0].inspector_name).toBe('John')
    expect(json[0].company_name).toBe('Acme')
    expect(json[0].location_name).toBe('Office')
  })

  it('should filter by query params', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'admin' }, error: null })

    // Build a chain that supports all the filter methods and resolves at the end
    const chain: any = {}
    const methods = ['eq', 'gte', 'lte', 'is', 'limit', 'order']
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain)
    }
    chain.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)

    const checkinsChain: any = {
      select: vi.fn().mockReturnValue(chain),
    }
    mockFromHandlers['location_checkins'] = checkinsChain

    const req = makeRequest('GET', undefined, {
      inspector_id: USER_ID,
      company_id: 'comp-1',
      from_date: '2025-01-01',
      to_date: '2025-12-31',
      active: 'true',
      limit: '10',
    })

    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('should restrict officer to their own checkins', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'officer' }, error: null })

    const chain: any = {}
    const methods = ['eq', 'order']
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain)
    }
    chain.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)

    const checkinsChain: any = {
      select: vi.fn().mockReturnValue(chain),
    }
    mockFromHandlers['location_checkins'] = checkinsChain

    const req = makeRequest('GET')
    const res = await GET(req)

    // The API calls .order() then .eq('inspector_id', session.user.id) for officers
    expect(chain.order).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('inspector_id', USER_ID)
  })

  it('should return 500 on database error', async () => {
    mockFromHandlers['user_roles'] = createChainableMock({ data: { role: 'admin' }, error: null })

    const checkinsChain: any = {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    }
    mockFromHandlers['location_checkins'] = checkinsChain

    const req = makeRequest('GET')
    const res = await GET(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })
})
