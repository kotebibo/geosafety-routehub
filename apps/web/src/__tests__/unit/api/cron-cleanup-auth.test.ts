import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ rpc: mockRpc }),
}))

import { GET } from '../../../../app/api/cron/cleanup-auth/route'

// --- Helpers ---

function makeRequest(headers: Record<string, string> = {}, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/cron/cleanup-auth${query}`, {
    method: 'GET',
    headers,
  })
}

// --- Tests ---

describe('GET /api/cron/cleanup-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    mockRpc.mockResolvedValue({
      data: [{ deleted_challenges: 3, deleted_rate_limits: 2, deleted_trusted_devices: 1 }],
      error: null,
    })
  })

  // ---------- Auth ----------

  it('returns 401 when secret is wrong', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer bad' }))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('authenticates via Bearer header', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
  })

  it('authenticates via query param', async () => {
    const res = await GET(makeRequest({}, '?secret=test-secret'))
    expect(res.status).toBe(200)
  })

  it('allows request when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
  })

  // ---------- Success ----------

  it('calls cleanup_auth_challenges and reports deletion counts', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('cleanup_auth_challenges')
    expect(data.success).toBe(true)
    expect(data.deletedChallenges).toBe(3)
    expect(data.deletedRateLimits).toBe(2)
    expect(data.deletedTrustedDevices).toBe(1)
    expect(data.timestamp).toBeDefined()
  })

  it('handles a single-row (non-array) rpc payload', async () => {
    mockRpc.mockResolvedValue({
      data: { deleted_challenges: 1, deleted_rate_limits: 0, deleted_trusted_devices: 0 },
      error: null,
    })

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(data.deletedChallenges).toBe(1)
    expect(data.deletedRateLimits).toBe(0)
  })

  it('defaults counts to 0 when rpc returns no rows', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.deletedChallenges).toBe(0)
    expect(data.deletedRateLimits).toBe(0)
    expect(data.deletedTrustedDevices).toBe(0)
  })

  // ---------- Failure ----------

  it('returns 500 when the rpc fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function missing' } })

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Cleanup failed')
  })
})
