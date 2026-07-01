import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../../../app/api/payments/unmatched/route'

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

describe('Unmatched Payments API - GET', () => {
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

  it('returns empty array when no unmatched transactions', async () => {
    mockFromResults['bank_transactions'] = [{ data: [], error: null }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns unmatched transactions with tax ID suggestions', async () => {
    const unmatched = [{ id: 'txn1', sender_inn: '12345', sender_name: 'Acme Corp', amount: 500 }]
    const companies = [
      { id: 'co1', name: 'Acme Corporation', tax_id: '12345' },
      { id: 'co2', name: 'Other Inc', tax_id: '99999' },
    ]

    mockFromResults['bank_transactions'] = [{ data: unmatched, error: null }]
    mockFromResults['companies'] = [{ data: companies, error: null }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('txn1')
    expect(body[0].suggested_companies).toHaveLength(1)
    expect(body[0].suggested_companies[0].company_id).toBe('co1')
    expect(body[0].suggested_companies[0].confidence).toBe(1.0)
    expect(body[0].suggested_companies[0].reason).toBe('Tax ID exact match')
  })

  it('falls back to name similarity when no tax ID match', async () => {
    const unmatched = [{ id: 'txn1', sender_inn: null, sender_name: 'Acme Corp', amount: 500 }]
    const companies = [
      { id: 'co1', name: 'Acme Corporation', tax_id: '12345' },
      { id: 'co2', name: 'Totally Different Company', tax_id: '99999' },
    ]

    mockFromResults['bank_transactions'] = [{ data: unmatched, error: null }]
    mockFromResults['companies'] = [{ data: companies, error: null }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    // Acme Corp should match Acme Corporation by name similarity
    const suggestions = body[0].suggested_companies
    expect(suggestions.length).toBeGreaterThanOrEqual(1)
    expect(suggestions[0].reason).toBe('Name similarity')
    expect(suggestions[0].confidence).toBeGreaterThan(0.2)
  })

  it('returns no suggestions when no match found', async () => {
    const unmatched = [{ id: 'txn1', sender_inn: null, sender_name: 'X', amount: 100 }]
    const companies = [{ id: 'co1', name: 'Completely Different Long Name', tax_id: '12345' }]

    mockFromResults['bank_transactions'] = [{ data: unmatched, error: null }]
    mockFromResults['companies'] = [{ data: companies, error: null }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body[0].suggested_companies).toHaveLength(0)
  })

  it('returns 500 on database error', async () => {
    mockFromResults['bank_transactions'] = [{ data: null, error: new Error('DB error') }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })

  it('handles null companies list gracefully', async () => {
    const unmatched = [{ id: 'txn1', sender_inn: '12345', sender_name: 'Acme', amount: 500 }]

    mockFromResults['bank_transactions'] = [{ data: unmatched, error: null }]
    mockFromResults['companies'] = [{ data: null, error: null }]

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].suggested_companies).toHaveLength(0)
  })
})
