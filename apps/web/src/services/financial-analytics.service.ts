/**
 * Financial analytics engine — expected vs actual payments.
 *
 * Contract terms live as board items in the "ხელშეკრულებები" workspace
 * (dynamic Georgian-named columns, discovered per board — never hardcode
 * column ids, they differ per instance). Actual payments live in
 * bank_transactions (BOG), keyed by sender_inn. This service joins the two
 * into a per-tax-id ledger that powers debtors / unpaid-invoice / revenue
 * queries (AI assistant today, UI pages later).
 *
 * Expectation semantics (MVP, documented so answers can be caveated):
 * - active contracts owe monthly_amount (fallback invoice_amount) for every
 *   month in the period, clipped to [start_date, end_date]
 * - one_time contracts owe their amount once, in the month of start_date
 * - paused/ended contracts accrue no new expectations
 * - frequency is reported but NOT applied (amounts are treated as monthly)
 *
 * All DB access goes through a caller-supplied SELECT-only function so the
 * assistant's read-only guarantee holds.
 */

// Chainable PostgREST select — matches roSelect() from lib/chat/readonly-db
// and any thin adapter over a Supabase client.
export type SelectFn = (
  table: string,
  columns: string,
  opts?: { count?: 'exact'; head?: boolean }
) => any

export type ContractSource = 'active' | 'one_time' | 'paused' | 'ended'

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

interface ColumnRow {
  column_id: string
  column_name: string
  column_name_ka: string | null
  column_type: string
  config: any
}

// Column name patterns (Georgian) to discover column IDs dynamically —
// mirrors app/api/payments/contracts/route.ts
const COLUMN_PATTERNS = {
  tax_id: ['ს/კ', 'საიდენტიფიკაციო', 'tax', 'inn'],
  monthly_amount: ['ყოველთვიური', 'თვიური', 'monthly'],
  frequency: ['სიხშირე', 'პერიოდულობა', 'frequency'],
  invoice_amount: ['ინვოისი', 'invoice'],
  status: ['სტატუსი', 'status'],
  start_date: ['გაფორმ', 'დაწყ', 'start'],
  end_date: ['დასრულ', 'ვადა', 'end'],
}

const NUMERIC_TYPES = ['numeric', 'number']

// Paid-in-full tolerance: ignore sub-lari rounding differences.
const PAID_TOLERANCE = 1

export function findColumnId(
  columns: ColumnRow[],
  patterns: string[],
  preferredType?: string | string[]
): string | null {
  const types = Array.isArray(preferredType)
    ? preferredType
    : preferredType
      ? [preferredType]
      : null
  const candidates = types ? columns.filter(c => types.includes(c.column_type)) : columns

  // Exact name match wins over substring match (near-duplicate columns exist).
  for (const pattern of patterns) {
    const p = pattern.toLowerCase()
    const exact = candidates.find(c => {
      const nameKa = (c.column_name_ka || '').toLowerCase().trim()
      const name = (c.column_name || '').toLowerCase().trim()
      return nameKa === p || name === p
    })
    if (exact) return exact.column_id
  }
  for (const pattern of patterns) {
    const p = pattern.toLowerCase()
    const partial = candidates.find(c => {
      const nameKa = (c.column_name_ka || '').toLowerCase()
      const name = (c.column_name || '').toLowerCase()
      return nameKa.includes(p) || name.includes(p)
    })
    if (partial) return partial.column_id
  }
  return null
}

function resolveStatusLabel(
  value: string | null | undefined,
  columns: ColumnRow[],
  columnId: string | null
): string | null {
  if (!value || !columnId) return value || null
  const col = columns.find(c => c.column_id === columnId)
  if (!col || !col.config?.options) return value
  const option = col.config.options.find((o: any) => o.key === value)
  return option?.label || value
}

export function classifyBoardName(boardName: string): ContractSource {
  const name = boardName.toLowerCase()
  if (name.includes('ერთჯერადი')) return 'one_time'
  if (name.includes('შეჩერებული')) return 'paused'
  if (name.includes('შეწყვეტილ') || name.includes('დასრულებულ')) return 'ended'
  return 'active'
}

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
}
