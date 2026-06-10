import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockIngestHistoricalTransactions = vi.fn()
const mockIsBogConfigured = vi.fn()

vi.mock('@/lib/bog/matcher', () => ({
  ingestHistoricalTransactions: (...args: any[]) => mockIngestHistoricalTransactions(...args),
}))

vi.mock('@/lib/bog/client', () => ({
  isBogConfigured: () => mockIsBogConfigured(),
}))

import { GET } from '../../../../app/api/cron/bank-backfill/route'

// --- Helpers ---

function makeRequest(headers: Record<string, string> = {}, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/cron/bank-backfill${query}`, {
    method: 'GET',
    headers,
  })
}

const AUTH = { authorization: 'Bearer test-secret' }

// --- Tests ---

describe('GET /api/cron/bank-backfill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    mockIsBogConfigured.mockReturnValue(true)
  })

  // ---------- Auth ----------

  it('returns 401 when secret is wrong', async () => {
    const res = await GET(
      makeRequest({ authorization: 'Bearer wrong' }, '?from=2025-01-01&to=2025-12-31')
    )
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('authenticates via query param', async () => {
    mockIngestHistoricalTransactions.mockResolvedValue({ fetched: 0 })

    const res = await GET(makeRequest({}, '?secret=test-secret&from=2025-01-01&to=2025-12-31'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  // ---------- BOG not configured ----------

  it('returns 200 with skipped when BOG not configured', async () => {
    mockIsBogConfigured.mockReturnValue(false)

    const res = await GET(makeRequest(AUTH, '?from=2025-01-01&to=2025-12-31'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.skipped).toBe(true)
  })

  // ---------- Validation ----------

  it('returns 400 when from param is missing', async () => {
    const res = await GET(makeRequest(AUTH, '?to=2025-12-31'))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain('Missing required query params')
  })

  it('returns 400 when to param is missing', async () => {
    const res = await GET(makeRequest(AUTH, '?from=2025-01-01'))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain('Missing required query params')
  })

  it('returns 400 when both from and to are missing', async () => {
    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(400)
  })

  // ---------- Success ----------

  it('returns backfill results with date range', async () => {
    const result = { fetched: 100, inserted: 80, matched: 45 }
    mockIngestHistoricalTransactions.mockResolvedValue(result)

    const res = await GET(makeRequest(AUTH, '?from=2025-01-01&to=2025-06-30'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.fetched).toBe(100)
    expect(data.range).toEqual({ from: '2025-01-01', to: '2025-06-30' })
    expect(data.timestamp).toBeDefined()
    expect(mockIngestHistoricalTransactions).toHaveBeenCalledWith('2025-01-01', '2025-06-30')
  })

  // ---------- Error ----------

  it('returns 500 when backfill throws', async () => {
    mockIngestHistoricalTransactions.mockRejectedValue(new Error('Timeout'))

    const res = await GET(makeRequest(AUTH, '?from=2025-01-01&to=2025-12-31'))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Backfill failed')
    expect(data.message).toBe('Timeout')
  })
})
