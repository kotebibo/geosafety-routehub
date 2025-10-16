import { describe, it, expect, beforeAll } from 'vitest'

describe('API Health Check', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  it('should return healthy status', async () => {
    const response = await fetch(`${baseUrl}/api/health`)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.timestamp).toBeDefined()
    expect(data.checks).toBeDefined()
  })

  it('should include all required checks', async () => {
    const response = await fetch(`${baseUrl}/api/health`)
    const data = await response.json()

    expect(data.checks).toHaveProperty('database')
    expect(data.checks).toHaveProperty('authentication')
    expect(data.checks).toHaveProperty('storage')
  })
})
