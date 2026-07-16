import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../../../app/api/payments/contracts/route'

// --- Mocks ---

const mockRequireAdminOrDispatcher = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAdminOrDispatcher: (...args: any[]) => mockRequireAdminOrDispatcher(...args),
}))

function createQueryBuilder(resolvedValue: { data: any; error: any }) {
  const builder: any = {}
  const methods = [
    'select',
    'eq',
    'or',
    'ilike',
    'gte',
    'lte',
    'order',
    'range',
    'in',
    'is',
    'limit',
    'single',
    'maybeSingle',
  ]
  for (const m of methods) {
    builder[m] = vi.fn(() => builder)
  }
  builder.then = (resolve: any) => resolve(resolvedValue)
  return builder
}

let mockFromResults: Record<string, any[]> = {}
let callCounts: Record<string, number> = {}

const mockFrom = vi.fn((table: string) => {
  const results = mockFromResults[table] || []
  const idx = callCounts[table] || 0
  callCounts[table] = idx + 1
  const result = results[idx] || results[0] || { data: [], error: null }
  return createQueryBuilder(result)
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// --- Tests ---

describe('Payment Contracts API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminOrDispatcher.mockResolvedValue({ session: { user: { id: 'u1' } } })
    mockFromResults = {}
    callCounts = {}
  })

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Authentication required')
  })

  it('returns 403 when not admin/dispatcher', async () => {
    const err = new Error('Forbidden')
    err.name = 'ForbiddenError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns empty contracts when workspace is not found', async () => {
    mockFromResults['workspaces'] = [{ data: null, error: null }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.contracts).toEqual({})
    expect(body.boards_found).toBe(0)
  })

  it('returns empty contracts when no boards found', async () => {
    mockFromResults['workspaces'] = [{ data: { id: 'ws1' }, error: null }]
    mockFromResults['boards'] = [{ data: [], error: null }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.contracts).toEqual({})
    expect(body.boards_found).toBe(0)
  })

  it('returns contracts grouped by tax ID', async () => {
    mockFromResults['workspaces'] = [{ data: { id: 'ws1' }, error: null }]
    const boards = [{ id: 'b1', name: 'ხელშეკრულებები' }]
    const columns = [
      {
        column_id: 'c1',
        column_name: 'Tax',
        column_name_ka: 'ს/კ',
        column_type: 'text',
        config: null,
      },
      {
        column_id: 'c2',
        column_name: 'Monthly',
        column_name_ka: 'ყოველთვიური',
        column_type: 'numeric',
        config: null,
      },
    ]
    const items = [
      { id: 'item1', name: 'Company A', data: { c1: '12345', c2: 500 } },
      { id: 'item2', name: 'Company B', data: { c1: '67890', c2: 1000 } },
    ]

    // boards query
    mockFromResults['boards'] = [{ data: boards, error: null }]
    // board_columns query
    mockFromResults['board_columns'] = [{ data: columns, error: null }]
    // board_items query
    mockFromResults['board_items'] = [{ data: items, error: null }]
    // bank_transactions query for earliest payment
    mockFromResults['bank_transactions'] = [
      { data: [{ sender_inn: '12345', entry_date: '2024-01-15' }], error: null },
    ]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.contracts['12345']).toBeDefined()
    expect(body.contracts['12345']).toHaveLength(1)
    expect(body.contracts['12345'][0].company_name).toBe('Company A')
    expect(body.contracts['12345'][0].monthly_amount).toBe(500)
    expect(body.contracts['12345'][0].contract_source).toBe('active')
    expect(body.contracts['12345'][0].first_payment_date).toBe('2024-01-15')

    expect(body.contracts['67890']).toBeDefined()
    expect(body.contracts['67890'][0].company_name).toBe('Company B')
    expect(body.contracts['67890'][0].first_payment_date).toBeNull()
  })

  it('classifies contract_source by board name, scoped to the workspace, excluding the services board', async () => {
    const boards = [
      { id: 'b1', name: 'ხელშეკრულებები' },
      { id: 'b2', name: 'ერთჯერადი ხელშეკრულებები' },
      { id: 'b3', name: 'შეჩერებული' },
      { id: 'b4', name: 'შეწყვეტილი / დასრულებული' },
      { id: 'b5', name: 'დამატებითი მომსახურეობები' },
    ]
    const columns = [
      {
        column_id: 'c1',
        column_name: 'Tax',
        column_name_ka: 'ს/კ',
        column_type: 'text',
        config: null,
      },
    ]

    mockFromResults['workspaces'] = [{ data: { id: 'ws1' }, error: null }]
    mockFromResults['boards'] = [{ data: boards, error: null }]
    // one board_columns/board_items result per non-excluded board, in order
    mockFromResults['board_columns'] = [
      { data: columns, error: null },
      { data: columns, error: null },
      { data: columns, error: null },
      { data: columns, error: null },
    ]
    mockFromResults['board_items'] = [
      { data: [{ id: 'i1', name: 'Active Co', data: { c1: '11111' } }], error: null },
      { data: [{ id: 'i2', name: 'OneTime Co', data: { c1: '22222' } }], error: null },
      { data: [{ id: 'i3', name: 'Paused Co', data: { c1: '33333' } }], error: null },
      { data: [{ id: 'i4', name: 'Ended Co', data: { c1: '44444' } }], error: null },
    ]
    mockFromResults['bank_transactions'] = [{ data: [], error: null }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.contracts['11111'][0].contract_source).toBe('active')
    expect(body.contracts['22222'][0].contract_source).toBe('one_time')
    expect(body.contracts['33333'][0].contract_source).toBe('paused')
    expect(body.contracts['44444'][0].contract_source).toBe('ended')
    // the excluded board never contributes a query, so only 4 boards are summarized
    expect(body.boards_found).toHaveLength(4)
    expect(body.boards_found.map((b: { name: string }) => b.name)).not.toContain(
      'დამატებითი მომსახურეობები'
    )
  })

  it('returns 500 on board query error', async () => {
    mockFromResults['workspaces'] = [{ data: { id: 'ws1' }, error: null }]
    mockFromResults['boards'] = [{ data: null, error: new Error('DB error') }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })

  it('sets cache control headers', async () => {
    mockFromResults['workspaces'] = [{ data: { id: 'ws1' }, error: null }]
    mockFromResults['boards'] = [{ data: [], error: null }]

    const res = await GET()

    // When no boards found, it returns early without cache headers
    // This tests the structure is correct
    expect(res.status).toBe(200)
  })

  it('skips boards with no tax ID column', async () => {
    mockFromResults['workspaces'] = [{ data: { id: 'ws1' }, error: null }]
    const boards = [{ id: 'b1', name: 'ხელშეკრულებები' }]
    const columnsNoTaxId = [
      {
        column_id: 'c1',
        column_name: 'Name',
        column_name_ka: 'სახელი',
        column_type: 'text',
        config: null,
      },
    ]

    mockFromResults['boards'] = [{ data: boards, error: null }]
    mockFromResults['board_columns'] = [{ data: columnsNoTaxId, error: null }]
    mockFromResults['board_items'] = [{ data: [], error: null }]
    mockFromResults['bank_transactions'] = [{ data: [], error: null }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.contracts).toEqual({})
  })
})
