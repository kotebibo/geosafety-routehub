import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mock setup ---

// Use RFC 4122 v4 UUIDs (version nibble = 4, variant nibble = 8/9/a/b)
const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const CHECKIN_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6'
const COMPANY_LOCATION_ID = 'c3d4e5f6-a7b8-4c9d-ae0f-1a2b3c4d5e6f'

const mockSession = { user: { id: USER_ID } }
const mockRequireAuth = vi.fn().mockResolvedValue(mockSession)

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
  UnauthorizedError: class extends Error {
    constructor(msg: string) {
      super(msg)
      this.name = 'UnauthorizedError'
    }
  },
}))

function createChainableMock(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {}
  const methods = [
    'select',
    'insert',
    'update',
    'eq',
    'is',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'filter',
  ]
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
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

import { POST } from '../../../../app/api/checkins/ping/route'

function makeRequest(body?: any) {
  return new NextRequest(new URL('http://localhost:3000/api/checkins/ping'), {
    method: 'POST',
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

const validPingBody = {
  checkin_id: CHECKIN_ID,
  lat: 41.7151,
  lng: 44.8271,
  accuracy: 5,
}

describe('POST /api/checkins/ping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(mockSession)
    mockFromHandlers = {}
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      Object.assign(new Error('Authentication required'), { name: 'UnauthorizedError' })
    )

    const req = makeRequest(validPingBody)
    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Authentication required')
  })

  it('should return 400 for invalid body (missing required fields)', async () => {
    const req = makeRequest({ checkin_id: 'not-a-uuid' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
    expect(json.details).toBeDefined()
  })

  it('should return 400 for lat out of range', async () => {
    const req = makeRequest({ ...validPingBody, lat: 95 })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
  })

  it('should return 400 for lng out of range', async () => {
    const req = makeRequest({ ...validPingBody, lng: 200 })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('should return 404 when checkin not found', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: null,
      error: { message: 'not found' },
    })

    const req = makeRequest(validPingBody)
    const res = await POST(req)

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Check-in not found')
  })

  it('should return 400 when checkin already closed', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: {
        id: CHECKIN_ID,
        checked_out_at: '2025-01-01T12:00:00Z',
        lat: 41.7151,
        lng: 44.8271,
        company_location_id: null,
      },
      error: null,
    })

    const req = makeRequest(validPingBody)
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Check-in already closed')
  })

  it('should return within_radius=true when close to checkin location (no company location)', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: {
        id: CHECKIN_ID,
        checked_out_at: null,
        lat: 41.7151,
        lng: 44.8271,
        company_location_id: null,
      },
      error: null,
    })

    mockFromHandlers['checkin_gps_pings'] = createChainableMock({ error: null })

    const req = makeRequest(validPingBody)
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.within_radius).toBe(true)
    expect(json.distance).toBe(0)
    expect(json.warning).toBeNull()
  })

  it('should use company location coords as reference when available', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: {
        id: CHECKIN_ID,
        checked_out_at: null,
        lat: 41.7151,
        lng: 44.8271,
        company_location_id: COMPANY_LOCATION_ID,
      },
      error: null,
    })

    // Company location at same coords as ping
    mockFromHandlers['company_locations'] = createChainableMock({
      data: { lat: 41.7151, lng: 44.8271 },
      error: null,
    })

    mockFromHandlers['checkin_gps_pings'] = createChainableMock({ error: null })

    const req = makeRequest(validPingBody)
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.within_radius).toBe(true)
  })

  it('should return within_radius=false and warning when far from location', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: {
        id: CHECKIN_ID,
        checked_out_at: null,
        lat: 41.7151,
        lng: 44.8271,
        company_location_id: null,
      },
      error: null,
    })

    mockFromHandlers['checkin_gps_pings'] = createChainableMock({ error: null })

    // Ping from far away
    const farBody = { ...validPingBody, lat: 42.0, lng: 45.0 }
    const req = makeRequest(farBody)
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.within_radius).toBe(false)
    expect(json.warning).toBeTruthy()
    expect(json.distance).toBeGreaterThan(100)
  })

  it('should return 500 when ping insert fails', async () => {
    mockFromHandlers['location_checkins'] = createChainableMock({
      data: {
        id: CHECKIN_ID,
        checked_out_at: null,
        lat: 41.7151,
        lng: 44.8271,
        company_location_id: null,
      },
      error: null,
    })

    // Insert returns an error - the chain.then will resolve with this
    // But the API does: const { error: insertError } = await (supabase as any).from('checkin_gps_pings').insert({...})
    // insert() returns chain, then await resolves via chain.then
    mockFromHandlers['checkin_gps_pings'] = createChainableMock({
      error: { message: 'Insert failed' },
    })

    const req = makeRequest(validPingBody)
    const res = await POST(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })
})
