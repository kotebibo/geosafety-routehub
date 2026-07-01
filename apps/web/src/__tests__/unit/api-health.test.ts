import { describe, it, expect, vi } from 'vitest'
import { GET } from '../../../app/api/health/route'

// Mock auth middleware
vi.mock('@/middleware/auth', () => ({
  requireAdmin: vi.fn(() => Promise.resolve()),
}))

// Mock server Supabase client
const mockInsert = vi.fn().mockReturnValue({
  then: (cb: any) => cb({ error: null }),
})
const mockFrom = vi.fn((table: string) => {
  if (table === 'health_check_logs') {
    return { insert: mockInsert }
  }
  return {
    select: vi.fn(() => ({
      limit: vi.fn(() => Promise.resolve({ data: [{ id: '1' }], error: null })),
      eq: vi.fn(() => Promise.resolve({ count: 5, error: null })),
      gte: vi.fn(() => Promise.resolve({ count: 2, error: null })),
    })),
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: '1' } }, error: null })),
    },
    storage: {
      listBuckets: vi.fn(() => Promise.resolve({ data: [{ name: 'uploads' }], error: null })),
    },
  })),
}))

// Mock @supabase/supabase-js createClient (for team2/team3 pings)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [{ id: '1' }], error: null })),
      })),
    })),
  })),
}))

describe('Health Check API', () => {
  it('should return healthy status when all checks pass', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.timestamp).toBeDefined()
    expect(Array.isArray(data.checks)).toBe(true)
    expect(data.checks.length).toBeGreaterThan(0)
  })

  it('should include summary counts', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.summary).toBeDefined()
    expect(data.summary.total).toBeGreaterThan(0)
    expect(typeof data.summary.ok).toBe('number')
    expect(typeof data.summary.slow).toBe('number')
    expect(typeof data.summary.failed).toBe('number')
  })
})
