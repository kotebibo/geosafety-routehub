/**
 * Payment Contracts API
 * Fetches contract terms from the ხელშეკრულებები board to enrich payment data.
 * Discovers columns dynamically by name (not hardcoded IDs) to work across instances.
 * Protected: Admin or Dispatcher
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'

// Column name patterns (Georgian) to discover column IDs dynamically
const COLUMN_PATTERNS = {
  tax_id: ['ს/კ', 'საიდენტიფიკაციო', 'tax', 'inn'],
  monthly_amount: ['ყოველთვიური', 'თვიური', 'monthly'],
  frequency: ['სიხშირე', 'პერიოდულობა', 'frequency'],
  invoice_amount: ['ინვოისი', 'invoice'],
  status: ['სტატუსი', 'status'],
  start_date: ['გაფორმ', 'დაწყ', 'start'],
  end_date: ['დასრულ', 'ვადა', 'end'],
  payment_method: ['გადახდ', 'payment'],
}

// Column types vary across instances (e.g. 'number' vs 'numeric')
const NUMERIC_TYPES = ['numeric', 'number']

interface ContractInfo {
  item_id: string
  company_name: string
  tax_id: string
  monthly_amount: number | null
  frequency: string | null
  invoice_amount: number | null
  status: string | null
  start_date: string | null
  end_date: string | null
  payment_method: string | null
  first_payment_date: string | null
}

function findColumnId(
  columns: Array<{
    column_id: string
    column_name: string
    column_name_ka: string | null
    column_type: string
  }>,
  patterns: string[],
  preferredType?: string | string[]
): string | null {
  const types = Array.isArray(preferredType)
    ? preferredType
    : preferredType
      ? [preferredType]
      : null
  for (const pattern of patterns) {
    const match = columns.find(c => {
      const nameKa = (c.column_name_ka || '').toLowerCase()
      const name = (c.column_name || '').toLowerCase()
      const p = pattern.toLowerCase()
      const nameMatch = nameKa.includes(p) || name.includes(p)
      if (types) {
        return nameMatch && types.includes(c.column_type)
      }
      return nameMatch
    })
    if (match) return match.column_id
  }
  return null
}

function resolveStatusLabel(
  value: string | null | undefined,
  columns: Array<{ column_id: string; column_type: string; config: any }>,
  columnId: string | null
): string | null {
  if (!value || !columnId) return value || null
  const col = columns.find(c => c.column_id === columnId)
  if (!col || !col.config?.options) return value
  const option = col.config.options.find((o: any) => o.key === value)
  return option?.label || value
}

export async function GET() {
  try {
    await requireAdminOrDispatcher()
    const supabase = createServerClient() as any

    // Find ხელშეკრულებები boards (there may be multiple — active contracts, one-time, etc.)
    const { data: boards, error: boardError } = await supabase
      .from('boards')
      .select('id, name')
      .ilike('name', '%ხელშეკრულებ%')

    if (boardError) throw boardError
    if (!boards || boards.length === 0) {
      return NextResponse.json({ contracts: {}, boards_found: 0 })
    }

    const contractsByTaxId: Record<string, ContractInfo> = {}
    const boardsSummary: Array<{ id: string; name: string; count: number }> = []

    for (const board of boards) {
      // Get columns for this board
      const { data: columns } = await supabase
        .from('board_columns')
        .select('column_id, column_name, column_name_ka, column_type, config')
        .eq('board_id', board.id)
        .order('position')

      if (!columns || columns.length === 0) continue

      // Discover column IDs by name
      const taxIdCol = findColumnId(columns, COLUMN_PATTERNS.tax_id, 'text')
      const monthlyCol = findColumnId(columns, COLUMN_PATTERNS.monthly_amount, NUMERIC_TYPES)
      const frequencyCol =
        findColumnId(columns, COLUMN_PATTERNS.frequency, 'status') ||
        findColumnId(columns, COLUMN_PATTERNS.frequency)
      const invoiceCol = findColumnId(columns, COLUMN_PATTERNS.invoice_amount, NUMERIC_TYPES)
      const statusCol = findColumnId(columns, COLUMN_PATTERNS.status, 'status')
      const startDateCol = findColumnId(columns, COLUMN_PATTERNS.start_date, 'date')
      const endDateCol = findColumnId(columns, COLUMN_PATTERNS.end_date, 'date')
      const payMethodCol = findColumnId(columns, COLUMN_PATTERNS.payment_method, 'status')

      // If no tax ID column found, skip this board
      if (!taxIdCol) continue

      // Fetch all items from this board
      let allItems: any[] = []
      let from = 0
      const PAGE = 1000
      while (true) {
        const { data, error } = await supabase
          .from('board_items')
          .select('id, name, data')
          .eq('board_id', board.id)
          .is('deleted_at', null)
          .range(from, from + PAGE - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allItems = allItems.concat(data)
        if (data.length < PAGE) break
        from += PAGE
      }

      boardsSummary.push({ id: board.id, name: board.name, count: allItems.length })

      for (const item of allItems) {
        const d = item.data || {}
        const taxId = d[taxIdCol]
        if (!taxId) continue

        // If we have no monthly amount column, try to find any numeric column
        const monthlyAmount = monthlyCol ? Number(d[monthlyCol]) || null : null
        const invoiceAmount = invoiceCol ? Number(d[invoiceCol]) || null : null

        const contract: ContractInfo = {
          item_id: item.id,
          company_name: item.name,
          tax_id: taxId,
          monthly_amount: monthlyAmount,
          frequency: resolveStatusLabel(d[frequencyCol!], columns, frequencyCol),
          invoice_amount: invoiceAmount,
          status: resolveStatusLabel(d[statusCol!], columns, statusCol),
          start_date: startDateCol ? d[startDateCol] : null,
          end_date: endDateCol ? d[endDateCol] : null,
          payment_method: resolveStatusLabel(d[payMethodCol!], columns, payMethodCol),
          first_payment_date: null, // populated below from bank_transactions
        }

        // Use tax ID as key — first match wins (active contract boards processed first)
        if (!contractsByTaxId[taxId]) {
          contractsByTaxId[taxId] = contract
        }
      }
    }

    // Find earliest transaction per tax ID to identify first payments
    const taxIds = Object.keys(contractsByTaxId)
    if (taxIds.length > 0) {
      const { data: txns } = await supabase
        .from('bank_transactions')
        .select('sender_inn, entry_date')
        .in('sender_inn', taxIds)
        .order('entry_date', { ascending: true })

      // Group by sender_inn, take earliest
      const earliest: Record<string, string> = {}
      for (const txn of txns || []) {
        if (txn.sender_inn && !earliest[txn.sender_inn]) {
          earliest[txn.sender_inn] = txn.entry_date
        }
      }

      for (const [inn, date] of Object.entries(earliest)) {
        if (contractsByTaxId[inn]) {
          contractsByTaxId[inn].first_payment_date = date
        }
      }
    }

    return NextResponse.json({
      contracts: contractsByTaxId,
      boards_found: boardsSummary,
    })
  } catch (error: any) {
    console.error('Error fetching payment contracts:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
