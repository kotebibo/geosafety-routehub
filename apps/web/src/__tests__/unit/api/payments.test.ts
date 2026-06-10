import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../../../../app/api/payments/route'

// --- Mocks ---

const mockSession = { user: { id: 'user-123' } }

const mockRequireAdminOrDispatcher = vi.fn()
const mockRequireAdmin = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAdminOrDispatcher: (...args: any[]) => mockRequireAdminOrDispatcher(...args),
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// Chainable Supabase query builder
function createQueryBuilder(resolvedValue: { data: any; error: any; count?: number }) {
  const builder: any = {}
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
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
  // Make the builder thenable so `await query` resolves
  builder.then = (resolve: any) => resolve(resolvedValue)
  return builder
}

let mockFromBuilders: Record<string, any> = {}

const mockFrom = vi.fn((table: string) => {
  if (mockFromBuilders[table]) return mockFromBuilders[table]
  return createQueryBuilder({ data: [], error: null, count: 0 })
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// --- Helpers ---

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

// --- Tests ---

describe('Payments API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminOrDispatcher.mockResolvedValue({ session: mockSession })
    mockFromBuilders = {}
  })

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await GET(makeRequest('/api/payments'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Authentication required')
  })

  it('returns 403 when not admin/dispatcher', async () => {
    const err = new Error('Admin access required')
    err.name = 'ForbiddenError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await GET(makeRequest('/api/payments'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns transactions with pagination on success', async () => {
    const transactions = [
      { id: '1', amount: 100, status: 'matched' },
      { id: '2', amount: 200, status: 'unmatched' },
    ]
    mockFromBuilders['bank_transactions'] = createQueryBuilder({
      data: transactions,
      error: null,
      count: 2,
    })

    const res = await GET(makeRequest('/api/payments'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.transactions).toEqual(transactions)
    expect(body.total).toBe(2)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(50)
  })

  it('applies status filter', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 })
    mockFromBuilders['bank_transactions'] = builder

    await GET(makeRequest('/api/payments?status=matched'))

    expect(builder.eq).toHaveBeenCalledWith('status', 'matched')
  })

  it('applies companyId filter', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 })
    mockFromBuilders['bank_transactions'] = builder

    await GET(makeRequest('/api/payments?companyId=abc-123'))

    expect(builder.eq).toHaveBeenCalledWith('matched_company_id', 'abc-123')
  })

  it('applies date range filters', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 })
    mockFromBuilders['bank_transactions'] = builder

    await GET(makeRequest('/api/payments?from=2024-01-01&to=2024-12-31'))

    expect(builder.gte).toHaveBeenCalledWith('entry_date', '2024-01-01')
    expect(builder.lte).toHaveBeenCalledWith('entry_date', '2024-12-31')
  })

  it('applies search filter with OR clause', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 })
    mockFromBuilders['bank_transactions'] = builder

    await GET(makeRequest('/api/payments?search=test'))

    expect(builder.or).toHaveBeenCalledWith(
      'sender_name.ilike.%test%,sender_inn.ilike.%test%,purpose.ilike.%test%,doc_key.ilike.%test%'
    )
  })

  it('applies matchSource filter', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 })
    mockFromBuilders['bank_transactions'] = builder

    await GET(makeRequest('/api/payments?matchSource=active'))

    expect(builder.eq).toHaveBeenCalledWith('match_source', 'active')
  })

  it('calculates pagination offset from page param', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 })
    mockFromBuilders['bank_transactions'] = builder

    await GET(makeRequest('/api/payments?page=3&limit=20'))

    expect(builder.range).toHaveBeenCalledWith(40, 59)
  })

  it('returns 500 on database error', async () => {
    mockFromBuilders['bank_transactions'] = createQueryBuilder({
      data: null,
      error: new Error('DB error'),
      count: null,
    })

    const res = await GET(makeRequest('/api/payments'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })
})

describe('Payments API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ session: mockSession })
    mockFromBuilders = {}
  })

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAdmin.mockRejectedValue(err)

    const res = await POST(
      makeRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          action: 'ignore',
          transactionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Authentication required')
  })

  it('returns 403 when not admin', async () => {
    const err = new Error('Admin access required')
    err.name = 'ForbiddenError'
    mockRequireAdmin.mockRejectedValue(err)

    const res = await POST(
      makeRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          action: 'ignore',
          transactionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns 400 on validation failure (invalid action)', async () => {
    const res = await POST(
      makeRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid', transactionId: 'not-uuid' }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('returns 400 when match action is missing companyId', async () => {
    const txnBuilder = createQueryBuilder({ data: null, error: null })
    const matchBuilder = createQueryBuilder({ data: null, error: null })
    mockFromBuilders['bank_transactions'] = txnBuilder
    mockFromBuilders['payment_matches'] = matchBuilder

    const res = await POST(
      makeRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          action: 'match',
          transactionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('companyId is required for match action')
  })

  it('successfully matches a transaction', async () => {
    const txnBuilder = createQueryBuilder({ data: null, error: null })
    const matchBuilder = createQueryBuilder({ data: null, error: null })
    mockFromBuilders['bank_transactions'] = txnBuilder
    mockFromBuilders['payment_matches'] = matchBuilder

    const res = await POST(
      makeRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          action: 'match',
          transactionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          companyId: 'b1ffcd88-8b1a-4df7-aa5c-5aa8ac270b22',
          notes: 'Manual match',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.action).toBe('matched')

    // Verify update was called
    expect(txnBuilder.update).toHaveBeenCalledWith({
      matched_company_id: 'b1ffcd88-8b1a-4df7-aa5c-5aa8ac270b22',
      match_method: 'manual',
      match_confidence: 1.0,
      status: 'matched',
    })

    // Verify audit trail was created
    expect(matchBuilder.insert).toHaveBeenCalledWith({
      transaction_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      company_id: 'b1ffcd88-8b1a-4df7-aa5c-5aa8ac270b22',
      matched_by: 'user-123',
      match_method: 'manual',
      confidence: 1.0,
      notes: 'Manual match',
    })
  })

  it('successfully ignores a transaction', async () => {
    const txnBuilder = createQueryBuilder({ data: null, error: null })
    mockFromBuilders['bank_transactions'] = txnBuilder

    const res = await POST(
      makeRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          action: 'ignore',
          transactionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.action).toBe('ignored')
    expect(txnBuilder.update).toHaveBeenCalledWith({ status: 'ignored' })
  })

  it('returns 500 on database error during match', async () => {
    mockFromBuilders['bank_transactions'] = createQueryBuilder({
      data: null,
      error: new Error('DB error'),
    })

    const res = await POST(
      makeRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          action: 'match',
          transactionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          companyId: 'b1ffcd88-8b1a-4df7-aa5c-5aa8ac270b22',
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })
})
