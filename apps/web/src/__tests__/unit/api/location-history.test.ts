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

function createChainableMock(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {}
  const methods = ['select', 'eq', 'gte', 'order', 'single']
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain.order = vi.fn().mockResolvedValue(resolvedValue)
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

import { GET } from '../../../../app/api/location/history/route'

function makeRequest(params?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/location/history')
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/location/history', () => {
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

    const req = makeRequest({ inspector_id: 'insp-1' })
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Authentication required')
  })

  it('should return 403 when user lacks permissions', async () => {
    mockRequireAdminOrDispatcher.mockRejectedValue(new ForbiddenError('Insufficient permissions'))

    const req = makeRequest({ inspector_id: 'insp-1' })
    const res = await GET(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Insufficient permissions')
  })

  it('should return 400 when inspector_id is missing', async () => {
    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('inspector_id is required')
  })

  it('should return location history for given inspector', async () => {
    const historyData = [
      { lat: 41.7, lng: 44.8, recorded_at: '2025-06-01T10:00:00Z', accuracy: 5, speed: 10 },
      { lat: 41.71, lng: 44.81, recorded_at: '2025-06-01T10:05:00Z', accuracy: 8, speed: 15 },
    ]

    const historyChain = createChainableMock({ data: historyData, error: null })
    mockFromHandlers['inspector_location_history'] = historyChain

    const req = makeRequest({ inspector_id: 'insp-1' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json.length).toBe(2)
    expect(json[0].lat).toBe(41.7)
    expect(json[1].speed).toBe(15)
  })

  it('should use custom since parameter when provided', async () => {
    const historyChain = createChainableMock({ data: [], error: null })
    mockFromHandlers['inspector_location_history'] = historyChain

    const req = makeRequest({
      inspector_id: 'insp-1',
      since: '2025-06-01T00:00:00Z',
    })
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual([])
  })

  it('should default to 24 hours ago when since is not provided', async () => {
    const historyChain = createChainableMock({ data: [], error: null })
    mockFromHandlers['inspector_location_history'] = historyChain

    const req = makeRequest({ inspector_id: 'insp-1' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    // Verify gte was called (the chain processes the since date)
    expect(historyChain.gte).toHaveBeenCalled()
  })

  it('should return empty array when no data', async () => {
    const historyChain = createChainableMock({ data: null, error: null })
    mockFromHandlers['inspector_location_history'] = historyChain

    const req = makeRequest({ inspector_id: 'insp-1' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual([])
  })

  it('should return 500 on database error', async () => {
    const historyChain = createChainableMock()
    historyChain.order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Connection failed' },
    })
    mockFromHandlers['inspector_location_history'] = historyChain

    const req = makeRequest({ inspector_id: 'insp-1' })
    const res = await GET(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })
})
