import type { BankTransaction } from '@/services/payments.service'

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
