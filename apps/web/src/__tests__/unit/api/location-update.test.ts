import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mock setup ---

const USER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const OTHER_UUID = 'b1ffcd00-1d2e-4f39-ac7e-7ccaae491b22'

const mockSession = { user: { id: USER_UUID } }
const mockRequireAuth = vi.fn().mockResolvedValue(mockSession)

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
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

function createChainableMock(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {}
  const methods = ['select', 'insert', 'update', 'eq', 'single']
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
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

// Mock global fetch for Ably broadcasts
const mockFetch = vi.fn().mockResolvedValue({ ok: true })
vi.stubGlobal('fetch', mockFetch)

import { POST } from '../../../../app/api/location/update/route'

function makeRequest(body?: any) {
  return new NextRequest(new URL('http://localhost:3000/api/location/update'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

const validBody = {
  inspector_id: USER_UUID,
  latitude: 41.7151,
  longitude: 44.8271,
  accuracy: 10,
  speed: 5,
  heading: 180,
}

// Helper to set up mocks for a successful location update
function setupSuccessMocks(role: string = 'officer') {
  const userRolesChain = createChainableMock({ data: { role }, error: null })
  // .single() is the terminal call — make it resolve properly
  userRolesChain.single = vi.fn().mockResolvedValue({ data: { role }, error: null })
  mockFromHandlers['user_roles'] = userRolesChain

  // inspectors update chain: .update().eq() -> resolves
  const inspectorsChain = createChainableMock({ error: null })
  mockFromHandlers['inspectors'] = inspectorsChain

  // location history insert chain: .insert() -> resolves
  const historyChain = createChainableMock({ error: null })
  mockFromHandlers['inspector_location_history'] = historyChain
}

describe('POST /api/location/update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(mockSession)
    mockFromHandlers = {}
    process.env.ABLY_API_KEY = 'test-ably-key'
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(new UnauthorizedError('Authentication required'))

    const req = makeRequest(validBody)
    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Authentication required')
  })

  it('should return 400 for invalid body (missing required fields)', async () => {
    const req = makeRequest({ inspector_id: 'not-uuid' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
    expect(json.details).toBeDefined()
  })

  it('should return 400 for latitude out of range', async () => {
    const req = makeRequest({ ...validBody, latitude: 95 })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('should return 400 for longitude out of range', async () => {
    const req = makeRequest({ ...validBody, longitude: -200 })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('should return 400 when inspector_id is not a valid UUID', async () => {
    const req = makeRequest({ ...validBody, inspector_id: 'invalid' })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('should return 403 when officer tries to update another inspector location', async () => {
    // User role is officer (not admin/dispatcher)
    const userRolesChain = createChainableMock({ data: { role: 'officer' }, error: null })
    userRolesChain.single = vi.fn().mockResolvedValue({ data: { role: 'officer' }, error: null })
    mockFromHandlers['user_roles'] = userRolesChain

    const req = makeRequest({ ...validBody, inspector_id: OTHER_UUID })
    const res = await POST(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Not authorized for this user')
  })

  it('should allow admin to update any inspector location', async () => {
    setupSuccessMocks('admin')

    const req = makeRequest({ ...validBody, inspector_id: OTHER_UUID })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('should allow dispatcher to update any inspector location', async () => {
    setupSuccessMocks('dispatcher')

    const req = makeRequest({ ...validBody, inspector_id: OTHER_UUID })
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  it('should allow officer to update own location', async () => {
    setupSuccessMocks('officer')

    const req = makeRequest(validBody) // inspector_id = USER_UUID = session user
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('should broadcast via Ably when API key is set', async () => {
    setupSuccessMocks('officer')

    const req = makeRequest(validBody)
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('rest.ably.io'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('should not fail when Ably broadcast fails', async () => {
    setupSuccessMocks('officer')
    mockFetch.mockRejectedValueOnce(new Error('Ably connection failed'))

    const req = makeRequest(validBody)
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  it('should not call Ably when no API key is set', async () => {
    delete process.env.ABLY_API_KEY
    delete process.env.NEXT_PUBLIC_ABLY_API_KEY

    setupSuccessMocks('officer')

    const req = makeRequest(validBody)
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('rest.ably.io'),
      expect.anything()
    )
  })

  it('should accept optional fields (accuracy, speed, heading, route_id)', async () => {
    setupSuccessMocks('officer')

    const minimalBody = {
      inspector_id: USER_UUID,
      latitude: 41.7151,
      longitude: 44.8271,
    }

    const req = makeRequest(minimalBody)
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  it('should handle DB errors gracefully and return 500', async () => {
    const userRolesChain = createChainableMock({ data: { role: 'officer' }, error: null })
    userRolesChain.single = vi.fn().mockResolvedValue({ data: { role: 'officer' }, error: null })
    mockFromHandlers['user_roles'] = userRolesChain

    // Make inspectors update throw
    const inspectorsChain: any = {
      update: vi.fn().mockImplementation(() => {
        throw new Error('DB connection lost')
      }),
    }
    mockFromHandlers['inspectors'] = inspectorsChain

    const historyChain = createChainableMock({ error: null })
    mockFromHandlers['inspector_location_history'] = historyChain

    const req = makeRequest(validBody)
    const res = await POST(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })
})
