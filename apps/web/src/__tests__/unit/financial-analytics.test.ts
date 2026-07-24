import { describe, it, expect } from 'vitest'
import {
  monthsInPeriod,
  classifyBoardName,
  findColumnId,
  computeExpectedForContract,
  buildLedger,
  expectedByMonth,
  computeAging,
  categorizePayer,
  DEFAULT_PAYER_CRITERIA,
  type ContractRecord,
  type PaymentRecord,
} from '@/services/financial-analytics.service'

function contract(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    item_id: 'item-1',
    board_id: 'board-1',
    board_name: 'აქტიური ხელშეკრულებები',
    contract_source: 'active',
    company_name: 'შპს ტესტი',
    tax_id: '123456789',
    monthly_amount: 500,
    invoice_amount: null,
    frequency: null,
    status: null,
    start_date: null,
    end_date: null,
    responsible: null,
    ...overrides,
  }
}

function payment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    sender_inn: '123456789',
    sender_name: 'შპს ტესტი',
    amount: 500,
    entry_date: '2026-07-10',
    status: 'matched',
    ...overrides,
  }
}

describe('monthsInPeriod', () => {
  it('returns each month start intersecting the period', () => {
    expect(monthsInPeriod('2026-05-15', '2026-07-02')).toEqual([
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
    ])
  })

  it('handles a single month', () => {
    expect(monthsInPeriod('2026-07-01', '2026-07-31')).toEqual(['2026-07-01'])
  })

  it('crosses year boundaries', () => {
    expect(monthsInPeriod('2025-12-01', '2026-01-31')).toEqual(['2025-12-01', '2026-01-01'])
  })
})

describe('classifyBoardName', () => {
  it('classifies contract board names', () => {
    expect(classifyBoardName('აქტიური ხელშეკრულებები')).toBe('active')
    expect(classifyBoardName('ერთჯერადი ხელშეკრულებები')).toBe('one_time')
    expect(classifyBoardName('შეჩერებული')).toBe('paused')
    expect(classifyBoardName('შეწყვეტილი ხელშეკრულებები')).toBe('ended')
    expect(classifyBoardName('დასრულებული')).toBe('ended')
  })
})

describe('findColumnId', () => {
  const columns = [
    {
      column_id: 'col_a',
      column_name: 'Monthly (invoice)',
      column_name_ka: 'ყოველთვიური (ანგარიშ-ფაქტურისთვის)',
      column_type: 'numeric',
      config: null,
    },
    {
      column_id: 'col_b',
      column_name: 'Monthly',
      column_name_ka: 'ყოველთვიური',
      column_type: 'numeric',
      config: null,
    },
    {
      column_id: 'col_c',
      column_name: 'Tax ID',
      column_name_ka: 'ს/კ',
      column_type: 'text',
      config: null,
    },
  ]

  it('prefers an exact name match over a substring match', () => {
    expect(findColumnId(columns, ['ყოველთვიური'], ['numeric', 'number'])).toBe('col_b')
  })

  it('falls back to substring match', () => {
    expect(findColumnId(columns, ['ანგარიშ-ფაქტურ'], ['numeric', 'number'])).toBe('col_a')
  })

  it('filters by column type', () => {
    expect(findColumnId(columns, ['ყოველთვიური'], 'text')).toBeNull()
  })

  it('returns null when nothing matches', () => {
    expect(findColumnId(columns, ['არარსებული'])).toBeNull()
  })
})

describe('computeExpectedForContract', () => {
  it('charges an active contract every month in the period', () => {
    expect(computeExpectedForContract(contract(), '2026-05-01', '2026-07-31')).toBe(1500)
  })

  it('clips to the contract start date', () => {
    expect(
      computeExpectedForContract(contract({ start_date: '2026-06-15' }), '2026-05-01', '2026-07-31')
    ).toBe(1000) // June (starts mid-month) + July
  })

  it('clips to the contract end date', () => {
    expect(
      computeExpectedForContract(contract({ end_date: '2026-05-20' }), '2026-05-01', '2026-07-31')
    ).toBe(500) // May only
  })

  it('falls back to invoice_amount when monthly_amount is missing', () => {
    expect(
      computeExpectedForContract(
        contract({ monthly_amount: null, invoice_amount: 300 }),
        '2026-07-01',
        '2026-07-31'
      )
    ).toBe(300)
  })

  it('returns 0 when no amount is set', () => {
    expect(
      computeExpectedForContract(
        contract({ monthly_amount: null, invoice_amount: null }),
        '2026-07-01',
        '2026-07-31'
      )
    ).toBe(0)
  })

  it('charges a one-time contract once, in its start month', () => {
    const oneTime = contract({
      contract_source: 'one_time',
      start_date: '2026-06-10',
      monthly_amount: null,
      invoice_amount: 900,
    })
    expect(computeExpectedForContract(oneTime, '2026-05-01', '2026-07-31')).toBe(900)
    expect(computeExpectedForContract(oneTime, '2026-07-01', '2026-07-31')).toBe(0)
  })

  it('charges nothing for one-time contracts without a start date', () => {
    expect(
      computeExpectedForContract(
        contract({ contract_source: 'one_time', start_date: null }),
        '2026-05-01',
        '2026-07-31'
      )
    ).toBe(0)
  })

  it('charges nothing for paused and ended contracts', () => {
    expect(
      computeExpectedForContract(
        contract({ contract_source: 'paused' }),
        '2026-05-01',
        '2026-07-31'
      )
    ).toBe(0)
    expect(
      computeExpectedForContract(contract({ contract_source: 'ended' }), '2026-05-01', '2026-07-31')
    ).toBe(0)
  })
})

describe('buildLedger', () => {
  it('computes balance as paid minus expected', () => {
    const rows = buildLedger(
      [contract()],
      [payment({ amount: 500, entry_date: '2026-07-05' })],
      '2026-07-01',
      '2026-07-31'
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].expected).toBe(500)
    expect(rows[0].paid).toBe(500)
    expect(rows[0].balance).toBe(0)
  })

  it('flags underpayment with a negative balance', () => {
    const rows = buildLedger([contract()], [payment({ amount: 200 })], '2026-07-01', '2026-07-31')
    expect(rows[0].balance).toBe(-300)
  })

  it('ignores payments outside the period and ignored transactions', () => {
    const rows = buildLedger(
      [contract()],
      [
        payment({ amount: 500, entry_date: '2026-06-30' }), // before period
        payment({ amount: 100, status: 'ignored' }),
      ],
      '2026-07-01',
      '2026-07-31'
    )
    expect(rows[0].paid).toBe(0)
    expect(rows[0].payments_count).toBe(0)
  })

  it('sums multiple contracts under one tax id', () => {
    const rows = buildLedger(
      [contract(), contract({ item_id: 'item-2', monthly_amount: 250 })],
      [payment({ amount: 750 })],
      '2026-07-01',
      '2026-07-31'
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].expected).toBe(750)
    expect(rows[0].balance).toBe(0)
  })

  it('tracks payment count and last payment date', () => {
    const rows = buildLedger(
      [contract()],
      [
        payment({ amount: 250, entry_date: '2026-07-03' }),
        payment({ amount: 250, entry_date: '2026-07-20' }),
      ],
      '2026-07-01',
      '2026-07-31'
    )
    expect(rows[0].payments_count).toBe(2)
    expect(rows[0].last_payment_date).toBe('2026-07-20')
  })

  it('excludes paused contracts from monthly_amount but keeps them in sources', () => {
    const rows = buildLedger(
      [contract(), contract({ item_id: 'item-2', contract_source: 'paused' })],
      [],
      '2026-07-01',
      '2026-07-31'
    )
    expect(rows[0].monthly_amount).toBe(500)
    expect(rows[0].contract_sources).toEqual(['active', 'paused'])
  })
})

describe('expectedByMonth', () => {
  it('spreads an active contract across every month in the period', () => {
    expect(expectedByMonth([contract()], '2026-05-01', '2026-07-31')).toEqual([
      { month: '2026-05', expected: 500 },
      { month: '2026-06', expected: 500 },
      { month: '2026-07', expected: 500 },
    ])
  })

  it('places a one_time contract only in its start month', () => {
    const oneTime = contract({
      contract_source: 'one_time',
      monthly_amount: null,
      invoice_amount: 900,
      start_date: '2026-06-10',
    })
    expect(expectedByMonth([oneTime], '2026-05-01', '2026-07-31')).toEqual([
      { month: '2026-05', expected: 0 },
      { month: '2026-06', expected: 900 },
      { month: '2026-07', expected: 0 },
    ])
  })

  it('clips a mid-period contract start to its first month', () => {
    const midStart = contract({ start_date: '2026-06-15' })
    expect(expectedByMonth([midStart], '2026-05-01', '2026-07-31')).toEqual([
      { month: '2026-05', expected: 0 },
      { month: '2026-06', expected: 500 },
      { month: '2026-07', expected: 500 },
    ])
  })

  it('sums multiple contracts per month', () => {
    const contracts = [contract(), contract({ item_id: 'item-2', monthly_amount: 300 })]
    expect(expectedByMonth(contracts, '2026-07-01', '2026-07-31')).toEqual([
      { month: '2026-07', expected: 800 },
    ])
  })
})

describe('computeAging', () => {
  const monthly = [
    { month: '2026-05', expected: 500 },
    { month: '2026-06', expected: 500 },
    { month: '2026-07', expected: 500 },
  ]

  it('reports no overdue when fully paid', () => {
    const aging = computeAging(monthly, 1500, '2026-07-24')
    expect(aging.outstanding).toBe(0)
    expect(aging.unpaid_months).toBe(0)
    expect(aging.earliest_unpaid_month).toBeNull()
    expect(aging.days_overdue).toBe(0)
    expect(aging.months_overdue).toBe(0)
  })

  it('allocates payments to the oldest months first (FIFO)', () => {
    const aging = computeAging(monthly, 600, '2026-07-24')
    expect(aging.buckets).toEqual([
      { month: '2026-05', expected: 500, paid: 500, outstanding: 0 },
      { month: '2026-06', expected: 500, paid: 100, outstanding: 400 },
      { month: '2026-07', expected: 500, paid: 0, outstanding: 500 },
    ])
    expect(aging.earliest_unpaid_month).toBe('2026-06')
    // 2026-06-30 → 2026-07-24
    expect(aging.days_overdue).toBe(24)
    expect(aging.months_overdue).toBe(1)
    expect(aging.outstanding).toBe(900)
  })

  it('clamps overpayment to zero outstanding', () => {
    const aging = computeAging(monthly, 2000, '2026-07-24')
    expect(aging.outstanding).toBe(0)
    expect(aging.unpaid_months).toBe(0)
  })

  it('ignores sub-tolerance residue', () => {
    const aging = computeAging([{ month: '2026-06', expected: 500 }], 499.5, '2026-07-24')
    expect(aging.unpaid_months).toBe(0)
    expect(aging.outstanding).toBe(0)
  })

  it('never reports negative overdue for the current month', () => {
    const aging = computeAging([{ month: '2026-07', expected: 500 }], 0, '2026-07-24')
    expect(aging.earliest_unpaid_month).toBe('2026-07')
    expect(aging.days_overdue).toBe(0)
    expect(aging.months_overdue).toBe(0)
  })
})

describe('categorizePayer', () => {
  const base = { outstanding: 0, days_overdue: 0, months_overdue: 0, monthly_amount: 500 }

  it('is good with no outstanding debt', () => {
    expect(categorizePayer(base, DEFAULT_PAYER_CRITERIA)).toBe('good')
  })

  it('is good within the tolerance', () => {
    expect(
      categorizePayer({ ...base, outstanding: 1, days_overdue: 40 }, DEFAULT_PAYER_CRITERIA)
    ).toBe('good')
  })

  it('is good within the grace period', () => {
    expect(
      categorizePayer({ ...base, outstanding: 500, days_overdue: 10 }, DEFAULT_PAYER_CRITERIA)
    ).toBe('good')
  })

  it('is average past grace but under the bad thresholds', () => {
    expect(
      categorizePayer(
        { outstanding: 400, days_overdue: 20, months_overdue: 1, monthly_amount: 500 },
        DEFAULT_PAYER_CRITERIA
      )
    ).toBe('average')
  })

  it('is bad when debt is old enough', () => {
    expect(
      categorizePayer(
        { outstanding: 400, days_overdue: 62, months_overdue: 2, monthly_amount: 500 },
        DEFAULT_PAYER_CRITERIA
      )
    ).toBe('bad')
  })

  it('is bad when debt exceeds the monthly ratio', () => {
    expect(
      categorizePayer(
        { outstanding: 600, days_overdue: 20, months_overdue: 1, monthly_amount: 500 },
        DEFAULT_PAYER_CRITERIA
      )
    ).toBe('bad')
  })

  it('skips the ratio rule when monthly amount is zero', () => {
    expect(
      categorizePayer(
        { outstanding: 600, days_overdue: 20, months_overdue: 1, monthly_amount: 0 },
        DEFAULT_PAYER_CRITERIA
      )
    ).toBe('average')
  })

  it('respects custom thresholds', () => {
    expect(
      categorizePayer(
        { outstanding: 400, days_overdue: 20, months_overdue: 1, monthly_amount: 500 },
        { good_grace_days: 25, bad_months_overdue: 2, bad_debt_ratio: 100 }
      )
    ).toBe('good')
  })
})
