import type { ContractInfo } from '@/services/payments.service'

export const MONTHS_KA = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
]

export function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
  return { from, to }
}

/** How many payments per year based on Georgian frequency label */
export function getPaymentsPerYear(frequency: string | null): number {
  if (!frequency) return 12
  if (frequency === 'ყოველთვე') return 12
  const match = frequency.match(/წელიწადში\s*(\d+)/)
  if (match) return parseInt(match[1])
  return 12
}

/** Expected total revenue from a contract within a date range.
 *  End dates are ignored — contracts auto-renew. If it's on the active board, it's active.
 *  When no period is given ("all" mode), uses contract start → today. */
export function getExpectedForPeriod(
  contract: ContractInfo,
  months: number,
  periodFrom?: string,
  periodTo?: string,
  now?: Date
): number | null {
  const amount = contract.monthly_amount || contract.invoice_amount
  if (!amount) return null
  const ppy = getPaymentsPerYear(contract.frequency)
  const today = now || new Date()

  const cStart = contract.start_date ? new Date(contract.start_date) : null
  // For paused/ended contracts, respect the end date as a hard cap
  const respectEndDate =
    contract.contract_source === 'paused' || contract.contract_source === 'ended'
  const cEnd = respectEndDate && contract.end_date ? new Date(contract.end_date) : null

  let activeMonths: number

  if (periodFrom && periodTo) {
    // Specific period (month or custom range)
    const pFrom = new Date(periodFrom)
    const pTo = new Date(periodTo)

    const effectiveFrom = cStart && cStart > pFrom ? cStart : pFrom
    let effectiveTo = pTo
    if (today < effectiveTo) effectiveTo = today
    // Cap at contract end date for paused/ended
    if (cEnd && cEnd < effectiveTo) effectiveTo = cEnd

    if (effectiveFrom > effectiveTo) return null

    activeMonths =
      (effectiveTo.getFullYear() - effectiveFrom.getFullYear()) * 12 +
      (effectiveTo.getMonth() - effectiveFrom.getMonth()) +
      1
    activeMonths = Math.max(1, Math.min(activeMonths, months))
  } else {
    // "All" mode — contract start (or first payment) to end (or today)
    const from =
      cStart || (contract.first_payment_date ? new Date(contract.first_payment_date) : null)
    if (!from) return null

    const to = cEnd && cEnd < today ? cEnd : today

    if (from > to) return null

    activeMonths =
      (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1
    activeMonths = Math.max(1, activeMonths)
  }

  return Math.round(((amount * ppy * activeMonths) / 12) * 100) / 100
}

/** Whether a contract has payment amounts (may be from any board type).
 *  For paused/ended, getExpectedForPeriod handles date capping. */
export function isActiveContract(contract: ContractInfo): boolean {
  if (!contract.monthly_amount && !contract.invoice_amount) return false
  return true
}

/** Sum expected amounts across multiple contracts for a tax ID, each with its own frequency */
export function sumExpectedForContracts(
  contractList: ContractInfo[],
  months: number,
  periodFrom?: string,
  periodTo?: string,
  matchSourceFilter?: string | null,
  now?: Date
): number | null {
  let total = 0
  let hasAny = false
  for (const contract of contractList) {
    if (!isActiveContract(contract)) continue
    if (!matchSourceFilter && contract.contract_source === 'one_time') continue
    if (matchSourceFilter && contract.contract_source !== matchSourceFilter) continue
    const expected = getExpectedForPeriod(contract, months, periodFrom, periodTo, now)
    if (expected) {
      total += expected
      hasAny = true
    }
  }
  return hasAny ? total : null
}

/** Months between two date strings */
export function monthsBetween(from: string, to: string): number {
  const d1 = new Date(from)
  const d2 = new Date(to)
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1
}

export function formatAmount(amount: number, currency?: string) {
  return new Intl.NumberFormat('ka-GE', {
    style: 'currency',
    currency: currency || 'GEL',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** Export transactions to CSV file */
export function exportTransactionsCSV(
  transactions: import('@/services/payments.service').BankTransaction[],
  contracts: Record<string, ContractInfo[]>,
  monthsInRange: number,
  effectiveDateRange: { from?: string; to?: string },
  matchSourceFilter: string,
  selectedYear: number,
  selectedMonth: number | null
) {
  const headers = [
    'შპს',
    'ს/კ',
    'გადახდის ID',
    'გადახდილი',
    'მოსალოდნელი',
    'სხვაობა',
    'თარიღი',
    'დანიშნულება',
    'სტატუსი',
    'მეთოდი',
  ]
  const rows = transactions.map(txn => {
    const contractList = txn.sender_inn ? contracts[txn.sender_inn] : null
    const expected = contractList
      ? sumExpectedForContracts(
          contractList,
          monthsInRange,
          effectiveDateRange.from,
          effectiveDateRange.to,
          matchSourceFilter
        )
      : null
    const diff = expected != null ? txn.amount - expected : null
    return [
      txn.sender_name || '',
      txn.sender_inn || '',
      txn.doc_key,
      txn.amount.toFixed(2),
      expected?.toFixed(2) || '',
      diff?.toFixed(2) || '',
      txn.entry_date,
      txn.purpose || '',
      txn.status,
      txn.match_method || '',
    ]
  })

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payments-${selectedYear}${selectedMonth !== null ? '-' + String(selectedMonth + 1).padStart(2, '0') : ''}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
