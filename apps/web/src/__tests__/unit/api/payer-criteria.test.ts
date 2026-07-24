import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT } from '../../../../app/api/payments/payer-criteria/route'
import { DEFAULT_PAYER_CRITERIA } from '@/services/financial-analytics.service'

// --- Mocks ---

const mockRequireAdminOrDispatcher = vi.fn()

vi.mock('@/middleware/auth', () => ({
  requireAdminOrDispatcher: (...args: any[]) => mockRequireAdminOrDispatcher(...args),
}))

function createQueryBuilder(resolvedValue: { data: any; error: any }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'maybeSingle']
  for (const m of methods) {
    builder[m] = vi.fn(() => builder)
  }
  builder.then = (resolve: any) => resolve(resolvedValue)
  return builder
}

let mockFromBuilders: Record<string, any> = {}
const mockUpsert = vi.fn()

const mockFrom = vi.fn((table: string) => {
  const builder = mockFromBuilders[table] || createQueryBuilder({ data: null, error: null })
  builder.upsert = mockUpsert
  return builder
})

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

function makePutRequest(body: unknown) {
  return new NextRequest(new URL('/api/payments/payer-criteria', 'http://localhost:3000'), {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('Payer Criteria API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminOrDispatcher.mockResolvedValue({ session: { user: { id: 'u1' } } })
    mockFromBuilders = {}
    mockUpsert.mockResolvedValue({ error: null })
  })

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      const err = new Error('Authentication required')
      err.name = 'UnauthorizedError'
      mockRequireAdminOrDispatcher.mockRejectedValue(err)

      const res = await GET()
      expect(res.status).toBe(401)
    })

    it('returns defaults when nothing is stored', async () => {
      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.criteria).toEqual(DEFAULT_PAYER_CRITERIA)
    })

    it('merges stored values over defaults', async () => {
      mockFromBuilders['app_settings'] = createQueryBuilder({
        data: { value: JSON.stringify({ good_grace_days: 5 }) },
        error: null,
      })

      const res = await GET()
      const body = await res.json()

      expect(body.criteria).toEqual({ ...DEFAULT_PAYER_CRITERIA, good_grace_days: 5 })
    })
  })

  describe('PUT', () => {
    it('returns 403 when not admin/dispatcher', async () => {
      const err = new Error('Forbidden')
      err.name = 'ForbiddenError'
      mockRequireAdminOrDispatcher.mockRejectedValue(err)

      const res = await PUT(
        makePutRequest({ good_grace_days: 10, bad_months_overdue: 2, bad_debt_ratio: 100 })
      )
      expect(res.status).toBe(403)
    })

    it('rejects out-of-bounds values', async () => {
      const outOfBounds = [
        { good_grace_days: 40, bad_months_overdue: 2, bad_debt_ratio: 100 },
        { good_grace_days: 10, bad_months_overdue: 0, bad_debt_ratio: 100 },
        { good_grace_days: 10, bad_months_overdue: 2, bad_debt_ratio: -1 },
      ]
      for (const body of outOfBounds) {
        const res = await PUT(makePutRequest(body))
        expect(res.status).toBe(400)
        expect((await res.json()).error).toBe('Validation failed')
      }
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('upserts the criteria row on the settings key', async () => {
      const criteria = { good_grace_days: 15, bad_months_overdue: 3, bad_debt_ratio: 200 }
      const res = await PUT(makePutRequest(criteria))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({ success: true, criteria })
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'payer_criteria',
          value: JSON.stringify(criteria),
        }),
        { onConflict: 'key' }
      )
    })
  })
})
