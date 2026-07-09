import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../../../../app/api/payments/stats/route'

// --- Mocks ---

const mockRequireAdminOrDispatcher = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAdminOrDispatcher: (...args: any[]) => mockRequireAdminOrDispatcher(...args),
}))

const mockRpc = vi.fn()

function createQueryBuilder(resolvedValue: { data: any; error: any }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'gte', 'lte', 'range', 'order', 'in', 'is', 'limit']
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
    rpc: mockRpc,
  })),
}))

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

// --- Tests ---

describe('Payment Stats API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminOrDispatcher.mockResolvedValue({ session: { user: { id: 'u1' } } })
    mockFromBuilders = {}
  })

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await GET(makeRequest('/api/payments/stats'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Authentication required')
  })

  it('returns 403 when not admin/dispatcher', async () => {
    const err = new Error('Forbidden')
    err.name = 'ForbiddenError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await GET(makeRequest('/api/payments/stats'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns RPC result when available', async () => {
    const rpcResult = {
      total_transactions: 100,
      total_amount: 50000,
      matched_count: 80,
      unmatched_count: 20,
      match_rate: 80,
    }
    mockRpc.mockResolvedValue({ data: rpcResult, error: null })

    const res = await GET(makeRequest('/api/payments/stats'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(rpcResult)
    expect(mockRpc).toHaveBeenCalledWith('get_payment_stats', {
      p_from_date: null,
      p_to_date: null,
      p_match_source: null,
    })
  })

  it('passes date range params to RPC', async () => {
    mockRpc.mockResolvedValue({ data: { total: 1 }, error: null })

    await GET(makeRequest('/api/payments/stats?from=2024-01-01&to=2024-06-30&matchSource=active'))

    expect(mockRpc).toHaveBeenCalledWith('get_payment_stats', {
      p_from_date: '2024-01-01',
      p_to_date: '2024-06-30',
      p_match_source: 'active',
    })
  })

  it('falls back to client-side aggregation when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC not found') })

    const txns = [
      { status: 'matched', amount: 100 },
      { status: 'matched', amount: 200 },
      { status: 'unmatched', amount: 50 },
      { status: 'ignored', amount: 25 },
    ]
    mockFromBuilders['bank_transactions'] = createQueryBuilder({ data: txns, error: null })

    const res = await GET(makeRequest('/api/payments/stats'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.total_transactions).toBe(4)
    expect(body.total_amount).toBe(375)
    expect(body.matched_count).toBe(2)
    expect(body.matched_amount).toBe(300)
    expect(body.unmatched_count).toBe(1)
    expect(body.unmatched_amount).toBe(50)
    expect(body.ignored_count).toBe(1)
    expect(body.match_rate).toBe(50)
  })

  it('returns zero stats when no transactions exist (fallback)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('no rpc') })
    mockFromBuilders['bank_transactions'] = createQueryBuilder({ data: [], error: null })

    const res = await GET(makeRequest('/api/payments/stats'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.total_transactions).toBe(0)
    expect(body.total_amount).toBe(0)
    expect(body.match_rate).toBe(0)
  })

  it('returns 500 on database error in fallback', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('no rpc') })
    mockFromBuilders['bank_transactions'] = createQueryBuilder({
      data: null,
      error: new Error('DB error'),
    })

    const res = await GET(makeRequest('/api/payments/stats'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })
})
