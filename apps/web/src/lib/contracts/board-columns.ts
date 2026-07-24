/**
 * Shared column-discovery helpers for the "ხელშეკრულებები" (contracts)
 * workspace boards. Column ids differ per Supabase instance, so columns are
 * always discovered by Georgian/English name patterns — never hardcoded.
 *
 * Used by both src/services/financial-analytics.service.ts and
 * app/api/payments/contracts/route.ts. Only pure helpers live here; data
 * loading/normalization stays with each caller.
 */

export type ContractSource = 'active' | 'one_time' | 'paused' | 'ended'

export interface ColumnRow {
  column_id: string
  column_name: string
  column_name_ka: string | null
  column_type: string
  config?: any
}

// Column name patterns (Georgian) to discover column IDs dynamically
export const COLUMN_PATTERNS = {
  tax_id: ['ს/კ', 'საიდენტიფიკაციო', 'tax', 'inn'],
  monthly_amount: ['ყოველთვიური', 'თვიური', 'monthly'],
  frequency: ['სიხშირე', 'პერიოდულობა', 'frequency'],
  invoice_amount: ['ინვოისი', 'invoice'],
  status: ['სტატუსი', 'status'],
  start_date: ['გაფორმ', 'დაწყ', 'start'],
  end_date: ['დასრულ', 'ვადა', 'end'],
  payment_method: ['გადახდ', 'payment'],
  responsible: ['პასუხისმგებელი', 'გაყიდვების მენეჯერი', 'მენეჯერ', 'responsible', 'manager'],
}

// Column types vary across instances (e.g. 'number' vs 'numeric')
export const NUMERIC_TYPES = ['numeric', 'number']

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

export function resolveStatusLabel(
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

/**
 * Person-type columns store objects/arrays ({ name }, [{ name }, ...]) while
 * text columns store plain strings — coerce any shape to a display string.
 */
export function coerceDisplayValue(value: unknown): string | null {
  if (value == null || value === '') return null
  if (Array.isArray(value)) {
    const names = value.map(v => coerceDisplayValue(v)).filter(Boolean)
    return names.length ? names.join(', ') : null
  }
  if (typeof value === 'object') {
    const v = value as any
    // Fall back to .id — person columns may store only a user id, which the
    // consumer resolves to a name via public.users.
    return coerceDisplayValue(v.name ?? v.label ?? v.full_name ?? v.id ?? null)
  }
  const s = String(value).trim()
  return s || null
}
