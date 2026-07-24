import type { BankTransaction } from '@/services/payments.service'
import type {
  DebtorRow,
  DebtorsSummary,
  PayerCriteria,
  PlanVsActualMonth,
} from '@/services/financial-analytics.service'

export interface GroupedTransactions {
  key: string
  senderName: string
  senderInn: string | null
  transactions: BankTransaction[]
  totalPaid: number
  totalExpected: number | null
  boardId: string | null
}

export interface MonthStats {
  totalPaid: number
  totalExpected: number
  difference: number
  matched: number
  unmatched: number
  underpaid: number
  overpaid: number
  count: number
}

export interface TableTotals {
  totalPaid: number
  totalExpected: number | null
}

export interface DebtorsResponse {
  period: { from: string; to: string }
  criteria: PayerCriteria
  summary: DebtorsSummary
  by_month: PlanVsActualMonth[]
  debtors: DebtorRow[]
}

export interface PlanVsActualResponse {
  period: { from: string; to: string }
  totals: { expected: number; received: number; difference: number }
  by_month: PlanVsActualMonth[]
}
