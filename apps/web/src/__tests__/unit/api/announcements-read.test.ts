import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth middleware
const mockRequireAuth = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))

// Mock Supabase
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { POST } from '../../../../app/api/announcements/[id]/read/route'

const params = { id: 'ann-123' }

function createRequest(): NextRequest {
  return new NextRequest('http://localhost/api/announcements/ann-123/read', {
    method: 'POST',
  })
}

describe('POST /api/announcements/[id]/read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const authError = new Error('Authentication required')
    authError.name = 'UnauthorizedError'
    mockRequireAuth.mockRejectedValue(authError)

    const request = createRequest()
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should mark announcement as read successfully', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })

    const request = createRequest()
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('announcement_reads')
  })

  it('should upsert with correct conflict resolution', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ upsert: mockUpsert })

    const request = createRequest()
    await POST(request, { params })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        announcement_id: 'ann-123',
        user_id: 'user-1',
      }),
      { onConflict: 'announcement_id,user_id' }
    )
  })

  it('should return 500 on database error', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    })

    const request = createRequest()
    const response = await POST(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
