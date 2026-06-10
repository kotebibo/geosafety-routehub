import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockReconcileUnmatched = vi.fn()
const mockIsBogConfigured = vi.fn()

vi.mock('@/lib/bog/matcher', () => ({
  reconcileUnmatched: (...args: any[]) => mockReconcileUnmatched(...args),
}))

vi.mock('@/lib/bog/client', () => ({
  isBogConfigured: () => mockIsBogConfigured(),
}))

import { GET } from '../../../../app/api/cron/bank-reconcile/route'

// --- Helpers ---

function makeRequest(headers: Record<string, string> = {}, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/cron/bank-reconcile${query}`, {
    method: 'GET',
    headers,
  })
}

const AUTH = { authorization: 'Bearer test-secret' }

// --- Tests ---

describe('GET /api/cron/bank-reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    mockIsBogConfigured.mockReturnValue(true)
  })

  // ---------- Auth ----------

  it('returns 401 when secret is missing', async () => {
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 401 when secret is wrong', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer bad' }))
    const data = await res.json()

    expect(res.status).toBe(401)
  })

  it('authenticates via query param', async () => {
    mockReconcileUnmatched.mockResolvedValue({ matched: 0, remaining: 0 })

    const res = await GET(makeRequest({}, '?secret=test-secret'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  // ---------- BOG not configured ----------

  it('returns 200 with skipped when BOG not configured', async () => {
    mockIsBogConfigured.mockReturnValue(false)

    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.skipped).toBe(true)
    expect(data.error).toBe('BOG API not configured')
  })

  // ---------- Success ----------

  it('returns reconciliation results on success', async () => {
    const result = { matched: 12, remaining: 5, total: 17 }
    mockReconcileUnmatched.mockResolvedValue(result)

    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.matched).toBe(12)
    expect(data.remaining).toBe(5)
    expect(data.timestamp).toBeDefined()
  })

  // ---------- Error ----------

  it('returns 500 when reconciliation throws', async () => {
    mockReconcileUnmatched.mockRejectedValue(new Error('DB connection lost'))

    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Reconciliation failed')
    expect(data.message).toBe('DB connection lost')
  })
})
