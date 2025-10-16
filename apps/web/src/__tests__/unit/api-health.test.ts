import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/health/route'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [{ id: '1' }], error: null }))
      }))
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ error: null }))
    },
    storage: {
      listBuckets: vi.fn(() => Promise.resolve({ error: null }))
    }
  }
}))

describe('Health Check API', () => {
  it('should return healthy status when all checks pass', async () => {
    const response = await GET()
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.checks.database).toBe(true)
    expect(data.checks.authentication).toBe(true)
  })

  it('should include timestamp and environment', async () => {
    const response = await GET()
    const data = await response.json()
    
    expect(data.timestamp).toBeDefined()
    expect(data.environment).toBeDefined()
    expect(data.uptime).toBeDefined()
    expect(data.memory).toBeDefined()
  })
})
