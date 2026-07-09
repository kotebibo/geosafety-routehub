import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockRequireAdminOrDispatcher = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAdminOrDispatcher: (...args: any[]) => mockRequireAdminOrDispatcher(...args),
}))

const mockOptimizeRoute = vi.fn()

vi.mock('@routehub/route-optimizer', () => ({
  optimizeRoute: (...args: any[]) => mockOptimizeRoute(...args),
}))

import { POST } from '../../../../app/api/routes/optimize/route'

// --- Helpers ---

function makeRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/routes/optimize', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function validBody(overrides: Record<string, any> = {}) {
  return {
    locations: [
      { id: 'loc-1', name: 'A', lat: 41.7, lng: 44.8 },
      { id: 'loc-2', name: 'B', lat: 41.71, lng: 44.81 },
    ],
    options: { algorithm: 'nearest-neighbor', useRealRoads: true },
    ...overrides,
  }
}

// --- Tests ---

describe('POST /api/routes/optimize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminOrDispatcher.mockResolvedValue({
      session: { user: { id: 'user-1' } },
      userRole: 'dispatcher',
    })
  })

  // ---------- Auth ----------

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await POST(makeRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('returns 403 when role is insufficient', async () => {
    const err = new Error('Insufficient permissions')
    err.name = 'ForbiddenError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await POST(makeRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.error).toBe('Insufficient permissions')
  })

  // ---------- Validation ----------

  it('returns 400 when locations has fewer than 2 items', async () => {
    const res = await POST(
      makeRequest(validBody({ locations: [{ id: 'a', name: 'A', lat: 41, lng: 44 }] }))
    )
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('returns 400 when lat is out of range', async () => {
    const res = await POST(
      makeRequest(
        validBody({
          locations: [
            { id: 'a', name: 'A', lat: 100, lng: 44 },
            { id: 'b', name: 'B', lat: 41, lng: 44 },
          ],
        })
      )
    )
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 400 when locations is missing', async () => {
    const res = await POST(makeRequest({ options: {} }))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  // ---------- Success ----------

  it('returns optimized route on success', async () => {
    const optimized = {
      stops: [
        { id: 'loc-1', name: 'A', lat: 41.7, lng: 44.8, position: 0 },
        { id: 'loc-2', name: 'B', lat: 41.71, lng: 44.81, position: 1 },
      ],
      totalDistance: 5.2,
      algorithm: 'nearest-neighbor',
      metadata: { usingRealRoads: true },
    }
    mockOptimizeRoute.mockResolvedValue(optimized)

    const res = await POST(makeRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.route).toEqual(optimized)
    expect(data.metadata.inputStops).toBe(2)
    expect(data.metadata.outputStops).toBe(2)
    expect(data.metadata.algorithm).toBe('nearest-neighbor')
    expect(data.metadata.usingRealRoads).toBe(true)
  })

  it('defaults useRealRoads to true when not specified', async () => {
    const optimized = {
      stops: [],
      algorithm: 'nearest-neighbor',
      metadata: { usingRealRoads: true },
    }
    mockOptimizeRoute.mockResolvedValue(optimized)

    await POST(makeRequest(validBody({ options: {} })))

    expect(mockOptimizeRoute).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ useRealRoads: true })
    )
  })

  // ---------- Errors ----------

  it('returns 500 when optimizer throws', async () => {
    mockOptimizeRoute.mockRejectedValue(new Error('OSRM timeout'))

    const res = await POST(makeRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
