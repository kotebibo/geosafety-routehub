import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---

const mockReconcileUnmatched = vi.fn()
const mockIsBogConfigured = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockSupabaseRpc = vi.fn()
const mockSendEmail = vi.fn()

vi.mock('@/lib/bog/matcher', () => ({
  reconcileUnmatched: (...args: any[]) => mockReconcileUnmatched(...args),
}))

vi.mock('@/lib/bog/client', () => ({
  isBogConfigured: () => mockIsBogConfigured(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
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

/**
 * Configures the bank_transactions/notifications/user_roles/users table mocks.
 * Defaults to a "just ingested" transaction so the staleness check is a no-op
 * unless a test overrides `latestTransactionAt`.
 */
function setupStaleCheckMocks(
  opts: {
    latestTransactionAt?: string | null
    existingAlertToday?: boolean
    adminRoles?: { user_id: string }[]
    users?: { id: string; email: string }[]
  } = {}
) {
  const latestTransactionAt =
    opts.latestTransactionAt === undefined ? new Date().toISOString() : opts.latestTransactionAt
  const existingAlertToday = opts.existingAlertToday ?? false
  const adminRoles = opts.adminRoles ?? [{ user_id: 'admin-1' }]
  const users = opts.users ?? [{ id: 'admin-1', email: 'admin@test.com' }]

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'bank_transactions') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: latestTransactionAt ? { created_at: latestTransactionAt } : null,
                error: null,
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'notifications') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: existingAlertToday ? { id: 'notif-1' } : null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'user_roles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: adminRoles, error: null }),
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
}

// --- Tests ---

describe('GET /api/cron/bank-reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    mockIsBogConfigured.mockReturnValue(true)
    mockSupabaseRpc.mockResolvedValue({ error: null })
    mockSendEmail.mockResolvedValue(true)
    setupStaleCheckMocks()
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
    expect(data.staleCheck.stale).toBe(false)
  })

  it('still runs the staleness check when BOG is not configured', async () => {
    mockIsBogConfigured.mockReturnValue(false)
    setupStaleCheckMocks({ latestTransactionAt: null })

    const res = await GET(makeRequest(AUTH))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.staleCheck.stale).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledOnce()
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
    expect(data.staleCheck.stale).toBe(false)
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

  // ---------- Staleness check ----------

  describe('bank ingestion staleness alert', () => {
    beforeEach(() => {
      mockReconcileUnmatched.mockResolvedValue({ matched: 0, remaining: 0 })
    })

    it('does not alert when the latest transaction is recent', async () => {
      setupStaleCheckMocks({ latestTransactionAt: new Date().toISOString() })

      const res = await GET(makeRequest(AUTH))
      const data = await res.json()

      expect(data.staleCheck).toEqual({ stale: false })
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('treats an empty bank_transactions table as stale', async () => {
      setupStaleCheckMocks({ latestTransactionAt: null })

      const res = await GET(makeRequest(AUTH))
      const data = await res.json()

      expect(data.staleCheck.stale).toBe(true)
      expect(data.staleCheck.alreadyAlertedToday).toBe(false)
      expect(mockSendEmail).toHaveBeenCalledOnce()
      expect(mockSendEmail.mock.calls[0][0].to).toEqual(['admin@test.com'])
    })

    it('fires when stale using a lowered threshold for testing', async () => {
      // A transaction from 2 hours ago is "stale" once we require e.g. 5 business days,
      // but the real trigger for manual testing is the staleBusinessDays override going to 0.
      const recentButWithinCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      setupStaleCheckMocks({ latestTransactionAt: recentButWithinCutoff })

      const res = await GET(makeRequest(AUTH, '?staleBusinessDays=0'))
      const data = await res.json()

      expect(data.staleCheck.stale).toBe(true)
      expect(mockSendEmail).toHaveBeenCalledOnce()
    })

    it('does not send a second email the same day (dedup guard)', async () => {
      setupStaleCheckMocks({ latestTransactionAt: null, existingAlertToday: true })

      const res = await GET(makeRequest(AUTH))
      const data = await res.json()

      expect(data.staleCheck).toEqual({ stale: true, alreadyAlertedToday: true })
      expect(mockSendEmail).not.toHaveBeenCalled()
      expect(mockSupabaseRpc).not.toHaveBeenCalled()
    })

    it('creates one notification per admin and emails all admins when stale', async () => {
      setupStaleCheckMocks({
        latestTransactionAt: null,
        adminRoles: [{ user_id: 'admin-1' }, { user_id: 'admin-2' }],
        users: [
          { id: 'admin-1', email: 'admin1@test.com' },
          { id: 'admin-2', email: 'admin2@test.com' },
        ],
      })

      const res = await GET(makeRequest(AUTH))
      const data = await res.json()

      expect(data.staleCheck.emailsSent).toBe(2)
      expect(mockSupabaseRpc).toHaveBeenCalledTimes(2)
      expect(mockSendEmail).toHaveBeenCalledOnce()
      expect(mockSendEmail.mock.calls[0][0].to).toEqual(['admin1@test.com', 'admin2@test.com'])
    })
  })
})
