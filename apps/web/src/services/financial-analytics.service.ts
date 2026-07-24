/**
 * Financial analytics engine — expected vs actual payments.
 *
 * Contract terms live as board items in the "ხელშეკრულებები" workspace
 * (dynamic Georgian-named columns, discovered per board — never hardcode
 * column ids, they differ per instance). Actual payments live in
 * bank_transactions (BOG), keyed by sender_inn. This service joins the two
 * into a per-tax-id ledger that powers debtors / unpaid-invoice / revenue
 * queries (AI assistant + the /payments/debtors UI).
 *
 * Expectation semantics (MVP, documented so answers can be caveated):
 * - active contracts owe monthly_amount (fallback invoice_amount) for every
 *   month in the period, clipped to [start_date, end_date]
 * - one_time contracts owe their amount once, in the month of start_date
 * - paused/ended contracts accrue no new expectations
 * - frequency is reported but NOT applied (amounts are treated as monthly;
 *   note features/payments/helpers.ts applies frequency client-side — known
 *   semantic difference, this service is the source of truth for debtors)
 *
 * All DB access goes through a caller-supplied SELECT-only function so the
 * assistant's read-only guarantee holds.
 */

import {
  COLUMN_PATTERNS,
  NUMERIC_TYPES,
  classifyBoardName,
  coerceDisplayValue,
  findColumnId,
  resolveStatusLabel,
  type ContractSource,
} from '@/lib/contracts/board-columns'

// Chainable PostgREST select — matches roSelect() from lib/chat/readonly-db
// and any thin adapter over a Supabase client.
export type SelectFn = (
  table: string,
  columns: string,
  opts?: { count?: 'exact'; head?: boolean }
) => any

// Re-exported for existing consumers/tests that import from this module.
export { classifyBoardName, findColumnId }
export type { ContractSource }

export interface ContractRecord {
  item_id: string
  board_id: string
  board_name: string
  contract_source: ContractSource
  company_name: string
  tax_id: string
  monthly_amount: number | null
  invoice_amount: number | null
  frequency: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  responsible: string | null
}

export interface PaymentRecord {
  sender_inn: string | null
  sender_name: string | null
  amount: number | null
  entry_date: string
  status: string
}

export interface LedgerRow {
  tax_id: string
  company_name: string
  contract_sources: ContractSource[]
  monthly_amount: number
  frequency: string | null
  expected: number
  paid: number
  balance: number
  payments_count: number
  last_payment_date: string | null
}

// Paid-in-full tolerance: ignore sub-lari rounding differences.
const PAID_TOLERANCE = 1

/** First day of each month intersecting [from, to] (inclusive). */
export function monthsInPeriod(from: string, to: string): string[] {
  const months: string[] = []
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00Z`)
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`)
  for (
    let d = start;
    d <= end;
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  ) {
    months.push(d.toISOString().slice(0, 10))
  }
  return months
}

function lastDayOfMonth(monthStart: string): string {
  const d = new Date(`${monthStart}T00:00:00Z`)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
}

/** Expected amount a single contract owes over [from, to]. */
export function computeExpectedForContract(
  contract: ContractRecord,
  from: string,
  to: string
): number {
  const amount = contract.monthly_amount ?? contract.invoice_amount ?? 0
  if (!amount) return 0

  if (contract.contract_source === 'paused' || contract.contract_source === 'ended') {
    return 0
  }

  if (contract.contract_source === 'one_time') {
    // Owed once, in the month the contract was signed.
    if (!contract.start_date) return 0
    const month = contract.start_date.slice(0, 7)
    return month >= from.slice(0, 7) && month <= to.slice(0, 7)
      ? (contract.invoice_amount ?? contract.monthly_amount ?? 0)
      : 0
  }

  // Active: owed for every month in the period the contract covers.
  let expected = 0
  for (const monthStart of monthsInPeriod(from, to)) {
    const monthEnd = lastDayOfMonth(monthStart)
    const startsBeforeMonthEnds = !contract.start_date || contract.start_date <= monthEnd
    const endsAfterMonthStarts = !contract.end_date || contract.end_date >= monthStart
    if (startsBeforeMonthEnds && endsAfterMonthStarts) {
      expected += amount
    }
  }
  return expected
}

/** Join contracts and payments into a per-tax-id ledger for [from, to]. */
export function buildLedger(
  contracts: ContractRecord[],
  payments: PaymentRecord[],
  from: string,
  to: string
): LedgerRow[] {
  const byTaxId = new Map<string, ContractRecord[]>()
  for (const contract of contracts) {
    const list = byTaxId.get(contract.tax_id) || []
    list.push(contract)
    byTaxId.set(contract.tax_id, list)
  }

  const paidByInn = new Map<string, { total: number; count: number; last: string | null }>()
  for (const payment of payments) {
    if (!payment.sender_inn || payment.status === 'ignored') continue
    if (payment.entry_date < from || payment.entry_date > to) continue
    const entry = paidByInn.get(payment.sender_inn) || { total: 0, count: 0, last: null }
    entry.total += payment.amount || 0
    entry.count++
    if (!entry.last || payment.entry_date > entry.last) entry.last = payment.entry_date
    paidByInn.set(payment.sender_inn, entry)
  }

  const rows: LedgerRow[] = []
  for (const [taxId, taxContracts] of byTaxId) {
    const expected = taxContracts.reduce(
      (sum, c) => sum + computeExpectedForContract(c, from, to),
      0
    )
    const paidEntry = paidByInn.get(taxId)
    const paid = paidEntry?.total || 0
    const monthlyAmount = taxContracts
      .filter(c => c.contract_source === 'active')
      .reduce((sum, c) => sum + (c.monthly_amount ?? c.invoice_amount ?? 0), 0)

    rows.push({
      tax_id: taxId,
      company_name: taxContracts[0].company_name,
      contract_sources: [...new Set(taxContracts.map(c => c.contract_source))],
      monthly_amount: monthlyAmount,
      frequency: taxContracts.find(c => c.frequency)?.frequency || null,
      expected: Math.round(expected * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      balance: Math.round((paid - expected) * 100) / 100,
      payments_count: paidEntry?.count || 0,
      last_payment_date: paidEntry?.last || null,
    })
  }
  return rows
}

export interface MonthBucket {
  month: string // 'YYYY-MM'
  expected: number
  paid: number // FIFO-allocated
  outstanding: number
}

export type PayerCategory = 'good' | 'average' | 'bad'

export interface PayerCriteria {
  /** N — still "good" if the only debt is ≤ N days past month end. */
  good_grace_days: number
  /** X — debt older than X calendar months → bad. */
  bad_months_overdue: number
  /** Y (%) — outstanding above Y% of the monthly amount → bad. */
  bad_debt_ratio: number
}

export const DEFAULT_PAYER_CRITERIA: PayerCriteria = {
  good_grace_days: 10,
  bad_months_overdue: 2,
  bad_debt_ratio: 100,
}

/** Per-month expected amounts for a set of contracts over [from, to]. */
export function expectedByMonth(
  contracts: ContractRecord[],
  from: string,
  to: string
): Array<{ month: string; expected: number }> {
  return monthsInPeriod(from, to).map(monthStart => {
    const monthEnd = lastDayOfMonth(monthStart)
    const expected = contracts.reduce(
      (sum, c) => sum + computeExpectedForContract(c, monthStart, monthEnd),
      0
    )
    return { month: monthStart.slice(0, 7), expected: Math.round(expected * 100) / 100 }
  })
}

export interface AgingResult {
  buckets: MonthBucket[]
  unpaid_months: number
  earliest_unpaid_month: string | null // 'YYYY-MM'
  months_overdue: number
  days_overdue: number
  outstanding: number
}

/**
 * FIFO aging: allocate the total paid to expected months oldest-first (no
 * invoice due dates exist, so a month's charge is due at that month's end).
 */
export function computeAging(
  monthly: Array<{ month: string; expected: number }>,
  totalPaid: number,
  todayDate?: string
): AgingResult {
  const now = todayDate || today()
  let remaining = totalPaid
  const buckets: MonthBucket[] = monthly.map(({ month, expected }) => {
    const paid = Math.min(remaining, expected)
    remaining -= paid
    return {
      month,
      expected: Math.round(expected * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      outstanding: Math.round(Math.max(0, expected - paid) * 100) / 100,
    }
  })

  const unpaid = buckets.filter(b => b.outstanding > PAID_TOLERANCE)
  const earliest = unpaid[0]?.month ?? null
  let daysOverdue = 0
  let monthsOverdue = 0
  if (earliest) {
    const due = lastDayOfMonth(`${earliest}-01`)
    daysOverdue = Math.max(
      0,
      Math.round((Date.parse(`${now}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / 86400000)
    )
    const [ey, em] = earliest.split('-').map(Number)
    const [ny, nm] = now.slice(0, 7).split('-').map(Number)
    monthsOverdue = Math.max(0, (ny - ey) * 12 + (nm - em))
  }

  return {
    buckets,
    unpaid_months: unpaid.length,
    earliest_unpaid_month: earliest,
    months_overdue: monthsOverdue,
    days_overdue: daysOverdue,
    outstanding: Math.round(unpaid.reduce((s, b) => s + b.outstanding, 0) * 100) / 100,
  }
}

/** Debt + delay combined categorization; thresholds come from app_settings. */
export function categorizePayer(
  input: {
    outstanding: number
    days_overdue: number
    months_overdue: number
    monthly_amount: number
  },
  criteria: PayerCriteria
): PayerCategory {
  if (input.outstanding <= PAID_TOLERANCE || input.days_overdue <= criteria.good_grace_days) {
    return 'good'
  }
  if (
    input.months_overdue >= criteria.bad_months_overdue ||
    (input.monthly_amount > 0 &&
      input.outstanding > (input.monthly_amount * criteria.bad_debt_ratio) / 100)
  ) {
    return 'bad'
  }
  return 'average'
}

/** Load all contract records from the ხელშეკრულებები workspace boards. */
export async function loadContracts(select: SelectFn): Promise<ContractRecord[]> {
  const { data: workspace } = await select('workspaces', 'id')
    .ilike('name', 'ხელშეკრულებები')
    .limit(1)
    .maybeSingle()
  if (!workspace) return []

  const { data: boards } = await select('boards', 'id, name').eq('workspace_id', workspace.id)
  if (!boards?.length) return []

  const contracts: ContractRecord[] = []

  for (const board of boards as { id: string; name: string }[]) {
    // The "additional services" board is not a contract board.
    if (board.name.includes('დამატებითი')) continue
    const contractSource = classifyBoardName(board.name)

    const { data: columns } = await select(
      'board_columns',
      'column_id, column_name, column_name_ka, column_type, config'
    )
      .eq('board_id', board.id)
      .order('position')
    if (!columns?.length) continue

    const taxIdCol = findColumnId(columns, COLUMN_PATTERNS.tax_id, 'text')
    if (!taxIdCol) continue
    const monthlyCol = findColumnId(columns, COLUMN_PATTERNS.monthly_amount, NUMERIC_TYPES)
    const invoiceCol = findColumnId(columns, COLUMN_PATTERNS.invoice_amount, NUMERIC_TYPES)
    const frequencyCol =
      findColumnId(columns, COLUMN_PATTERNS.frequency, 'status') ||
      findColumnId(columns, COLUMN_PATTERNS.frequency)
    const statusCol = findColumnId(columns, COLUMN_PATTERNS.status, 'status')
    const startDateCol = findColumnId(columns, COLUMN_PATTERNS.start_date, 'date')
    const endDateCol = findColumnId(columns, COLUMN_PATTERNS.end_date, 'date')
    const responsibleCol =
      findColumnId(columns, COLUMN_PATTERNS.responsible, ['person', 'people', 'text']) ||
      findColumnId(columns, COLUMN_PATTERNS.responsible)

    // Paginate all items (contract boards can exceed one page).
    let items: any[] = []
    let fromIdx = 0
    while (true) {
      const { data, error } = await select('board_items', 'id, name, data')
        .eq('board_id', board.id)
        .is('deleted_at', null)
        .range(fromIdx, fromIdx + 999)
      if (error) throw error
      if (!data?.length) break
      items = items.concat(data)
      if (data.length < 1000) break
      fromIdx += 1000
    }

    for (const item of items) {
      const d = item.data || {}
      const taxId = d[taxIdCol]
      if (!taxId) continue

      contracts.push({
        item_id: item.id,
        board_id: board.id,
        board_name: board.name,
        contract_source: contractSource,
        company_name: item.name,
        tax_id: String(taxId).trim(),
        monthly_amount: monthlyCol ? Number(d[monthlyCol]) || null : null,
        invoice_amount: invoiceCol ? Number(d[invoiceCol]) || null : null,
        frequency: resolveStatusLabel(d[frequencyCol!], columns, frequencyCol),
        status: resolveStatusLabel(d[statusCol!], columns, statusCol),
        start_date: startDateCol ? d[startDateCol] || null : null,
        end_date: endDateCol ? d[endDateCol] || null : null,
        responsible: responsibleCol ? coerceDisplayValue(d[responsibleCol]) : null,
      })
    }
  }

  return contracts
}

async function loadPayments(select: SelectFn, from: string, to: string): Promise<PaymentRecord[]> {
  let payments: any[] = []
  let fromIdx = 0
  while (true) {
    const { data, error } = await select(
      'bank_transactions',
      'sender_inn, sender_name, amount, entry_date, status'
    )
      .gte('entry_date', from)
      .lte('entry_date', to)
      .neq('status', 'ignored')
      .range(fromIdx, fromIdx + 999)
    if (error) throw error
    if (!data?.length) break
    payments = payments.concat(data)
    if (data.length < 1000) break
    fromIdx += 1000
  }
  return payments
}

export interface DebtorRow extends LedgerRow {
  outstanding: number
  unpaid_months: number
  earliest_unpaid_month: string | null
  days_overdue: number
  months_overdue: number
  responsible: string | null
  category: PayerCategory
  buckets: MonthBucket[]
  contracts: Array<{
    item_id: string
    board_id: string
    board_name: string
    contract_source: ContractSource
  }>
}

export interface PlanVsActualMonth {
  month: string // 'YYYY-MM'
  expected: number
  received: number
  difference: number
}

export interface DebtorsSummary {
  total_expected: number
  total_paid: number
  difference: number
  total_outstanding: number
  debtor_count: number
  by_category: { good: number; average: number; bad: number }
}

function planVsActualByMonth(
  contracts: ContractRecord[],
  payments: PaymentRecord[],
  from: string,
  to: string
): PlanVsActualMonth[] {
  const receivedByMonth: Record<string, number> = {}
  for (const p of payments) {
    if (p.status === 'ignored') continue
    if (p.entry_date < from || p.entry_date > to) continue
    const month = p.entry_date.slice(0, 7)
    receivedByMonth[month] = (receivedByMonth[month] || 0) + (p.amount || 0)
  }
  return expectedByMonth(contracts, from, to).map(({ month, expected }) => {
    const received = Math.round((receivedByMonth[month] || 0) * 100) / 100
    return {
      month,
      expected,
      received,
      difference: Math.round((received - expected) * 100) / 100,
    }
  })
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthStartNBack(monthsBack: number): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1))
    .toISOString()
    .slice(0, 10)
}

export const financialAnalyticsService = {
  /** Full expected-vs-actual ledger for a period. */
  async getExpectedVsActual(select: SelectFn, opts: { from: string; to: string }) {
    const [contracts, payments] = await Promise.all([
      loadContracts(select),
      loadPayments(select, opts.from, opts.to),
    ])
    return buildLedger(contracts, payments, opts.from, opts.to)
  },

  /** Companies that paid less than owed ("bad payers"), worst first. */
  async getDebtors(
    select: SelectFn,
    opts: { monthsBack?: number; minArrears?: number; limit?: number } = {}
  ) {
    const from = monthStartNBack((opts.monthsBack ?? 3) - 1)
    const to = today()
    const ledger = await this.getExpectedVsActual(select, { from, to })
    const debtors = ledger
      .filter(r => r.expected > 0 && r.balance < -(opts.minArrears ?? PAID_TOLERANCE))
      .sort((a, b) => a.balance - b.balance)
      .slice(0, opts.limit ?? 20)
    return { from, to, debtors, note: 'balance = paid - expected (negative = owes)' }
  },

  /** Contracts with expected-but-missing payment for one month. */
  async getUnpaidInvoices(select: SelectFn, opts: { month?: string } = {}) {
    const month = opts.month || today().slice(0, 7)
    const from = `${month}-01`
    const to = lastDayOfMonth(from)
    const ledger = await this.getExpectedVsActual(select, { from, to })
    const unpaid = ledger.filter(r => r.expected > 0 && r.paid < r.expected - PAID_TOLERANCE)
    const partiallyPaid = unpaid.filter(r => r.paid > 0)
    return {
      month,
      unpaid_count: unpaid.length,
      partially_paid_count: partiallyPaid.length,
      total_outstanding:
        Math.round(unpaid.reduce((s, r) => s + (r.expected - r.paid), 0) * 100) / 100,
      currency: 'GEL',
      companies: unpaid.sort((a, b) => a.balance - b.balance).slice(0, 50),
    }
  },

  /** One company's contracts, payments and balance. */
  async getCompanyFinancials(select: SelectFn, opts: { query: string; monthsBack?: number }) {
    const contracts = await loadContracts(select)
    const q = opts.query.trim().toLowerCase()
    const matched = contracts.filter(
      c => c.tax_id === opts.query.trim() || c.company_name.toLowerCase().includes(q)
    )
    if (!matched.length) return { error: `No contracts found for "${opts.query}"` }

    const taxIds = [...new Set(matched.map(c => c.tax_id))]
    const from = monthStartNBack((opts.monthsBack ?? 6) - 1)
    const to = today()
    const payments = await loadPayments(select, from, to)
    const companyPayments = payments.filter(p => p.sender_inn && taxIds.includes(p.sender_inn))
    const ledger = buildLedger(matched, companyPayments, from, to).filter(r =>
      taxIds.includes(r.tax_id)
    )

    return {
      period: { from, to },
      contracts: matched.map(c => ({
        company_name: c.company_name,
        tax_id: c.tax_id,
        source: c.contract_source,
        board: c.board_name,
        monthly_amount: c.monthly_amount,
        invoice_amount: c.invoice_amount,
        frequency: c.frequency,
        status: c.status,
        start_date: c.start_date,
        end_date: c.end_date,
        url: `/boards/${c.board_id}?item=${c.item_id}`,
      })),
      ledger,
      recent_payments: companyPayments
        .sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1))
        .slice(0, 12)
        .map(p => ({ date: p.entry_date, amount: p.amount, sender: p.sender_name })),
    }
  },

  /** Received (bank) and contracted (boards) revenue for a period, by month. */
  async getRevenueSummary(select: SelectFn, opts: { from?: string; to?: string } = {}) {
    const from = opts.from || monthStartNBack(5)
    const to = opts.to || today()
    const [contracts, payments] = await Promise.all([
      loadContracts(select),
      loadPayments(select, from, to),
    ])

    const byMonth: Record<string, { received: number; transactions: number }> = {}
    for (const month of monthsInPeriod(from, to)) {
      byMonth[month.slice(0, 7)] = { received: 0, transactions: 0 }
    }
    for (const p of payments) {
      const month = p.entry_date.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = { received: 0, transactions: 0 }
      byMonth[month].received += p.amount || 0
      byMonth[month].transactions++
    }

    const activeContracts = contracts.filter(c => c.contract_source === 'active')
    const contractedMonthly = activeContracts.reduce(
      (s, c) => s + (c.monthly_amount ?? c.invoice_amount ?? 0),
      0
    )
    const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0)

    return {
      period: { from, to },
      currency: 'GEL',
      total_received: Math.round(totalReceived * 100) / 100,
      contracted_monthly_total: Math.round(contractedMonthly * 100) / 100,
      active_contracts: activeContracts.length,
      by_month: Object.entries(byMonth)
        .sort()
        .map(([month, v]) => ({
          month,
          received: Math.round(v.received * 100) / 100,
          transactions: v.transactions,
        })),
      note: 'received = bank transactions (excl. ignored); contracted = sum of active contract monthly amounts',
    }
  },

  /** Active contracts expiring within N days. */
  async getExpiringContracts(select: SelectFn, opts: { days?: number } = {}) {
    const contracts = await loadContracts(select)
    const now = today()
    const horizon = new Date(Date.now() + (opts.days ?? 30) * 86400000).toISOString().slice(0, 10)
    const expiring = contracts
      .filter(
        c =>
          c.contract_source === 'active' && c.end_date && c.end_date >= now && c.end_date <= horizon
      )
      .sort((a, b) => (a.end_date! < b.end_date! ? -1 : 1))
    return {
      days: opts.days ?? 30,
      count: expiring.length,
      contracts: expiring.map(c => ({
        company_name: c.company_name,
        tax_id: c.tax_id,
        end_date: c.end_date,
        monthly_amount: c.monthly_amount,
        url: `/boards/${c.board_id}?item=${c.item_id}`,
      })),
    }
  },

  /**
   * Debtor list with FIFO aging, responsible person and payer category,
   * plus a plan-vs-actual monthly breakdown for the same period.
   */
  async getDebtorsDetailed(
    select: SelectFn,
    opts: { from: string; to: string; criteria: PayerCriteria; today?: string }
  ): Promise<{
    period: { from: string; to: string }
    criteria: PayerCriteria
    summary: DebtorsSummary
    by_month: PlanVsActualMonth[]
    debtors: DebtorRow[]
  }> {
    const [contracts, payments] = await Promise.all([
      loadContracts(select),
      loadPayments(select, opts.from, opts.to),
    ])
    const ledger = buildLedger(contracts, payments, opts.from, opts.to)

    const contractsByTaxId = new Map<string, ContractRecord[]>()
    for (const c of contracts) {
      const list = contractsByTaxId.get(c.tax_id) || []
      list.push(c)
      contractsByTaxId.set(c.tax_id, list)
    }

    const byCategory = { good: 0, average: 0, bad: 0 }
    const debtors: DebtorRow[] = []
    let totalOutstanding = 0

    for (const row of ledger) {
      const taxContracts = contractsByTaxId.get(row.tax_id) || []
      const monthly = expectedByMonth(taxContracts, opts.from, opts.to)
      const aging = computeAging(monthly, row.paid, opts.today)
      const category = categorizePayer(
        {
          outstanding: aging.outstanding,
          days_overdue: aging.days_overdue,
          months_overdue: aging.months_overdue,
          monthly_amount: row.monthly_amount,
        },
        opts.criteria
      )
      if (row.expected > 0) byCategory[category]++

      if (aging.outstanding > PAID_TOLERANCE) {
        totalOutstanding += aging.outstanding
        debtors.push({
          ...row,
          outstanding: aging.outstanding,
          unpaid_months: aging.unpaid_months,
          earliest_unpaid_month: aging.earliest_unpaid_month,
          days_overdue: aging.days_overdue,
          months_overdue: aging.months_overdue,
          responsible: taxContracts.find(c => c.responsible)?.responsible ?? null,
          category,
          buckets: aging.buckets,
          contracts: taxContracts.map(c => ({
            item_id: c.item_id,
            board_id: c.board_id,
            board_name: c.board_name,
            contract_source: c.contract_source,
          })),
        })
      }
    }

    debtors.sort((a, b) => b.outstanding - a.outstanding)

    // Boards without a responsible column fall back to companies.sales_manager.
    const missing = [...new Set(debtors.filter(d => !d.responsible).map(d => d.tax_id))]
    if (missing.length) {
      const { data: companies } = await select('companies', 'tax_id, sales_manager').in(
        'tax_id',
        missing
      )
      const managerByTaxId = new Map<string, string>()
      for (const c of companies || []) {
        if (c.tax_id && c.sales_manager) managerByTaxId.set(c.tax_id, c.sales_manager)
      }
      for (const d of debtors) {
        if (!d.responsible) d.responsible = managerByTaxId.get(d.tax_id) ?? null
      }
    }

    // Person-type board columns may store auth.users ids, not names — resolve
    // display names from public.users (auth.users has no grant).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const idRefs = [
      ...new Set(
        debtors.map(d => d.responsible).filter((v): v is string => !!v && UUID_RE.test(v))
      ),
    ]
    if (idRefs.length) {
      const { data: users } = await select('users', 'id, full_name').in('id', idRefs)
      const nameById = new Map<string, string>()
      for (const u of users || []) {
        if (u.id && u.full_name) nameById.set(u.id, u.full_name)
      }
      for (const d of debtors) {
        if (d.responsible && nameById.has(d.responsible)) {
          d.responsible = nameById.get(d.responsible)!
        }
      }
    }

    const totalExpected = ledger.reduce((s, r) => s + r.expected, 0)
    const totalPaid = ledger.reduce((s, r) => s + r.paid, 0)

    return {
      period: { from: opts.from, to: opts.to },
      criteria: opts.criteria,
      summary: {
        total_expected: Math.round(totalExpected * 100) / 100,
        total_paid: Math.round(totalPaid * 100) / 100,
        difference: Math.round((totalPaid - totalExpected) * 100) / 100,
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        debtor_count: debtors.length,
        by_category: byCategory,
      },
      by_month: planVsActualByMonth(contracts, payments, opts.from, opts.to),
      debtors,
    }
  },

  /** Planned (contracts) vs actual (bank) income by month. */
  async getPlanVsActual(select: SelectFn, opts: { from: string; to: string }) {
    const [contracts, payments] = await Promise.all([
      loadContracts(select),
      loadPayments(select, opts.from, opts.to),
    ])
    const byMonth = planVsActualByMonth(contracts, payments, opts.from, opts.to)
    const expected = Math.round(byMonth.reduce((s, m) => s + m.expected, 0) * 100) / 100
    const received = Math.round(byMonth.reduce((s, m) => s + m.received, 0) * 100) / 100
    return {
      period: { from: opts.from, to: opts.to },
      totals: {
        expected,
        received,
        difference: Math.round((received - expected) * 100) / 100,
      },
      by_month: byMonth,
    }
  },
}
