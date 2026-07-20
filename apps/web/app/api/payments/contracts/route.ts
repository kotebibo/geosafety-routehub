/**
 * @swagger
 * /api/payments/contracts:
 *   get:
 *     summary: Get contract terms grouped by tax ID
 *     description: Fetches contract data from contract-related boards (active, one-time, paused, ended) using dynamic column discovery by name. Returns contracts keyed by tax ID, enriched with the earliest bank transaction date per tax ID. Response is cached for 5 minutes.
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Contracts grouped by tax ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contracts:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         item_id:
 *                           type: string
 *                         board_id:
 *                           type: string
 *                         contract_source:
 *                           type: string
 *                           enum: [active, one_time, paused, ended]
 *                         company_name:
 *                           type: string
 *                         tax_id:
 *                           type: string
 *                         monthly_amount:
 *                           type: number
 *                           nullable: true
 *                         frequency:
 *                           type: string
 *                           nullable: true
 *                         invoice_amount:
 *                           type: number
 *                           nullable: true
 *                         status:
 *                           type: string
 *                           nullable: true
 *                         start_date:
 *                           type: string
 *                           nullable: true
 *                         end_date:
 *                           type: string
 *                           nullable: true
 *                         payment_method:
 *                           type: string
 *                           nullable: true
 *                         first_payment_date:
 *                           type: string
 *                           nullable: true
 *                 boards_found:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or dispatcher access required
 *       500:
 *         description: Internal server error
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
  board_id: string
  contract_source: 'active' | 'one_time' | 'paused' | 'ended'
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
  const candidates = types ? columns.filter(c => types.includes(c.column_type)) : columns

  // Some boards have near-duplicate columns (e.g. "ყოველთვიური" and
  // "ყოველთვიური (ანგარიშ-ფაქტურისთვის)") that both match the same loose
  // pattern. An exact name match must win over a substring match, otherwise
  // which column gets picked depends on column position and differs per
  // board — silently pulling amounts from the wrong column.
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

    // Resolve the "ხელშეკრულებები" workspace once — never hardcode a workspace
    // id, it differs per Supabase instance.
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .ilike('name', 'ხელშეკრულებები')
      .limit(1)
      .maybeSingle()

    if (workspaceError) throw workspaceError
    if (!workspace) {
      return NextResponse.json({ contracts: {}, boards_found: 0 })
    }

    // Find all boards in that workspace (active, one-time, paused, ended,
    // plus the unrelated "additional services" board we exclude below)
    const { data: boards, error: boardError } = await supabase
      .from('boards')
      .select('id, name')
      .eq('workspace_id', workspace.id)

    if (boardError) throw boardError
    if (!boards || boards.length === 0) {
      return NextResponse.json({ contracts: {}, boards_found: 0 })
    }

    const contractsByTaxId: Record<string, ContractInfo[]> = {}
    const boardsSummary: Array<{ id: string; name: string; count: number }> = []

    // Fetch columns and items for ALL boards in parallel
    const boardData = await Promise.all(
      boards
        .filter((board: { id: string; name: string }) => !board.name.includes('დამატებითი'))
        .map(async (board: { id: string; name: string }) => {
          const boardName = board.name.toLowerCase()
          const contractSource: ContractInfo['contract_source'] = boardName.includes('ერთჯერადი')
            ? 'one_time'
            : boardName.includes('შეჩერებული')
              ? 'paused'
              : boardName.includes('შეწყვეტილ') || boardName.includes('დასრულებულ')
                ? 'ended'
                : 'active'

          // Fetch columns and first page of items in parallel
          const [colResult, itemResult] = await Promise.all([
            supabase
              .from('board_columns')
              .select('column_id, column_name, column_name_ka, column_type, config')
              .eq('board_id', board.id)
              .order('position'),
            supabase
              .from('board_items')
              .select('id, name, data')
              .eq('board_id', board.id)
              .is('deleted_at', null)
              .range(0, 999),
          ])

          const columns = colResult.data || []
          let allItems = itemResult.data || []
          if (itemResult.error) throw itemResult.error

          // Paginate remaining items if needed
          if (allItems.length === 1000) {
            let from = 1000
            while (true) {
              const { data, error } = await supabase
                .from('board_items')
                .select('id, name, data')
                .eq('board_id', board.id)
                .is('deleted_at', null)
                .range(from, from + 999)
              if (error) throw error
              if (!data || data.length === 0) break
              allItems = allItems.concat(data)
              if (data.length < 1000) break
              from += 1000
            }
          }

          return { board, contractSource, columns, items: allItems }
        })
    )

    for (const { board, contractSource, columns, items } of boardData) {
      if (columns.length === 0) continue

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

      if (!taxIdCol) continue

      boardsSummary.push({ id: board.id, name: board.name, count: items.length })

      for (const item of items) {
        const d = item.data || {}
        const taxId = d[taxIdCol]
        if (!taxId) continue

        const monthlyAmount = monthlyCol ? Number(d[monthlyCol]) || null : null
        const invoiceAmount = invoiceCol ? Number(d[invoiceCol]) || null : null
        const contractStatus = resolveStatusLabel(d[statusCol!], columns, statusCol)
        const frequency = resolveStatusLabel(d[frequencyCol!], columns, frequencyCol)

        const contract: ContractInfo = {
          item_id: item.id,
          board_id: board.id,
          contract_source: contractSource,
          company_name: item.name,
          tax_id: taxId,
          monthly_amount: monthlyAmount,
          frequency,
          invoice_amount: invoiceAmount,
          status: contractStatus,
          start_date: startDateCol ? d[startDateCol] : null,
          end_date: endDateCol ? d[endDateCol] : null,
          payment_method: resolveStatusLabel(d[payMethodCol!], columns, payMethodCol),
          first_payment_date: null,
        }

        if (!contractsByTaxId[taxId]) {
          contractsByTaxId[taxId] = [contract]
        } else {
          contractsByTaxId[taxId].push(contract)
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
          for (const c of contractsByTaxId[inn]) {
            c.first_payment_date = date
          }
        }
      }
    }

    const response = NextResponse.json({
      contracts: contractsByTaxId,
      boards_found: boardsSummary,
    })
    // Cache for 5 minutes — contracts change infrequently
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    return response
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
