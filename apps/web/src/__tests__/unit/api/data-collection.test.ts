import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

const mockRequireAuth = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))

import { POST, GET } from '../../../../app/api/data-collection/route'

// --- Helpers ---

function makePostRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/data-collection', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/data-collection', {
    method: 'GET',
  })
}

function validBody(overrides: Record<string, any> = {}) {
  return {
    sk_code: 'SK001',
    company_name: 'Test Company',
    services: 'Fire Safety',
    lat: 41.7151,
    lng: 44.8271,
    ...overrides,
  }
}

const mockSession = { user: { id: 'user-1' } }

// --- Tests ---

describe('POST /api/data-collection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(mockSession)
  })

  // ---------- Auth ----------

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(err)

    const res = await POST(makePostRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  // ---------- Validation ----------

  it('returns 400 when sk_code is empty', async () => {
    const res = await POST(makePostRequest(validBody({ sk_code: '' })))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('returns 400 when lat is out of range', async () => {
    const res = await POST(makePostRequest(validBody({ lat: 100 })))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 400 when lng is out of range', async () => {
    const res = await POST(makePostRequest(validBody({ lng: 200 })))
    const data = await res.json()

    expect(res.status).toBe(400)
  })

  it('returns 400 when company_name is missing', async () => {
    const res = await POST(makePostRequest(validBody({ company_name: '' })))
    const data = await res.json()

    expect(res.status).toBe(400)
  })

  // ---------- No board found ----------

  it('returns 404 when no data_collection board exists', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return {}
    })

    const res = await POST(makePostRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toContain('No data collection board found')
  })

  // ---------- Success ----------

  it('returns 201 with created item on success', async () => {
    const createdItem = { id: 'item-1', name: 'Test Company', data: {}, created_at: '2026-06-09' }

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'board-1' }], error: null }),
          }),
        }
      }
      if (table === 'board_groups') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [{ id: 'group-1' }], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'board_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: createdItem, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await POST(makePostRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.id).toBe('item-1')
  })

  // ---------- Error ----------

  it('returns 500 on unexpected error', async () => {
    mockSupabaseFrom.mockImplementation(() => {
      throw new Error('Connection refused')
    })

    const res = await POST(makePostRequest(validBody()))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('GET /api/data-collection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue(mockSession)
  })

  // ---------- Auth ----------

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(err)

    const res = await GET(makeGetRequest())
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  // ---------- No boards ----------

  it('returns empty array when no data_collection boards exist', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return {}
    })

    const res = await GET(makeGetRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual([])
  })

  // ---------- Success ----------

  it('returns user items from data_collection boards', async () => {
    const items = [
      { id: 'item-1', name: 'Co A', data: {}, created_at: '2026-06-09' },
      { id: 'item-2', name: 'Co B', data: {}, created_at: '2026-06-08' },
    ]

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'board-1' }], error: null }),
          }),
        }
      }
      if (table === 'board_items') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: items, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await GET(makeGetRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].id).toBe('item-1')
  })

  // ---------- Error ----------

  it('returns 500 when db query throws', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'board-1' }], error: null }),
          }),
        }
      }
      if (table === 'board_items') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'query failed' },
                  }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await GET(makeGetRequest())
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
