import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

const mockRequireAdmin = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

import { GET } from '../../../../app/api/debug/coordinates/route'

// --- Helpers ---

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/debug/coordinates', {
    method: 'GET',
  })
}

// --- Tests ---

describe('GET /api/debug/coordinates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      session: { user: { id: 'admin-1' } },
      userRole: 'admin',
    })
  })

  // ---------- Auth ----------

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAdmin.mockRejectedValue(err)

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('returns 403 when user is not admin', async () => {
    const err = new Error('Admin access required')
    err.name = 'ForbiddenError'
    mockRequireAdmin.mockRejectedValue(err)

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.error).toBe('Admin access required')
  })

  // ---------- Success - no duplicates ----------

  it('returns no duplicates when all coordinates are unique', async () => {
    const companies = [
      { name: 'A', address: 'Addr A', lat: 41.7, lng: 44.8 },
      { name: 'B', address: 'Addr B', lat: 41.71, lng: 44.81 },
      { name: 'C', address: 'Addr C', lat: 41.72, lng: 44.82 },
    ]

    mockSupabaseFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: companies, error: null }),
      }),
    }))

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.totalCompanies).toBe(3)
    expect(data.duplicateCoordinates).toBe(0)
    expect(data.companiesWithDuplicates).toBe(0)
    expect(data.duplicates).toEqual([])
  })

  // ---------- Success - with duplicates ----------

  it('detects companies sharing the same coordinates', async () => {
    const companies = [
      { name: 'Company A', address: 'Street 1', lat: 41.7, lng: 44.8 },
      { name: 'Company B', address: 'Street 2', lat: 41.7, lng: 44.8 },
      { name: 'Company C', address: 'Street 3', lat: 41.71, lng: 44.81 },
    ]

    mockSupabaseFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: companies, error: null }),
      }),
    }))

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.totalCompanies).toBe(3)
    expect(data.duplicateCoordinates).toBe(1)
    expect(data.companiesWithDuplicates).toBe(2)
    expect(data.duplicates).toHaveLength(1)
    expect(data.duplicates[0].count).toBe(2)
    expect(data.duplicates[0].companies).toHaveLength(2)
  })

  // ---------- Null coordinates ----------

  it('skips companies with null coordinates', async () => {
    const companies = [
      { name: 'A', address: 'Addr', lat: null, lng: null },
      { name: 'B', address: 'Addr', lat: 41.7, lng: 44.8 },
    ]

    mockSupabaseFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: companies, error: null }),
      }),
    }))

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.totalCompanies).toBe(2)
    expect(data.duplicateCoordinates).toBe(0)
  })

  // ---------- Limits duplicates output ----------

  it('limits duplicates output to 10', async () => {
    // Create 15 duplicate coordinate groups
    const companies: Array<{ name: string; address: string; lat: number; lng: number }> = []
    for (let i = 0; i < 15; i++) {
      const lat = 41.7 + i * 0.001
      const lng = 44.8 + i * 0.001
      companies.push(
        { name: `A-${i}`, address: `Addr ${i}`, lat, lng },
        { name: `B-${i}`, address: `Addr ${i}`, lat, lng }
      )
    }

    mockSupabaseFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: companies, error: null }),
      }),
    }))

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.duplicateCoordinates).toBe(15)
    expect(data.duplicates).toHaveLength(10) // Sliced to 10
  })

  // ---------- DB Error ----------

  it('returns 500 when database query fails', async () => {
    mockSupabaseFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    }))

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  // ---------- Empty data ----------

  it('handles empty companies list', async () => {
    mockSupabaseFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }))

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.totalCompanies).toBe(0)
    expect(data.duplicateCoordinates).toBe(0)
  })
})
