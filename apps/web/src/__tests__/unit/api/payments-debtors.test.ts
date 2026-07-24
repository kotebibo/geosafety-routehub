import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../../../../app/api/payments/debtors/route'
import { DEFAULT_PAYER_CRITERIA } from '@/services/financial-analytics.service'

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
    'neq',
    'gte',
    'lte',
    'range',
    'order',
    'in',
    'is',
    'limit',
    'ilike',
    'maybeSingle',
  ]
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
  createServerClient: vi.fn(() => ({ from: mockFrom })),
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

/** Board fixture: one active contract board, tax-id + monthly columns. */
function seedContractBoard(opts: { responsibleColumn?: boolean; itemData?: Record<string, any> }) {
  mockFromBuilders['workspaces'] = createQueryBuilder({ data: { id: 'ws1' }, error: null })
  mockFromBuilders['boards'] = createQueryBuilder({
    data: [{ id: 'b1', name: 'აქტიური ხელშეკრულებები' }],
    error: null,
  })
  const columns = [
    {
      column_id: 'tax',
      column_name: 'Tax',
      column_name_ka: 'ს/კ',
      column_type: 'text',
      config: null,
    },
    {
      column_id: 'monthly',
      column_name: 'Monthly',
      column_name_ka: 'ყოველთვიური',
      column_type: 'numeric',
      config: null,
    },
  ]
  if (opts.responsibleColumn) {
    columns.push({
      column_id: 'resp',
      column_name: 'Responsible',
      column_name_ka: 'პასუხისმგებელი',
      column_type: 'text',
      config: null,
    })
  }
  mockFromBuilders['board_columns'] = createQueryBuilder({ data: columns, error: null })

  // board_items pagination: first call returns items, subsequent calls empty
  const items = [
    {
      id: 'item-1',
      name: 'შპს ტესტი',
      data: { tax: '123456789', monthly: 500, ...opts.itemData },
    },
  ]
  mockFromBuilders['board_items'] = createQueryBuilder({ data: items, error: null })
}

describe('Payments Debtors API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminOrDispatcher.mockResolvedValue({ session: { user: { id: 'u1' } } })
    mockFromBuilders = {}
  })

  it('returns 401 when not authenticated', async () => {
    const err = new Error('Authentication required')
    err.name = 'UnauthorizedError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await GET(makeRequest('/api/payments/debtors'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin/dispatcher', async () => {
    const err = new Error('Forbidden')
    err.name = 'ForbiddenError'
    mockRequireAdminOrDispatcher.mockRejectedValue(err)

    const res = await GET(makeRequest('/api/payments/debtors'))
    expect(res.status).toBe(403)
  })

  it('rejects an out-of-range months_back', async () => {
    const res = await GET(makeRequest('/api/payments/debtors?months_back=99'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Validation failed')
  })

  it('uses default criteria when none are stored', async () => {
    seedContractBoard({})
    const res = await GET(makeRequest('/api/payments/debtors?months_back=6'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.criteria).toEqual(DEFAULT_PAYER_CRITERIA)
  })

  it('falls back to defaults on malformed stored criteria', async () => {
    seedContractBoard({})
    mockFromBuilders['app_settings'] = createQueryBuilder({
      data: { value: 'not-json{' },
      error: null,
    })

    const res = await GET(makeRequest('/api/payments/debtors?months_back=6'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.criteria).toEqual(DEFAULT_PAYER_CRITERIA)
  })

  it('computes summary, aging and category for a debtor', async () => {
    seedContractBoard({})
    const today = new Date().toISOString().slice(0, 10)
    mockFromBuilders['bank_transactions'] = createQueryBuilder({
      data: [
        {
          sender_inn: '123456789',
          sender_name: 'შპს ტესტი',
          amount: 500,
          entry_date: today,
          status: 'matched',
        },
      ],
      error: null,
    })

    const res = await GET(makeRequest('/api/payments/debtors?months_back=6'))
    const body = await res.json()

    expect(res.status).toBe(200)
    // 6 months × 500 expected, 500 paid
    expect(body.summary.total_expected).toBe(3000)
    expect(body.summary.total_paid).toBe(500)
    expect(body.summary.difference).toBe(-2500)
    expect(body.summary.total_outstanding).toBe(2500)
    expect(body.summary.debtor_count).toBe(1)
    expect(body.by_month).toHaveLength(6)

    const debtor = body.debtors[0]
    expect(debtor.tax_id).toBe('123456789')
    expect(debtor.outstanding).toBe(2500)
    expect(debtor.unpaid_months).toBe(5)
    // earliest unpaid month is 5 months back → far past the bad threshold
    expect(debtor.months_overdue).toBeGreaterThanOrEqual(DEFAULT_PAYER_CRITERIA.bad_months_overdue)
    expect(debtor.category).toBe('bad')
    expect(debtor.contracts).toEqual([
      {
        item_id: 'item-1',
        board_id: 'b1',
        board_name: 'აქტიური ხელშეკრულებები',
        contract_source: 'active',
      },
    ])
  })

  it('reads the responsible person from the board column', async () => {
    seedContractBoard({ responsibleColumn: true, itemData: { resp: 'ლაშა' } })

    const res = await GET(makeRequest('/api/payments/debtors?months_back=6'))
    const body = await res.json()

    expect(body.debtors[0].responsible).toBe('ლაშა')
  })

  it('resolves a person-column user id to a name via public.users', async () => {
    const userId = '11111111-2222-3333-4444-555555555555'
    seedContractBoard({ responsibleColumn: true, itemData: { resp: userId } })
    mockFromBuilders['users'] = createQueryBuilder({
      data: [{ id: userId, full_name: 'ნინო მენეჯერი' }],
      error: null,
    })

    const res = await GET(makeRequest('/api/payments/debtors?months_back=6'))
    const body = await res.json()

    expect(body.debtors[0].responsible).toBe('ნინო მენეჯერი')
  })

  it('falls back to companies.sales_manager when the board has no responsible', async () => {
    seedContractBoard({})
    mockFromBuilders['companies'] = createQueryBuilder({
      data: [{ tax_id: '123456789', sales_manager: 'გიორგი' }],
      error: null,
    })

    const res = await GET(makeRequest('/api/payments/debtors?months_back=6'))
    const body = await res.json()

    expect(body.debtors[0].responsible).toBe('გიორგი')
  })
})
