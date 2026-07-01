import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockSupabaseFrom = vi.fn()
const mockSupabaseRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}))

const mockSendEmail = vi.fn()

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}))

import { GET } from '../../../../app/api/cron/contract-expiry-alerts/route'

// --- Helpers ---

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/cron/contract-expiry-alerts', {
    method: 'GET',
    headers,
  })
}

const AUTH = { authorization: 'Bearer test-secret' }

function setupBoardMock(boardId: string | null) {
  // Track call order for from()
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'boards') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: boardId ? { id: boardId } : null,
              error: null,
            }),
          }),
        }),
      }
    }
    return defaultTableMock(table)
  })
}

function defaultTableMock(table: string) {
  if (table === 'board_items') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    }
  }
  if (table === 'user_roles') {
    return {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }
  }
  if (table === 'users') {
    return {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }
  }
  return {}
}

// --- Tests ---

describe('GET /api/cron/contract-expiry-alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    mockSendEmail.mockResolvedValue(undefined)
  })

  // ---------- Auth ----------

  it('returns 401 when secret is wrong', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong' }))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 401 when no authorization header is provided', async () => {
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(401)
  })

  it('allows request when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    setupBoardMock(null)

    const res = await GET(makeRequest())
    const data = await res.json()

    // Should not be 401 - proceeds to logic
    expect(res.status).toBe(200)
  })

  // ---------- Board not found ----------

  it('returns message when board is not found', async () => {
    setupBoardMock(null)

    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toContain('board not found')
  })

  // ---------- No alerts ----------

  it('returns no alerts message when no contracts match thresholds', async () => {
    // Items with end_date far in the future
    const items = [{ id: '1', name: 'Company A', data: { end_date: '2030-01-01' } }]

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'board-1' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'board_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: items, error: null }),
              }),
            }),
          }),
        }
      }
      return defaultTableMock(table)
    })

    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toContain('No contracts hitting alert thresholds')
    expect(data.checked).toBe(1)
  })

  // ---------- No admin users ----------

  it('returns message when no admin/dispatcher users to notify', async () => {
    // Create an item that expires exactly today (0 days)
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const items = [{ id: '1', name: 'Expired Co', data: { end_date: todayStr, act_amount: 1000 } }]

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'board-1' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'board_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: items, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return defaultTableMock(table)
    })

    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toContain('No admin/dispatcher users')
  })

  // ---------- Success with alerts ----------

  it('sends notifications and emails when contracts hit thresholds', async () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const items = [
      { id: 'item-1', name: 'Expired Corp', data: { end_date: todayStr, act_amount: 5000 } },
    ]
    const adminRoles = [{ user_id: 'admin-1', role: 'admin' }]
    const users = [{ id: 'admin-1', email: 'admin@test.com', full_name: 'Admin' }]

    mockSupabaseRpc.mockResolvedValue({ error: null })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'board-1' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'board_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: items, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: adminRoles, error: null }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: users, error: null }),
          }),
        }
      }
      return {}
    })

    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.alerts).toBe(1)
    expect(data.notifications).toBe(1)
    expect(data.emails_sent_to).toBe(1)
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })

  // ---------- Error ----------

  it('returns 500 when db query throws', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'board-1' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'board_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toContain('Failed to process')
  })
})
