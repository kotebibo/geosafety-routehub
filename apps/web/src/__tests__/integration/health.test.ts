import { describe, it, expect } from 'vitest'

// Integration test — requires a running dev server
// Skipped by default; run with INTEGRATION=1 to enable
const runIntegration = process.env.INTEGRATION === '1'

describe.skipIf(!runIntegration)('API Health Check (integration)', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  it('should return healthy status', async () => {
    const response = await fetch(`${baseUrl}/api/health`)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.timestamp).toBeDefined()
    expect(data.checks).toBeDefined()
    expect(Array.isArray(data.checks)).toBe(true)
  })

  it('should include summary counts', async () => {
    const response = await fetch(`${baseUrl}/api/health`)
    const data = await response.json()

    expect(data.summary).toBeDefined()
    expect(data.summary.total).toBeGreaterThan(0)
    expect(typeof data.summary.ok).toBe('number')
    expect(typeof data.summary.slow).toBe('number')
    expect(typeof data.summary.failed).toBe('number')
  })
})
