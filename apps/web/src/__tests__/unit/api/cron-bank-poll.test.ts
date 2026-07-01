import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockIngestTodayTransactions = vi.fn()
const mockIsBogConfigured = vi.fn()

vi.mock('@/lib/bog/matcher', () => ({
  ingestTodayTransactions: (...args: any[]) => mockIngestTodayTransactions(...args),
}))

vi.mock('@/lib/bog/client', () => ({
  isBogConfigured: () => mockIsBogConfigured(),
}))

import { GET } from '../../../../app/api/cron/bank-poll/route'

// --- Helpers ---

function makeRequest(headers: Record<string, string> = {}, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/cron/bank-poll${query}`, {
    method: 'GET',
    headers,
  })
}

// --- Tests ---

describe('GET /api/cron/bank-poll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    mockIsBogConfigured.mockReturnValue(true)
  })

  // ---------- Auth ----------

  it('returns 401 when CRON_SECRET is set and no auth provided', async () => {
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('authenticates via Authorization header', async () => {
    mockIngestTodayTransactions.mockResolvedValue({ fetched: 5, matched: 3 })

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('authenticates via query param secret', async () => {
    mockIngestTodayTransactions.mockResolvedValue({ fetched: 2, matched: 1 })

    const res = await GET(makeRequest({}, '?secret=test-secret'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('allows request when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    mockIngestTodayTransactions.mockResolvedValue({ fetched: 0, matched: 0 })

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  // ---------- BOG not configured ----------

  it('returns 200 with skipped when BOG not configured', async () => {
    mockIsBogConfigured.mockReturnValue(false)

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.skipped).toBe(true)
    expect(data.error).toBe('BOG API not configured')
  })

  // ---------- Success ----------

  it('returns ingestion results on success', async () => {
    const result = { fetched: 10, matched: 7, inserted: 3 }
    mockIngestTodayTransactions.mockResolvedValue(result)

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.fetched).toBe(10)
    expect(data.matched).toBe(7)
    expect(data.timestamp).toBeDefined()
  })

  // ---------- Error ----------

  it('returns 500 when ingestion throws', async () => {
    mockIngestTodayTransactions.mockRejectedValue(new Error('BOG API down'))

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Bank poll failed')
    expect(data.message).toBe('BOG API down')
  })
})
