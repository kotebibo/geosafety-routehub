import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockCreateClient = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}))

import { GET } from '../../../../app/api/cron/keepalive/route'

// --- Helpers ---

function makeRequest(headers: Record<string, string> = {}, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/cron/keepalive${query}`, {
    method: 'GET',
    headers,
  })
}

function mockClient(success: boolean) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() =>
          success
            ? Promise.resolve({ data: [{ id: '1' }], error: null })
            : Promise.resolve({ data: null, error: { message: 'connection refused' } })
        ),
      })),
    })),
  }
}

// --- Tests ---

describe('GET /api/cron/keepalive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://team1.supabase.co'
    process.env.SUPABASE_SERVICE_KEY = 'key1'
    process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2 = 'https://team2.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2 = 'key2'
    process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM3 = 'https://team3.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM3 = 'key3'
  })

  // ---------- Auth ----------

  it('returns 401 when secret is wrong', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer bad' }))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('authenticates via Bearer header', async () => {
    mockCreateClient.mockReturnValue(mockClient(true))

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
  })

  it('authenticates via query param', async () => {
    mockCreateClient.mockReturnValue(mockClient(true))

    const res = await GET(makeRequest({}, '?secret=test-secret'))
    expect(res.status).toBe(200)
  })

  it('allows request when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    mockCreateClient.mockReturnValue(mockClient(true))

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
  })

  // ---------- Success ----------

  it('returns ok status when all instances respond', async () => {
    mockCreateClient.mockReturnValue(mockClient(true))

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(data.results).toHaveLength(3)
    expect(data.results.every((r: any) => r.status === 'ok')).toBe(true)
    expect(data.timestamp).toBeDefined()
  })

  it('returns ok when instances are not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2
    delete process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2
    delete process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM3
    delete process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM3

    mockCreateClient.mockReturnValue(mockClient(true))

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
  })

  // ---------- Degraded ----------

  it('returns degraded status when an instance fails', async () => {
    let callCount = 0
    mockCreateClient.mockImplementation(() => {
      callCount++
      return callCount === 2 ? mockClient(false) : mockClient(true)
    })

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('degraded')
    expect(data.results.some((r: any) => r.status === 'error')).toBe(true)
  })

  it('includes time_ms in results', async () => {
    mockCreateClient.mockReturnValue(mockClient(true))

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }))
    const data = await res.json()

    for (const result of data.results) {
      expect(typeof result.time_ms).toBe('number')
    }
  })
})
