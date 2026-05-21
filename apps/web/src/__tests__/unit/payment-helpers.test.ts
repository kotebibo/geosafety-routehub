import { describe, it, expect } from 'vitest'
import {
  getPaymentsPerYear,
  getExpectedForPeriod,
  sumExpectedForContracts,
  getMonthRange,
  monthsBetween,
  isActiveContract,
} from '@/features/payments/helpers'
import type { ContractInfo } from '@/services/payments.service'

// Helper to build a contract with sensible defaults
function makeContract(overrides: Partial<ContractInfo> = {}): ContractInfo {
  return {
    item_id: '1',
    board_id: 'b1',
    contract_source: 'active',
    company_name: 'Test Company',
    tax_id: '123456789',
    monthly_amount: 295,
    frequency: 'ყოველთვე',
    invoice_amount: null,
    status: null,
    start_date: '2024-01-01',
    end_date: null,
    payment_method: null,
    first_payment_date: null,
    ...overrides,
  }
}

// ── getPaymentsPerYear ──────────────────────────────────────────────

describe('getPaymentsPerYear', () => {
  it('returns 12 for null frequency', () => {
    expect(getPaymentsPerYear(null)).toBe(12)
  })

  it('returns 12 for ყოველთვე (monthly)', () => {
    expect(getPaymentsPerYear('ყოველთვე')).toBe(12)
  })

  it('returns 1 for წელიწადში 1 (yearly)', () => {
    expect(getPaymentsPerYear('წელიწადში 1')).toBe(1)
  })

  it('returns 2 for წელიწადში 2 (semi-annual)', () => {
    expect(getPaymentsPerYear('წელიწადში 2')).toBe(2)
  })

  it('returns 4 for წელიწადში 4 (quarterly)', () => {
    expect(getPaymentsPerYear('წელიწადში 4')).toBe(4)
  })

  it('returns 12 for unrecognized frequency', () => {
    expect(getPaymentsPerYear('unknown')).toBe(12)
  })
})

// ── getMonthRange ───────────────────────────────────────────────────

describe('getMonthRange', () => {
  it('returns correct range for January (month 0)', () => {
    expect(getMonthRange(2024, 0)).toEqual({ from: '2024-01-01', to: '2024-01-31' })
  })

  it('handles February in a leap year', () => {
    expect(getMonthRange(2024, 1)).toEqual({ from: '2024-02-01', to: '2024-02-29' })
  })

  it('handles February in a non-leap year', () => {
    expect(getMonthRange(2025, 1)).toEqual({ from: '2025-02-01', to: '2025-02-28' })
  })

  it('returns correct range for December (month 11)', () => {
    expect(getMonthRange(2024, 11)).toEqual({ from: '2024-12-01', to: '2024-12-31' })
  })
})

// ── monthsBetween ───────────────────────────────────────────────────

describe('monthsBetween', () => {
  it('returns 1 for same month', () => {
    expect(monthsBetween('2024-05-01', '2024-05-31')).toBe(1)
  })

  it('returns 3 for a quarter', () => {
    expect(monthsBetween('2024-01-01', '2024-03-31')).toBe(3)
  })

  it('returns 12 for a full year', () => {
    expect(monthsBetween('2024-01-01', '2024-12-31')).toBe(12)
  })

  it('handles cross-year ranges', () => {
    expect(monthsBetween('2024-11-01', '2025-02-28')).toBe(4)
  })
})

// ── isActiveContract ────────────────────────────────────────────────

describe('isActiveContract', () => {
  it('returns true when monthly_amount is set', () => {
    expect(isActiveContract(makeContract({ monthly_amount: 100 }))).toBe(true)
  })

  it('returns true when only invoice_amount is set', () => {
    expect(isActiveContract(makeContract({ monthly_amount: null, invoice_amount: 500 }))).toBe(true)
  })

  it('returns false when both amounts are null', () => {
    expect(isActiveContract(makeContract({ monthly_amount: null, invoice_amount: null }))).toBe(
      false
    )
  })
})

// ── getExpectedForPeriod ────────────────────────────────────────────

describe('getExpectedForPeriod', () => {
  // Fix "now" so tests are deterministic
  const now = new Date('2026-05-15')

  it('monthly contract, single month in the past = monthly amount', () => {
    const contract = makeContract({
      monthly_amount: 295,
      frequency: 'ყოველთვე',
      start_date: '2024-01-01',
    })
    // Viewing May 2025 (fully in the past)
    const result = getExpectedForPeriod(contract, 1, '2025-05-01', '2025-05-31', now)
    expect(result).toBe(295)
  })

  it('monthly contract, 3-month range = 3x monthly amount', () => {
    const contract = makeContract({
      monthly_amount: 295,
      frequency: 'ყოველთვე',
      start_date: '2024-01-01',
    })
    const result = getExpectedForPeriod(contract, 3, '2025-01-01', '2025-03-31', now)
    expect(result).toBe(885)
  })

  it('monthly contract, full year = 12x monthly amount', () => {
    const contract = makeContract({
      monthly_amount: 295,
      frequency: 'ყოველთვე',
      start_date: '2024-01-01',
    })
    const result = getExpectedForPeriod(contract, 12, '2025-01-01', '2025-12-31', now)
    expect(result).toBe(3540)
  })

  it('yearly contract (წელიწადში 1), single month = amount/12', () => {
    const contract = makeContract({
      monthly_amount: null,
      invoice_amount: 1200,
      frequency: 'წელიწადში 1',
      start_date: '2024-01-01',
    })
    const result = getExpectedForPeriod(contract, 1, '2025-05-01', '2025-05-31', now)
    expect(result).toBe(100)
  })

  it('yearly contract (წელიწადში 1), full year = full amount', () => {
    const contract = makeContract({
      monthly_amount: null,
      invoice_amount: 1200,
      frequency: 'წელიწადში 1',
      start_date: '2024-01-01',
    })
    const result = getExpectedForPeriod(contract, 12, '2025-01-01', '2025-12-31', now)
    expect(result).toBe(1200)
  })

  it('quarterly contract (წელიწადში 4), single month = amount*4/12', () => {
    const contract = makeContract({
      monthly_amount: null,
      invoice_amount: 300,
      frequency: 'წელიწადში 4',
      start_date: '2024-01-01',
    })
    const result = getExpectedForPeriod(contract, 1, '2025-05-01', '2025-05-31', now)
    expect(result).toBe(100)
  })

  it('contract started mid-period only counts active months', () => {
    const contract = makeContract({
      monthly_amount: 295,
      frequency: 'ყოველთვე',
      start_date: '2025-03-15', // started in March
    })
    // Viewing Jan-Mar 2025 (3-month range, but contract only active in March)
    const result = getExpectedForPeriod(contract, 3, '2025-01-01', '2025-03-31', now)
    expect(result).toBe(295) // only 1 active month
  })

  it('contract not yet started returns null', () => {
    const contract = makeContract({
      monthly_amount: 295,
      frequency: 'ყოველთვე',
      start_date: '2027-01-01',
    })
    const result = getExpectedForPeriod(contract, 1, '2026-05-01', '2026-05-31', now)
    expect(result).toBeNull()
  })

  it('returns null when no amount is set', () => {
    const contract = makeContract({ monthly_amount: null, invoice_amount: null })
    const result = getExpectedForPeriod(contract, 1, '2025-05-01', '2025-05-31', now)
    expect(result).toBeNull()
  })

  it('paused contract respects end date', () => {
    const contract = makeContract({
      monthly_amount: 295,
      frequency: 'ყოველთვე',
      contract_source: 'paused',
      start_date: '2024-01-01',
      end_date: '2025-06-30',
    })
    // Viewing full year 2025, but contract ended in June
    const result = getExpectedForPeriod(contract, 12, '2025-01-01', '2025-12-31', now)
    expect(result).toBe(295 * 6) // Jan-Jun = 6 months
  })

  it('ended contract in the future of the view returns null', () => {
    const contract = makeContract({
      monthly_amount: 295,
      frequency: 'ყოველთვე',
      contract_source: 'ended',
      start_date: '2024-01-01',
      end_date: '2024-06-30',
    })
    // Viewing Dec 2024 — contract ended in June
    const result = getExpectedForPeriod(contract, 1, '2024-12-01', '2024-12-31', now)
    expect(result).toBeNull()
  })

  // "All" mode (no periodFrom/periodTo)
  it('all mode: uses contract start to today', () => {
    const contract = makeContract({
      monthly_amount: 100,
      frequency: 'ყოველთვე',
      start_date: '2026-01-01',
    })
    // now = 2026-05-15 → 5 active months
    const result = getExpectedForPeriod(contract, 0, undefined, undefined, now)
    expect(result).toBe(500)
  })

  it('all mode: returns null when no start date or first payment', () => {
    const contract = makeContract({
      monthly_amount: 100,
      start_date: null,
      first_payment_date: null,
    })
    const result = getExpectedForPeriod(contract, 0, undefined, undefined, now)
    expect(result).toBeNull()
  })

  it('all mode: falls back to first_payment_date when no start_date', () => {
    const contract = makeContract({
      monthly_amount: 100,
      frequency: 'ყოველთვე',
      start_date: null,
      first_payment_date: '2026-03-01',
    })
    // now = 2026-05-15 → Mar, Apr, May = 3 months
    const result = getExpectedForPeriod(contract, 0, undefined, undefined, now)
    expect(result).toBe(300)
  })
})

// ── sumExpectedForContracts ─────────────────────────────────────────

describe('sumExpectedForContracts', () => {
  const now = new Date('2026-05-15')

  it('sums multiple contracts for the same tax ID', () => {
    const contracts = [
      makeContract({ monthly_amount: 295, frequency: 'ყოველთვე', start_date: '2024-01-01' }),
      makeContract({ monthly_amount: 100, frequency: 'ყოველთვე', start_date: '2024-01-01' }),
    ]
    // Single month → 295 + 100 = 395
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBe(395)
  })

  it('3 identical contracts triple the expected', () => {
    const contracts = [
      makeContract({ monthly_amount: 295, frequency: 'ყოველთვე', start_date: '2024-01-01' }),
      makeContract({ monthly_amount: 295, frequency: 'ყოველთვე', start_date: '2024-01-01' }),
      makeContract({ monthly_amount: 295, frequency: 'ყოველთვე', start_date: '2024-01-01' }),
    ]
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    // This is 885 — if your board has 3 rows for the same company, expected triples!
    expect(result).toBe(885)
  })

  it('skips one_time contracts when no matchSource filter', () => {
    const contracts = [
      makeContract({ monthly_amount: 295, frequency: 'ყოველთვე', start_date: '2024-01-01' }),
      makeContract({
        monthly_amount: 500,
        frequency: 'ყოველთვე',
        contract_source: 'one_time',
        start_date: '2024-01-01',
      }),
    ]
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBe(295) // one_time excluded
  })

  it('includes one_time when matchSource=one_time', () => {
    const contracts = [
      makeContract({
        monthly_amount: 500,
        frequency: 'ყოველთვე',
        contract_source: 'one_time',
        start_date: '2024-01-01',
      }),
    ]
    const result = sumExpectedForContracts(
      contracts,
      1,
      '2025-05-01',
      '2025-05-31',
      'one_time',
      now
    )
    expect(result).toBe(500)
  })

  it('filters by matchSource', () => {
    const contracts = [
      makeContract({
        monthly_amount: 295,
        contract_source: 'active',
        start_date: '2024-01-01',
      }),
      makeContract({
        monthly_amount: 100,
        contract_source: 'paused',
        start_date: '2024-01-01',
      }),
    ]
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', 'active', now)
    expect(result).toBe(295) // only active
  })

  it('returns null when no active contracts', () => {
    const contracts = [makeContract({ monthly_amount: null, invoice_amount: null })]
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBeNull()
  })

  it('handles mixed frequencies correctly', () => {
    const contracts = [
      makeContract({
        monthly_amount: 295,
        frequency: 'ყოველთვე',
        start_date: '2024-01-01',
      }),
      makeContract({
        monthly_amount: null,
        invoice_amount: 1200,
        frequency: 'წელიწადში 1',
        start_date: '2024-01-01',
      }),
    ]
    // Single month: 295 (monthly) + 100 (1200/12 yearly pro-rated) = 395
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBe(395)
  })
})

// ══════════════════════════════════════════════════════════════════════
// Additional edge-case and real-world tests
// ══════════════════════════════════════════════════════════════════════

// ── getPaymentsPerYear (additional) ─────────────────────────────────

describe('getPaymentsPerYear (edge cases)', () => {
  it('returns 3 for წელიწადში 3 (3x per year)', () => {
    expect(getPaymentsPerYear('წელიწადში 3')).toBe(3)
  })

  it('returns 12 for empty string', () => {
    expect(getPaymentsPerYear('')).toBe(12)
  })

  it('does NOT match ყოველთვე with extra whitespace', () => {
    // getPaymentsPerYear checks exact === 'ყოველთვე', so leading/trailing spaces won't match
    // It falls through to the regex check, which also won't match → returns 12
    expect(getPaymentsPerYear(' ყოველთვე ')).toBe(12)
  })
})

// ── getExpectedForPeriod (edge cases) ───────────────────────────────

describe('getExpectedForPeriod (edge cases)', () => {
  const now = new Date('2026-05-15')

  it('contract starts mid-month (Jan 15) viewing Jan — still counts as 1 active month', () => {
    const contract = makeContract({
      monthly_amount: 500,
      frequency: 'ყოველთვე',
      start_date: '2025-01-15',
    })
    const result = getExpectedForPeriod(contract, 1, '2025-01-01', '2025-01-31', now)
    expect(result).toBe(500)
  })

  it('contract starts in the FUTURE relative to viewed period — returns null', () => {
    const contract = makeContract({
      monthly_amount: 200,
      frequency: 'ყოველთვე',
      start_date: '2025-06-01',
    })
    // Viewing March 2025 — contract hasn't started yet
    const result = getExpectedForPeriod(contract, 1, '2025-03-01', '2025-03-31', now)
    expect(result).toBeNull()
  })

  it('current month where today has not reached end of month — effectiveTo capped to today', () => {
    // now = 2026-05-15, viewing May 2026 (current month)
    const contract = makeContract({
      monthly_amount: 300,
      frequency: 'ყოველთვე',
      start_date: '2026-01-01',
    })
    // periodTo is 2026-05-31 but today is May 15, so effectiveTo = today
    // effectiveFrom = 2026-05-01, effectiveTo = 2026-05-15 → same month → 1 active month
    const result = getExpectedForPeriod(contract, 1, '2026-05-01', '2026-05-31', now)
    expect(result).toBe(300)
  })

  it('წელიწადში 3 frequency — correct pro-rating', () => {
    const contract = makeContract({
      monthly_amount: null,
      invoice_amount: 600,
      frequency: 'წელიწადში 3',
      start_date: '2024-01-01',
    })
    // Single month: amount * ppy * activeMonths / 12 = 600 * 3 * 1 / 12 = 150
    const result = getExpectedForPeriod(contract, 1, '2025-05-01', '2025-05-31', now)
    expect(result).toBe(150)
  })

  it('contract with both monthly_amount and invoice_amount — monthly takes priority', () => {
    const contract = makeContract({
      monthly_amount: 200,
      invoice_amount: 5000,
      frequency: 'ყოველთვე',
      start_date: '2024-01-01',
    })
    // monthly_amount is truthy, so amount = 200 (the || picks monthly_amount first)
    const result = getExpectedForPeriod(contract, 1, '2025-05-01', '2025-05-31', now)
    expect(result).toBe(200)
  })

  it('paused contract with end_date before the viewed period — returns null', () => {
    const contract = makeContract({
      monthly_amount: 295,
      frequency: 'ყოველთვე',
      contract_source: 'paused',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    })
    // Viewing March 2025 — contract ended Dec 2024
    const result = getExpectedForPeriod(contract, 1, '2025-03-01', '2025-03-31', now)
    expect(result).toBeNull()
  })

  it('paused contract with end_date mid-way through 6-month range — only counts months up to end', () => {
    const contract = makeContract({
      monthly_amount: 100,
      frequency: 'ყოველთვე',
      contract_source: 'paused',
      start_date: '2024-01-01',
      end_date: '2025-03-31',
    })
    // Viewing Jan-Jun 2025 (6 months), but contract ended in March → 3 active months
    const result = getExpectedForPeriod(contract, 6, '2025-01-01', '2025-06-30', now)
    expect(result).toBe(300)
  })

  it('active contract (not paused/ended) should IGNORE end_date', () => {
    const contract = makeContract({
      monthly_amount: 200,
      frequency: 'ყოველთვე',
      contract_source: 'active',
      start_date: '2024-01-01',
      end_date: '2024-06-30', // end_date set but source is active → ignored
    })
    // Viewing full year 2025: all 12 months active because end_date is ignored
    const result = getExpectedForPeriod(contract, 12, '2025-01-01', '2025-12-31', now)
    expect(result).toBe(2400)
  })

  it('all mode with ended contract — caps at end_date', () => {
    const contract = makeContract({
      monthly_amount: 100,
      frequency: 'ყოველთვე',
      contract_source: 'ended',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
    })
    // now = 2026-05-15, but ended contract: to = min(end_date, today) = 2026-03-31
    // from = 2026-01-01, to = 2026-03-31 → 3 months
    const result = getExpectedForPeriod(contract, 0, undefined, undefined, now)
    expect(result).toBe(300)
  })
})

// ── sumExpectedForContracts (edge cases) ────────────────────────────

describe('sumExpectedForContracts (edge cases)', () => {
  const now = new Date('2026-05-15')

  it('single contract, single month — no multiplication artifact', () => {
    const contracts = [
      makeContract({ monthly_amount: 500, frequency: 'ყოველთვე', start_date: '2024-01-01' }),
    ]
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBe(500)
  })

  it('two contracts with DIFFERENT frequencies — each calculated independently', () => {
    const contracts = [
      makeContract({
        monthly_amount: 120,
        frequency: 'ყოველთვე',
        start_date: '2024-01-01',
      }),
      makeContract({
        monthly_amount: null,
        invoice_amount: 2400,
        frequency: 'წელიწადში 2',
        start_date: '2024-01-01',
      }),
    ]
    // Single month:
    //   monthly: 120 * 12 * 1 / 12 = 120
    //   semi-annual: 2400 * 2 * 1 / 12 = 400
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBe(520)
  })

  it('all contracts are one_time with no matchSourceFilter — returns null', () => {
    const contracts = [
      makeContract({
        monthly_amount: 500,
        frequency: 'ყოველთვე',
        contract_source: 'one_time',
        start_date: '2024-01-01',
      }),
      makeContract({
        monthly_amount: 300,
        frequency: 'ყოველთვე',
        contract_source: 'one_time',
        start_date: '2024-01-01',
      }),
    ]
    // No matchSourceFilter → one_time contracts are skipped → null
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBeNull()
  })

  it('matchSourceFilter=active only includes active contracts', () => {
    const contracts = [
      makeContract({
        monthly_amount: 200,
        contract_source: 'active',
        start_date: '2024-01-01',
      }),
      makeContract({
        monthly_amount: 300,
        contract_source: 'paused',
        start_date: '2024-01-01',
      }),
      makeContract({
        monthly_amount: 150,
        contract_source: 'ended',
        start_date: '2024-01-01',
      }),
    ]
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', 'active', now)
    expect(result).toBe(200)
  })

  it('contract with no amounts (monthly=null, invoice=null) — skipped entirely', () => {
    const contracts = [
      makeContract({ monthly_amount: null, invoice_amount: null, start_date: '2024-01-01' }),
      makeContract({ monthly_amount: 100, frequency: 'ყოველთვე', start_date: '2024-01-01' }),
    ]
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBe(100)
  })

  it('empty contract list — returns null', () => {
    const result = sumExpectedForContracts([], 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBeNull()
  })
})

// ── Real-world scenario tests ──────────────────────────────────────

describe('Real-world scenarios', () => {
  const now = new Date('2026-05-15')

  it('შპს მუჭა მუჭა: monthly_amount=885, frequency=ყოველთვე, single month → 885', () => {
    const contract = makeContract({
      company_name: 'შპს მუჭა მუჭა',
      monthly_amount: 885,
      frequency: 'ყოველთვე',
      start_date: '2024-01-01',
    })
    const result = getExpectedForPeriod(contract, 1, '2025-05-01', '2025-05-31', now)
    expect(result).toBe(885)
  })

  it('company with 3 board entries (same tax ID), each 295/month → sumExpected for 1 month = 885', () => {
    const contracts = [
      makeContract({
        item_id: '1',
        tax_id: '123456789',
        monthly_amount: 295,
        frequency: 'ყოველთვე',
        start_date: '2024-01-01',
      }),
      makeContract({
        item_id: '2',
        tax_id: '123456789',
        monthly_amount: 295,
        frequency: 'ყოველთვე',
        start_date: '2024-01-01',
      }),
      makeContract({
        item_id: '3',
        tax_id: '123456789',
        monthly_amount: 295,
        frequency: 'ყოველთვე',
        start_date: '2024-01-01',
      }),
    ]
    const result = sumExpectedForContracts(contracts, 1, '2025-05-01', '2025-05-31', null, now)
    expect(result).toBe(885)
  })

  it('yearly contract (invoice_amount=1200, წელიწადში 1): Jan view = 100, full year = 1200', () => {
    const contract = makeContract({
      monthly_amount: null,
      invoice_amount: 1200,
      frequency: 'წელიწადში 1',
      start_date: '2024-01-01',
    })
    // Single month (January): 1200 * 1 * 1 / 12 = 100
    const jan = getExpectedForPeriod(contract, 1, '2025-01-01', '2025-01-31', now)
    expect(jan).toBe(100)

    // Full year: 1200 * 1 * 12 / 12 = 1200
    const fullYear = getExpectedForPeriod(contract, 12, '2025-01-01', '2025-12-31', now)
    expect(fullYear).toBe(1200)
  })

  it('quarterly contract (invoice_amount=300, წელიწადში 4): single month=100, 3 months=300, full year=1200', () => {
    const contract = makeContract({
      monthly_amount: null,
      invoice_amount: 300,
      frequency: 'წელიწადში 4',
      start_date: '2024-01-01',
    })
    // Single month: 300 * 4 * 1 / 12 = 100
    const oneMonth = getExpectedForPeriod(contract, 1, '2025-05-01', '2025-05-31', now)
    expect(oneMonth).toBe(100)

    // 3 months: 300 * 4 * 3 / 12 = 300
    const threeMonths = getExpectedForPeriod(contract, 3, '2025-01-01', '2025-03-31', now)
    expect(threeMonths).toBe(300)

    // Full year: 300 * 4 * 12 / 12 = 1200
    const fullYear = getExpectedForPeriod(contract, 12, '2025-01-01', '2025-12-31', now)
    expect(fullYear).toBe(1200)
  })

  it('contract started Oct 2024, viewing full year 2024 — only 3 months active', () => {
    const contract = makeContract({
      monthly_amount: 200,
      frequency: 'ყოველთვე',
      start_date: '2024-10-01',
    })
    // Viewing full year 2024 (Jan-Dec), contract started Oct → Oct, Nov, Dec = 3 active months
    const result = getExpectedForPeriod(contract, 12, '2024-01-01', '2024-12-31', now)
    expect(result).toBe(600)
  })
})
